// Motor de Sincronização Offline -> Supabase Cloud
import { OfflineStore } from './offlineStore';
import { DataService } from '../supabase/dataService';
import { ReportService } from '../supabase/reportService';
import { OperationsService } from '../supabase/operationsService';
import { isSupabaseConfigured } from '../supabase/supabaseConfig';

let inFlightPromise = null;

async function runQueueItems(keys = [], entity, fn) {
  let count = 0;
  const errors = [];
  for (const key of keys) {
    try {
      if (await fn(key)) {
        OfflineStore.clearSyncError(entity, key);
        count += 1;
      }
    } catch (err) {
      const msg = err?.message || String(err);
      OfflineStore.recordSyncError(entity, key, msg);
      errors.push({ entity, entityKey: key, message: msg });
      console.warn(`Falha ao sincronizar ${entity} (${key}):`, msg);
    }
  }
  return { count, errors };
}

export const SyncEngine = {
  async flushQueue() {
    if (inFlightPromise) return inFlightPromise;
    if (!isSupabaseConfigured() || navigator.onLine === false) {
      return {
        synced: 0,
        errors: OfflineStore.getSyncErrors(),
        pendingCount: OfflineStore.getPendingCount(),
        orders: DataService.getOrders(),
        reports: ReportService.getReports(),
        clients: DataService.getClients(),
        units: DataService.getUnits(),
        templates: OperationsService.getTemplates(),
        schedules: OperationsService.getSchedules(),
        sstItems: OperationsService.getSstItems(),
        profile: DataService.getUserProfile()
      };
    }

    inFlightPromise = (async () => {
      let synced = 0;
      const errors = [];
      const pending = OfflineStore.getPendingIndex();

      // 1. Perfil RT
      if (pending.updateProfile) {
        try {
          if (await DataService.flushPendingProfile()) {
            OfflineStore.clearSyncError('profile', 'current');
            synced += 1;
          }
        } catch (err) {
          const msg = err?.message || String(err);
          OfflineStore.recordSyncError('profile', 'current', msg);
          errors.push({ entity: 'profile', entityKey: 'current', message: msg });
        }
      }

      // 2. Exclusões pendentes (relatórios -> vistorias -> agenda/sst/templates -> unidades -> clientes)
      const deleteSteps = [
        [pending.deleteReports, 'report', (k) => ReportService.flushPendingReportDelete(k)],
        [pending.deleteOrders, 'order', (k) => DataService.flushPendingOrderDelete(k)],
        [pending.deleteSchedules, 'schedule', (k) => OperationsService.flushPendingScheduleDelete(k)],
        [pending.deleteSstItems, 'sst', (k) => OperationsService.flushPendingSstItemDelete(k)],
        [pending.deleteTemplates, 'template', (k) => OperationsService.flushPendingTemplateDelete(k)],
        [pending.deleteUnits, 'unit', (k) => DataService.flushPendingUnitDelete(k)],
        [pending.deleteClients, 'client', (k) => DataService.flushPendingClientDelete(k)]
      ];

      for (const [keys, entity, fn] of deleteSteps) {
        const res = await runQueueItems(keys, entity, fn);
        synced += res.count;
        errors.push(...res.errors);
      }

      // 3. Upserts ordenados por dependência (clientes -> unidades -> templates/agenda/sst -> vistorias -> relatórios)
      const upsertSteps = [
        [pending.upsertClients, 'client', (k) => DataService.flushPendingClient(k)],
        [pending.upsertUnits, 'unit', (k) => DataService.flushPendingUnit(k)],
        [pending.upsertTemplates, 'template', (k) => OperationsService.flushPendingTemplate(k)],
        [pending.upsertSchedules, 'schedule', (k) => OperationsService.flushPendingSchedule(k)],
        [pending.upsertSstItems, 'sst', (k) => OperationsService.flushPendingSstItem(k)],
        [pending.upsertOrders, 'order', (k) => DataService.flushPendingOrder(k)],
        [pending.upsertReports, 'report', (k) => ReportService.flushPendingReport(k)]
      ];

      for (const [keys, entity, fn] of upsertSteps) {
        const res = await runQueueItems(keys, entity, fn);
        synced += res.count;
        errors.push(...res.errors);
      }

      return {
        synced,
        errors,
        pendingCount: OfflineStore.getPendingCount(),
        orders: DataService.getOrders(),
        reports: ReportService.getReports(),
        clients: DataService.getClients(),
        units: DataService.getUnits(),
        templates: OperationsService.getTemplates(),
        schedules: OperationsService.getSchedules(),
        sstItems: OperationsService.getSstItems(),
        profile: DataService.getUserProfile()
      };
    })().finally(() => {
      inFlightPromise = null;
    });

    return inFlightPromise;
  }
};
