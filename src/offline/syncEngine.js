// Motor de Sincronização Offline -> Supabase Cloud
import { OfflineStore } from './offlineStore';
import { DataService } from '../supabase/dataService';
import { ReportService } from '../supabase/reportService';
import { isSupabaseConfigured } from '../supabase/supabaseConfig';

let inFlightPromise = null;

export const SyncEngine = {
  async flushQueue() {
    if (inFlightPromise) return inFlightPromise;
    if (!isSupabaseConfigured() || navigator.onLine === false) {
      return {
        synced: 0,
        pendingCount: OfflineStore.getPendingCount(),
        orders: DataService.getOrders(),
        reports: ReportService.getReports(),
        profile: DataService.getUserProfile()
      };
    }

    inFlightPromise = (async () => {
      let synced = 0;
      const pending = OfflineStore.getPendingIndex();

      // 1. Perfil RT
      if (pending.updateProfile) {
        try {
          if (await DataService.flushPendingProfile()) synced += 1;
        } catch (err) {
          console.warn('Falha ao sincronizar perfil pendente:', err?.message || err);
        }
      }

      // 2. Exclusões pendentes
      for (const orderId of pending.deleteOrders) {
        try {
          if (await DataService.flushPendingOrderDelete(orderId)) synced += 1;
        } catch (err) {
          console.warn(`Falha ao sincronizar exclusão da vistoria ${orderId}:`, err?.message || err);
        }
      }

      for (const code of pending.deleteReports) {
        try {
          if (await ReportService.flushPendingReportDelete(code)) synced += 1;
        } catch (err) {
          console.warn(`Falha ao sincronizar exclusão do relatório ${code}:`, err?.message || err);
        }
      }

      // 3. Upserts de Vistorias/Checklists (antes dos relatórios para garantir inspecao_id)
      for (const orderId of pending.upsertOrders) {
        try {
          if (await DataService.flushPendingOrder(orderId)) synced += 1;
        } catch (err) {
          console.warn(`Falha ao sincronizar vistoria ${orderId}:`, err?.message || err);
        }
      }

      // 4. Upserts de Relatórios Técnicos
      for (const code of pending.upsertReports) {
        try {
          if (await ReportService.flushPendingReport(code)) synced += 1;
        } catch (err) {
          console.warn(`Falha ao sincronizar relatório ${code}:`, err?.message || err);
        }
      }

      return {
        synced,
        pendingCount: OfflineStore.getPendingCount(),
        orders: DataService.getOrders(),
        reports: ReportService.getReports(),
        profile: DataService.getUserProfile()
      };
    })().finally(() => {
      inFlightPromise = null;
    });

    return inFlightPromise;
  }
};
