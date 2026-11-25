import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { getSupabaseClient, isSupabaseConfigured } from './supabase/supabaseConfig';
import { DataService } from './supabase/dataService';
import { ReportService } from './supabase/reportService';
import { OfflineStore } from './offline/offlineStore';
import { SyncEngine } from './offline/syncEngine';
import { useFeedback } from './components/common/FeedbackProvider';
import { AppLoadingSkeleton, ModuleLoadingSkeleton } from './components/common/SkeletonLoader';
import PwaInstallBanner from './components/common/PwaInstallBanner';
import { OperationsService, getExpiryStatus } from './supabase/operationsService';
import { buildSstChecklist } from './data/sstChecklistData';
import { getDisciplineMeta } from './data/workflowsConfig';
import { applyAccentCssVariables } from './utils/themePalette';
import { AuditService } from './supabase/auditService';
import { hashPinSha256 } from './utils/securityHelpers';
import { Lock } from 'lucide-react';

const DashboardOverview = lazy(() => import('./components/dashboard/DashboardOverview'));
const WorkOrderList = lazy(() => import('./components/workOrders/WorkOrderList'));
const WorkOrderDetailModal = lazy(() => import('./components/workOrders/WorkOrderDetailModal'));
const NewWorkOrderModal = lazy(() => import('./components/workOrders/NewWorkOrderModal'));
const UserProfileModal = lazy(() => import('./components/profile/UserProfileModal'));
const LoginScreen = lazy(() => import('./components/auth/LoginScreen'));
const ReportsModule = lazy(() => import('./components/reports/ReportsModule'));
const UnitsModule = lazy(() => import('./components/units/UnitsModule'));
const CommandPaletteModal = lazy(() => import('./components/common/CommandPaletteModal'));
const NotFoundPage = lazy(() => import('./components/common/NotFoundPage'));
const LegalInfoModal = lazy(() => import('./components/common/LegalInfoModal'));
const LandingPage = lazy(() => import('./components/public/LandingPage'));
const PublicReportPortal = lazy(() => import('./components/public/PublicReportPortal'));
const ActionPlansModule = lazy(() => import('./components/actions/ActionPlansModule'));
const AgendaModule = lazy(() => import('./components/agenda/AgendaModule'));
const ChecklistTemplatesModal = lazy(() => import('./components/templates/ChecklistTemplatesModal'));

const TAB_TITLES = {
  dashboard: 'Kivo — Meu Painel',
  orders: 'Kivo — Vistorias & Checklists',
  actions: 'Kivo — Planos de Ação (5W2H)',
  agenda: 'Kivo — Agenda & Recorrência',
  reports: 'Kivo — Relatórios Técnicos',
  units: 'Kivo — Clientes, Unidades & SST'
};

const TAB_PATHS = {
  dashboard: '/#/painel',
  orders: '/#/vistorias',
  actions: '/#/acoes',
  agenda: '/#/agenda',
  reports: '/#/relatorios',
  units: '/#/unidades'
};

function resolveInitialRoute() {
  if (typeof window === 'undefined') {
    return {
      initialTab: 'dashboard',
      initialLegalTab: null,
      initialNotFound: false,
      initialAuthMode: null,
      publicReportToken: null
    };
  }
  const rawPathname = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  const rawHash = window.location.hash || '';
  const searchParams = new URLSearchParams(window.location.search || '');
  const laudoQueryToken = searchParams.get('laudo');
  const hasAuthCallback =
    rawHash.includes('access_token=') ||
    rawHash.includes('type=recovery') ||
    window.location.search.includes('code=') ||
    window.location.search.includes('error=');

  const hashPath = rawHash.startsWith('#/')
    ? (rawHash.slice(1).split('?')[0].replace(/\/+$/, '') || '/')
    : null;
  const path = hashPath || rawPathname;

  if (laudoQueryToken) {
    return {
      initialTab: 'dashboard',
      initialLegalTab: null,
      initialNotFound: false,
      initialAuthMode: null,
      publicReportToken: laudoQueryToken.trim() || null
    };
  }

  if (path.startsWith('/laudo/')) {
    const token = path.slice('/laudo/'.length).split('/')[0] || '';
    return {
      initialTab: 'dashboard',
      initialLegalTab: null,
      initialNotFound: !token,
      initialAuthMode: null,
      publicReportToken: token || null
    };
  }

  if (hasAuthCallback) {
    return {
      initialTab: 'dashboard',
      initialLegalTab: null,
      initialNotFound: false,
      initialAuthMode: 'login',
      publicReportToken: null
    };
  }

  if (path === '/' || path === '/index.html') {
    return {
      initialTab: 'dashboard',
      initialLegalTab: null,
      initialNotFound: false,
      initialAuthMode: null,
      publicReportToken: null
    };
  }

  if (path === '/login' || path === '/entrar') {
    const modeParam = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
    return {
      initialTab: 'dashboard',
      initialLegalTab: null,
      initialNotFound: false,
      initialAuthMode: modeParam,
      publicReportToken: null
    };
  }

  if (path === '/cadastro') {
    return {
      initialTab: 'dashboard',
      initialLegalTab: null,
      initialNotFound: false,
      initialAuthMode: 'signup',
      publicReportToken: null
    };
  }

  if (path === '/painel' || path === '/dashboard') {
    return { initialTab: 'dashboard', initialLegalTab: null, initialNotFound: false, initialAuthMode: 'login', publicReportToken: null };
  }
  if (path === '/vistorias') {
    return { initialTab: 'orders', initialLegalTab: null, initialNotFound: false, initialAuthMode: 'login', publicReportToken: null };
  }
  if (path === '/acoes') {
    return { initialTab: 'actions', initialLegalTab: null, initialNotFound: false, initialAuthMode: 'login', publicReportToken: null };
  }
  if (path === '/agenda') {
    return { initialTab: 'agenda', initialLegalTab: null, initialNotFound: false, initialAuthMode: 'login', publicReportToken: null };
  }
  if (path === '/relatorios') {
    return { initialTab: 'reports', initialLegalTab: null, initialNotFound: false, initialAuthMode: 'login', publicReportToken: null };
  }
  if (path === '/unidades') {
    return { initialTab: 'units', initialLegalTab: null, initialNotFound: false, initialAuthMode: 'login', publicReportToken: null };
  }
  if (path === '/privacidade') {
    return { initialTab: 'dashboard', initialLegalTab: 'privacidade', initialNotFound: false, initialAuthMode: null, publicReportToken: null };
  }
  if (path === '/termos') {
    return { initialTab: 'dashboard', initialLegalTab: 'termos', initialNotFound: false, initialAuthMode: null, publicReportToken: null };
  }
  if (path === '/suporte') {
    return { initialTab: 'dashboard', initialLegalTab: 'suporte', initialNotFound: false, initialAuthMode: null, publicReportToken: null };
  }

  return {
    initialTab: 'dashboard',
    initialLegalTab: null,
    initialNotFound: true,
    initialAuthMode: null,
    publicReportToken: null
  };
}

export default function App() {
  const initialRoute = useMemo(() => resolveInitialRoute(), []);
  const { toast } = useFeedback();
  const supabaseEnabled = isSupabaseConfigured();
  const [authChecked, setAuthChecked] = useState(!supabaseEnabled);
  const [session, setSession] = useState(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const [hasScreenLockPin, setHasScreenLockPin] = useState(() => {
    try {
      return Boolean(localStorage.getItem('kivo_screen_pin_hash'));
    } catch {
      return false;
    }
  });
  const [screenLockMinutes, setScreenLockMinutes] = useState(() => {
    try {
      return Number(localStorage.getItem('kivo_screen_lock_minutes') || '15');
    } catch {
      return 15;
    }
  });
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockPinError, setUnlockPinError] = useState('');

  const refreshScreenLockConfig = () => {
    try {
      setHasScreenLockPin(Boolean(localStorage.getItem('kivo_screen_pin_hash')));
      setScreenLockMinutes(Number(localStorage.getItem('kivo_screen_lock_minutes') || '15'));
    } catch {
      // ignora
    }
  };

  const [activeTab, setActiveTab] = useState(initialRoute.initialTab);
  const [isNotFound, setIsNotFound] = useState(initialRoute.initialNotFound);
  const [legalModalTab, setLegalModalTab] = useState(initialRoute.initialLegalTab);
  const [publicAuthMode, setPublicAuthMode] = useState(initialRoute.initialAuthMode);
  const [publicReportToken, setPublicReportToken] = useState(initialRoute.publicReportToken);
  const [userProfile, setUserProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);
  const [units, setUnits] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [sstItems, setSstItems] = useState([]);

  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pendingReportToOpen, setPendingReportToOpen] = useState(null);
  const [preselectedUnitForNewOrder, setPreselectedUnitForNewOrder] = useState(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('kivo_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('kivo_theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    try {
      localStorage.setItem('kivo_theme', theme);
    } catch {
      // ignora
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('kivo_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
    } catch {
      // ignora
    }
  }, [sidebarCollapsed]);

  const activeAccentColor = useMemo(() => {
    if (userProfile?.accentColor) return userProfile.accentColor;
    try {
      return localStorage.getItem('kivo_accent') || 'emerald';
    } catch {
      return 'emerald';
    }
  }, [userProfile?.accentColor]);

  useEffect(() => {
    applyAccentCssVariables(activeAccentColor, theme);
    try {
      localStorage.setItem('kivo_accent', activeAccentColor);
    } catch {
      // ignora
    }
  }, [activeAccentColor, theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [pendingSyncCount, setPendingSyncCount] = useState(() => OfflineStore.getPendingCount());
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncNow = async () => {
    if (!supabaseEnabled || navigator.onLine === false) return;
    setIsSyncing(true);
    try {
      const result = await SyncEngine.flushQueue();
      setOrders(result.orders);
      setReports(result.reports);
      if (result.clients) setClients(result.clients);
      if (result.units) setUnits(result.units);
      if (result.templates) setTemplates(result.templates);
      if (result.schedules) setSchedules(result.schedules);
      if (result.sstItems) setSstItems(result.sstItems);
      setUserProfile(result.profile);
      setPendingSyncCount(result.pendingCount);
      if (result.errors?.length > 0) {
        const firstErr = result.errors[0];
        toast.warning({
          title: `Pendência ao sincronizar (${result.errors.length})`,
          message: `${firstErr.entity}: ${firstErr.message}`,
          duration: 7000
        });
      } else if (result.synced > 0) {
        toast.success({
          title: 'Sincronização concluída',
          message: `${result.synced} alteração(ões) enviada(s) para o Supabase.`
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      DataService.hydrateFromIndexedDb(),
      ReportService.hydrateFromIndexedDb()
    ]);

    setUserProfile(DataService.getUserProfile());
    setOrders(DataService.getOrders());
    setReports(ReportService.getReports());
    setClients(DataService.getClients());
    setUnits(DataService.getUnits());
    setTemplates(OperationsService.getTemplates());
    setSchedules(OperationsService.getSchedules());
    setSstItems(OperationsService.getSstItems());

    if (supabaseEnabled && navigator.onLine !== false) {
      if (OfflineStore.getPendingCount() > 0) {
        await handleSyncNow();
      }

      if (session?.user) {
        try {
          const freshProfile = await DataService.syncSessionUser(session.user);
          if (freshProfile) setUserProfile(freshProfile);
        } catch (err) {
          console.warn('Falha ao atualizar perfil/papel no Supabase:', err.message);
        }
      }

      try {
        const remote = await DataService.loadFromSupabase();
        if (remote?.orders) setOrders(remote.orders);
        if (remote?.clients) setClients(remote.clients);
        if (remote?.units) setUnits(remote.units);
      } catch (err) {
        console.warn('Falha ao carregar inspeções do Supabase:', err.message);
      }

      try {
        const remoteReports = await ReportService.loadFromSupabase();
        if (remoteReports) setReports(remoteReports);
      } catch (err) {
        console.warn('Falha ao carregar relatórios do Supabase:', err.message);
      }

      try {
        const [remTpl, remSch, remSst] = await Promise.all([
          OperationsService.loadTemplatesFromSupabase(),
          OperationsService.loadSchedulesFromSupabase(),
          OperationsService.loadSstItemsFromSupabase()
        ]);
        setTemplates(remTpl);
        setSchedules(remSch);
        setSstItems(remSst);
      } catch {
        // segue cache local caso migration 009 não tenha rodado
      }
    }
  };

  useEffect(() => {
    let shown = false;
    const promptUpdate = (registration) => {
      if (shown || !registration?.waiting) return;
      shown = true;
      toast.info({
        title: 'Nova versão do Kivo disponível',
        message: 'Atualize a página para carregar as melhorias mais recentes.',
        duration: 0,
        action: {
          label: 'Atualizar agora',
          onClick: () => {
            const safeReload = () => {
              const p = window.location.pathname || '/';
              if (p !== '/' && p !== '/index.html' && !window.location.hash.startsWith('#/')) {
                window.location.replace(`/#${p}${window.location.search}`);
              } else {
                window.location.reload();
              }
            };
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              setTimeout(safeReload, 1500);
            } else {
              safeReload();
            }
          }
        }
      });
    };

    const onSwUpdate = (ev) => promptUpdate(ev?.detail?.registration);
    window.addEventListener('kivo:sw-update', onSwUpdate);
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) promptUpdate(reg);
      }).catch(() => {});
    }
    return () => window.removeEventListener('kivo:sw-update', onSwUpdate);
  }, [toast]);

  useEffect(() => {
    const unsubscribePending = OfflineStore.subscribe((count) => {
      setPendingSyncCount(count);
    });

    const onOnline = () => {
      setIsOnline(true);
      handleSyncNow();
    };
    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      unsubscribePending();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [supabaseEnabled]);

  useEffect(() => {
    if (!hasScreenLockPin || !screenLockMinutes || screenLockMinutes <= 0 || isScreenLocked) {
      return undefined;
    }
    if (supabaseEnabled && (!session || mfaRequired)) {
      return undefined;
    }
    let timerId = null;
    const resetTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        setUnlockPinInput('');
        setUnlockPinError('');
        setIsScreenLocked(true);
      }, screenLockMinutes * 60 * 1000);
    };
    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      if (timerId) clearTimeout(timerId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [hasScreenLockPin, screenLockMinutes, isScreenLocked, supabaseEnabled, session, mfaRequired]);

  const handleUnlockScreen = async (e) => {
    e.preventDefault();
    setUnlockPinError('');
    try {
      const savedHash = localStorage.getItem('kivo_screen_pin_hash');
      if (!savedHash) {
        setIsScreenLocked(false);
        return;
      }
      const enteredHash = await hashPinSha256(unlockPinInput);
      if (enteredHash === savedHash) {
        setIsScreenLocked(false);
        setUnlockPinInput('');
      } else {
        setUnlockPinError('PIN incorreto.');
      }
    } catch {
      setUnlockPinError('Falha ao validar PIN.');
    }
  };

  useEffect(() => {
    if (!supabaseEnabled) {
      loadAllData();
      return;
    }

    const { client } = getSupabaseClient();
    if (!client) {
      setAuthChecked(true);
      return;
    }

    const checkMfaStatus = async (activeSess) => {
      if (!activeSess || !client?.auth?.mfa) return false;
      try {
        const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
        return Boolean(aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2');
      } catch {
        return false;
      }
    };

    client.auth.getSession().then(async ({ data }) => {
      const activeSession = data?.session || null;
      if (activeSession?.user) {
        const synced = await DataService.syncSessionUser(activeSession.user);
        if (synced) setUserProfile(synced);
      }
      const needsMfa = await checkMfaStatus(activeSession);
      setMfaRequired(needsMfa);
      setSession(activeSession);
      setAuthChecked(true);
    });

    const { data: authListener } = client.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      }
      if (nextSession?.user) {
        const synced = await DataService.syncSessionUser(nextSession.user);
        if (synced) setUserProfile(synced);
      }
      const needsMfa = await checkMfaStatus(nextSession);
      setMfaRequired(needsMfa);
      setSession(nextSession);
      setAuthChecked(true);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabaseEnabled]);

  useEffect(() => {
    if (!supabaseEnabled || (session && !mfaRequired)) {
      loadAllData();
    }
  }, [supabaseEnabled, session, mfaRequired]);

  const handleSignOut = async () => {
    const { client } = getSupabaseClient();
    await client?.auth.signOut();
    await DataService.syncSessionUser(null);
    ReportService.clearLocalCache();
    OperationsService.clearLocalCaches();
    setSession(null);
    setMfaRequired(false);
    setIsScreenLocked(false);
    setOrders([]);
    setReports([]);
    setClients([]);
    setUnits([]);
    setTemplates([]);
    setSchedules([]);
    setSstItems([]);
    setUserProfile(null);
    setSelectedOrder(null);
    setPublicAuthMode(null);
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
  };

  const handleSaveTemplate = async (tpl) => {
    const next = await OperationsService.saveTemplate(tpl);
    setTemplates(next);
    return next;
  };

  const handleDeleteTemplate = async (id) => {
    const next = await OperationsService.deleteTemplate(id);
    setTemplates(next);
  };

  const handleSaveSchedule = async (sch) => {
    const next = await OperationsService.saveSchedule(sch);
    setSchedules(next);
    return next;
  };

  const handleDeleteSchedule = async (id) => {
    const next = await OperationsService.deleteSchedule(id);
    setSchedules(next);
  };

  const handleSaveSstItem = async (item) => {
    const next = await OperationsService.saveSstItem(item);
    setSstItems(next);
    return next;
  };

  const handleDeleteSstItem = async (id) => {
    const next = await OperationsService.deleteSstItem(id);
    setSstItems(next);
  };

  const handleStartOrderFromSchedule = async (schedule) => {
    if (!schedule) return;
    const discipline = schedule.disciplina === 'seguranca_trabalho' ? 'seguranca_trabalho' : 'meio_ambiente';
    const discMeta = getDisciplineMeta(discipline);
    const matchedTemplate = schedule.templateId
      ? templates.find((t) => t.id === schedule.templateId)
      : null;

    let items = [];
    if (matchedTemplate) {
      items = (matchedTemplate.itens || []).map((it, idx) => ({
        id: it.id || `tpl-${matchedTemplate.id}-${idx + 1}`,
        number: idx + 1,
        topic: it.topic || 'Geral',
        nrCode: it.nrCode || '',
        question: it.question,
        status: null,
        classification: '',
        riskProbability: 3,
        riskSeverity: 3,
        responsible: '',
        deadline: '',
        observation: '',
        evidenceUrl: '',
        afterPhotoUrl: '',
        resolutionNote: '',
        actionStatus: 'Em Aberto'
      }));
    } else if (discipline === 'seguranca_trabalho') {
      items = buildSstChecklist(schedule.nrModules || ['nr01', 'nr06', 'nr23']);
    } else {
      items = DataService.getBaseChecklistItems().map((i) => ({
        ...i,
        status: null,
        afterPhotoUrl: '',
        resolutionNote: '',
        actionStatus: 'Em Aberto'
      }));
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const updatedOrders = DataService.createOrder(
      {
        discipline,
        templateId: matchedTemplate?.id || '',
        nrModules: schedule.nrModules || null,
        scheduleId: schedule.id,
        clientName: schedule.clienteNome || 'Cliente',
        unidadeId: schedule.unidadeId || null,
        title: `Vistoria (${discMeta.label}) — ${schedule.unidadeNome}`,
        hospitalName: schedule.unidadeNome,
        regional: schedule.regional || 'Regional',
        municipio: schedule.municipio || 'Município',
        inspectionType: 'Programada',
        scheduledDate: todayStr,
        technicianName: userProfile?.name || 'Auditor Técnico',
        checklist: items
      },
      (_syncedId, patchedOrders) => {
        setOrders(patchedOrders);
      }
    );

    setOrders(updatedOrders);
    const created = updatedOrders[0];
    if (created) {
      setSelectedOrder(created);
    }

    try {
      const nextSchedules = await OperationsService.advanceScheduleAfterExecution(schedule, todayStr);
      setSchedules(nextSchedules);
    } catch {
      // segue mesmo offline
    }

    toast.success({
      title: 'Vistoria agendada iniciada',
      message: `${discMeta.label} • ${schedule.unidadeNome}`
    });
  };

  const handleSaveProfile = async (newProfile) => {
    const saved = await DataService.saveUserProfile(newProfile);
    setUserProfile(saved);
  };

  const handleSaveUnit = async (unitData) => {
    const nextUnits = await DataService.saveUnit(unitData);
    setUnits(nextUnits);
    setClients(DataService.getClients());
    return nextUnits;
  };

  const handleDeleteUnit = async (unit) => {
    const nextUnits = await DataService.deleteUnit(unit);
    setUnits(nextUnits);
  };

  const handleSaveClient = async (clientData) => {
    const nextClients = await DataService.saveClient(clientData);
    setClients(nextClients);
    return nextClients;
  };

  const handleDeleteClient = async (clientRow) => {
    const nextClients = await DataService.deleteClient(clientRow);
    setClients(nextClients);
  };

  const handleImportUnitsFromOrders = async () => {
    const nextUnits = await DataService.importUnitsFromOrders(orders);
    setUnits(nextUnits);
    setClients(DataService.getClients());
  };

  const clientNames = useMemo(() => {
    const names = new Set();
    clients.forEach((c) => c?.nome && names.add(c.nome));
    units.forEach((u) => u?.clienteNome && names.add(u.clienteNome));
    orders.forEach((o) => o?.clientName && names.add(o.clientName));
    reports.forEach((r) => r?.clienteNome && names.add(r.clienteNome));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [clients, units, orders, reports]);

  const headerAlerts = useMemo(() => {
    const list = [];
    schedules.forEach((sch) => {
      if (sch.ativo === false) return;
      const st = getExpiryStatus(sch.proximaData);
      if (st.status === 'vencido' || st.status === 'vence_hoje' || (st.daysRemaining !== null && st.daysRemaining <= 7)) {
        list.push({
          id: `agenda-${sch.id}`,
          category: 'agenda',
          severity: st.status === 'vencido' || st.status === 'vence_hoje' ? 'danger' : 'warning',
          title: `Agenda: ${sch.unidadeNome}`,
          subtitle: `${sch.clienteNome || 'Unidade'} • ${sch.periodicidade}`,
          badge: st.label,
          targetTab: 'agenda'
        });
      }
    });

    sstItems.forEach((item) => {
      if (!item.dataValidade) return;
      const st = getExpiryStatus(item.dataValidade);
      if (
        st.status === 'vencido' ||
        st.status === 'vence_hoje' ||
        st.status === 'alerta_30' ||
        st.status === 'alerta_60'
      ) {
        list.push({
          id: `sst-${item.id}`,
          category: 'sst',
          severity: st.status === 'vencido' || st.status === 'vence_hoje' ? 'danger' : 'warning',
          title: `SST: ${item.itemNome || item.titulo || item.categoria}`,
          subtitle: `${item.unidadeNome || item.clienteNome || 'Unidade'} • ${item.categoria}`,
          badge: st.label,
          targetTab: 'units'
        });
      }
    });

    const syncErrs = OfflineStore.getSyncErrors();
    syncErrs.forEach((err, idx) => {
      list.push({
        id: `sync-${err.entity || idx}-${idx}`,
        category: 'sync',
        severity: 'warning',
        title: `Pendência de sincronização (${err.entity || 'dados'})`,
        subtitle: err.message || 'Toque para tentar sincronizar novamente',
        badge: 'Offline',
        action: 'sync'
      });
    });

    return list.slice(0, 20);
  }, [schedules, sstItems, pendingSyncCount]);

  const navigateToTab = (nextTab, { replace = false } = {}) => {
    const resolvedTab = TAB_PATHS[nextTab] ? nextTab : 'dashboard';
    setActiveTab(resolvedTab);
    if (typeof window !== 'undefined') {
      const targetUrl = TAB_PATHS[resolvedTab] || '/#/painel';
      const currentUrl = `${window.location.pathname}${window.location.hash}`;
      if (currentUrl !== targetUrl) {
        if (replace) {
          window.history.replaceState({}, '', targetUrl);
        } else {
          window.history.pushState({}, '', targetUrl);
        }
      }
    }
  };

  const openLegalRoute = (tab) => {
    setLegalModalTab(tab);
    if (typeof window !== 'undefined' && ['privacidade', 'termos', 'suporte'].includes(tab)) {
      const target = `/#/${tab}`;
      if (`${window.location.pathname}${window.location.hash}` !== target) {
        window.history.pushState({}, '', target);
      }
    }
  };

  const navigatePublicAuth = (nextMode) => {
    setPublicAuthMode(nextMode);
    if (typeof window !== 'undefined') {
      const target = nextMode === 'signup' ? '/#/cadastro' : nextMode === 'login' ? '/#/login' : '/';
      if (`${window.location.pathname}${window.location.hash}` !== target) {
        window.history.pushState({}, '', target);
      }
    }
  };

  useEffect(() => {
    const syncFromLocation = () => {
      const next = resolveInitialRoute();
      setIsNotFound(next.initialNotFound);
      setPublicReportToken(next.publicReportToken);
      setPublicAuthMode(next.initialAuthMode);
      setLegalModalTab(next.initialLegalTab);
      if (next.initialTab) setActiveTab(next.initialTab);
    };
    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('hashchange', syncFromLocation);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('hashchange', syncFromLocation);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (publicReportToken || isNotFound || recoveryMode || legalModalTab) return;
    if (supabaseEnabled && (!authChecked || !session || mfaRequired)) return;
    if (window.location.hash.includes('access_token=') || window.location.search.includes('code=')) return;
    const expectedUrl = TAB_PATHS[activeTab] || '/#/painel';
    const currentUrl = `${window.location.pathname}${window.location.hash}`;
    if (currentUrl === '/' || currentUrl === '/index.html' || window.location.pathname !== '/') {
      window.history.replaceState({}, '', expectedUrl);
    }
  }, [supabaseEnabled, authChecked, session, mfaRequired, recoveryMode, publicReportToken, isNotFound, legalModalTab, activeTab]);

  useEffect(() => {
    const isLandingView = supabaseEnabled && !session && !recoveryMode && !isNotFound && !publicReportToken && !publicAuthMode;
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', isLandingView ? 'index, follow' : 'noindex, nofollow');

    if (publicReportToken) return;
    if (isNotFound) {
      document.title = 'Kivo — Página não encontrada (404)';
      return;
    }
    if (supabaseEnabled && recoveryMode) {
      document.title = 'Kivo — Redefinir Senha';
      return;
    }
    if (supabaseEnabled && !session) {
      document.title = publicAuthMode
        ? 'Kivo — Acesso à Conta'
        : 'Kivo — Vistorias & Relatórios Técnicos';
      return;
    }
    document.title = TAB_TITLES[activeTab] || 'Kivo — Vistorias & Relatórios Técnicos';
  }, [isNotFound, publicReportToken, supabaseEnabled, recoveryMode, session, publicAuthMode, activeTab]);

  if (publicReportToken) {
    return (
      <Suspense fallback={<AppLoadingSkeleton />}>
        <PublicReportPortal
          token={publicReportToken}
          onBackToHome={() => {
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', '/');
            }
            setPublicReportToken(null);
            setIsNotFound(false);
          }}
          onOpenLegal={(tab) => setLegalModalTab(tab)}
        />
        {legalModalTab && (
          <LegalInfoModal
            isOpen={Boolean(legalModalTab)}
            initialTab={legalModalTab}
            onClose={() => setLegalModalTab(null)}
          />
        )}
        <PwaInstallBanner />
      </Suspense>
    );
  }

  if (supabaseEnabled && !authChecked) {
    return <AppLoadingSkeleton />;
  }

  if (isNotFound) {
    return (
      <Suspense fallback={<AppLoadingSkeleton />}>
        <NotFoundPage
          pathname={typeof window !== 'undefined' ? window.location.pathname : ''}
          isAuthenticated={!supabaseEnabled || Boolean(session)}
          onGoHome={() => {
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', '/');
            }
            setIsNotFound(false);
            setPublicAuthMode(null);
            setActiveTab('dashboard');
          }}
        />
      </Suspense>
    );
  }

  if (supabaseEnabled && recoveryMode) {
    return (
      <Suspense fallback={<AppLoadingSkeleton />}>
        <LoginScreen
          initialMode="recovery"
          theme={theme}
          onToggleTheme={toggleTheme}
          onRecoveryComplete={() => {
            setRecoveryMode(false);
            loadAllData();
          }}
        />
      </Suspense>
    );
  }

  if (supabaseEnabled && (!session || mfaRequired)) {
    return (
      <Suspense fallback={<AppLoadingSkeleton />}>
        {publicAuthMode || mfaRequired ? (
          <LoginScreen
            initialMode={mfaRequired ? 'mfa' : publicAuthMode}
            theme={theme}
            onToggleTheme={toggleTheme}
            onBackToLanding={() => navigatePublicAuth(null)}
            onLoginSuccess={(nextSession) => {
              if (nextSession?.user) {
                DataService.syncSessionUser(nextSession.user);
              }
              setMfaRequired(false);
              setSession(nextSession);
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', TAB_PATHS[activeTab] || '/#/painel');
              }
            }}
          />
        ) : (
          <LandingPage
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenLogin={() => navigatePublicAuth('login')}
            onOpenSignup={() => navigatePublicAuth('signup')}
            onOpenLegal={openLegalRoute}
          />
        )}
        {legalModalTab && (
          <LegalInfoModal
            isOpen={Boolean(legalModalTab)}
            initialTab={legalModalTab}
            onClose={() => {
              setLegalModalTab(null);
              if (
                typeof window !== 'undefined' &&
                (['/privacidade', '/termos', '/suporte'].includes(window.location.pathname) ||
                  ['#/privacidade', '#/termos', '#/suporte'].includes(window.location.hash))
              ) {
                window.history.replaceState({}, '', session ? (TAB_PATHS[activeTab] || '/#/painel') : '/');
              }
            }}
          />
        )}
        <PwaInstallBanner />
      </Suspense>
    );
  }

  const displayedOrders =
    selectedClient === 'all'
      ? orders
      : orders.filter((o) => o.clientName === selectedClient);

  const displayedReports =
    selectedClient === 'all'
      ? reports
      : reports.filter((r) => r.clienteNome === selectedClient);

  const displayedUnits =
    selectedClient === 'all'
      ? units
      : units.filter((u) => u.clienteNome === selectedClient);

  const handleUpdateOrder = (updatedOrder) => {
    const updatedList = DataService.saveOrder(updatedOrder, (syncedId, patchedOrders) => {
      setOrders(patchedOrders);
      setSelectedOrder((prev) => (prev?.id === updatedOrder.id ? { ...prev, supabaseId: syncedId } : prev));
    });
    setOrders(updatedList);
    setSelectedOrder((prev) => (prev?.id === updatedOrder.id ? updatedOrder : prev));
  };

  const handleCreateOrder = (newOrderData) => {
    const updatedList = DataService.createOrder(newOrderData, (_syncedId, patchedOrders) => {
      setOrders(patchedOrders);
    });
    setOrders(updatedList);
  };

  const findReportForOrder = (order) => {
    if (!order) return null;
    return reports.find(
      (r) =>
        (order.supabaseId && r.inspecaoId === order.supabaseId) ||
        r.inspecaoCodigo === order.id
    ) || null;
  };

  const handleOpenTechnicalReportFromOrder = (order) => {
    if (!order) return;
    const existing = findReportForOrder(order);
    const reportDraft = existing
      ? ReportService.syncFromOrder(existing, order, userProfile)
      : ReportService.buildFromOrder(order, userProfile);
    const { updated, nextList } = ReportService.saveDraftLocal(reportDraft);
    setReports(nextList);
    setSelectedOrder(null);
    navigateToTab('reports');
    setPendingReportToOpen(updated);
  };

  const handleDeleteOrder = async (order) => {
    const updatedList = await DataService.deleteOrder(order);
    AuditService.log('inspection.deleted', 'inspecao', order.id, { unidade: order.hospitalName });
    setOrders(updatedList);
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(null);
    }
  };

  const findPreviousOrderForUnit = (order) => {
    if (!order) return null;
    const sameUnit = orders.filter(
      (o) =>
        o.id !== order.id &&
        ((order.unidadeId && o.unidadeId === order.unidadeId) ||
          (o.hospitalName || '').toLowerCase() === (order.hospitalName || '').toLowerCase())
    );
    return sameUnit[0] || null;
  };

  const handleUpdateOrderStatus = (order, nextStatus) => {
    const updated = { ...order, status: nextStatus };
    const updatedList = DataService.saveOrder(updated, (syncedId, patchedOrders) => {
      setOrders(patchedOrders);
    });
    setOrders(updatedList);
  };

  const handleRestoreOrder = (order) => {
    const restoredList = DataService.saveOrder(order, (_syncedId, patchedOrders) => {
      setOrders(patchedOrders);
    });
    setOrders(restoredList);
    toast.success({ title: 'Inspeção restaurada', message: order.id });
  };

  const openOrdersCount = orders.filter((o) => o.status === 'open' || o.status === 'in_progress').length;
  const openActionsCount = orders.reduce(
    (acc, o) =>
      acc +
      (o.checklist || []).filter(
        (it) => (it.status === 'nao' || it.status === 'nao_conforme') && (it.actionStatus || 'Em Aberto') !== 'Concluído'
      ).length,
    0
  );
  const dueAgendaCount = schedules.filter((s) => {
    if (s.ativo === false) return false;
    const st = getExpiryStatus(s.proximaData);
    return st.status === 'vencido' || st.status === 'vence_hoje' || (st.daysRemaining !== null && st.daysRemaining <= 7);
  }).length;

  const displayedSchedules =
    selectedClient === 'all'
      ? schedules
      : schedules.filter((s) => !s.clienteNome || s.clienteNome === selectedClient);

  const displayedSstItems =
    selectedClient === 'all'
      ? sstItems
      : sstItems.filter((x) => !x.clienteNome || x.clienteNome === selectedClient);

  return (
    <div className="flex h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tabId) => {
          if (tabId === 'profile') {
            setIsProfileModalOpen(true);
            } else if (tabId === 'templates') {
            setIsTemplatesModalOpen(true);
          } else {
            navigateToTab(tabId);
          }
        }}
        openOrdersCount={openOrdersCount}
        openActionsCount={openActionsCount}
        dueAgendaCount={dueAgendaCount}
        reportsCount={reports.length}
        unitsCount={units.length}
        templatesCount={templates.length}
        userProfile={userProfile}
        onSignOut={supabaseEnabled ? handleSignOut : null}
        onOpenLegalModal={openLegalRoute}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          clientNames={clientNames}
          clients={clients}
          selectedClient={selectedClient}
          onSelectClient={setSelectedClient}
          onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          userProfile={userProfile}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          isSyncing={isSyncing}
          onSyncNow={handleSyncNow}
          alerts={headerAlerts}
          onSelectAlert={(alert) => {
            if (alert?.action === 'sync') {
              handleSyncNow();
            } else if (alert?.targetTab) {
              navigateToTab(alert.targetTab);
            }
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
          hasScreenLockPin={hasScreenLockPin}
          onLockScreen={() => {
            setUnlockPinInput('');
            setUnlockPinError('');
            setIsScreenLocked(true);
          }}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          <div key={activeTab} className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            <Suspense fallback={<ModuleLoadingSkeleton />}>
              {activeTab === 'dashboard' && (
                <DashboardOverview
                  orders={displayedOrders}
                  reports={displayedReports}
                  units={displayedUnits}
                  clients={clients}
                  schedules={displayedSchedules}
                  sstItems={displayedSstItems}
                  userProfile={userProfile}
                  onOpenOrder={(order) => setSelectedOrder(order)}
                  onNewOrder={() => {
                    setPreselectedUnitForNewOrder(null);
                    setIsNewOrderModalOpen(true);
                  }}
                  onNavigateTab={navigateToTab}
                  onOpenProfile={() => setIsProfileModalOpen(true)}
                />
              )}

              {activeTab === 'orders' && (
                <WorkOrderList
                  orders={displayedOrders}
                  clients={clients}
                  onOpenOrder={(order) => setSelectedOrder(order)}
                  onNewOrder={() => {
                    setPreselectedUnitForNewOrder(null);
                    setIsNewOrderModalOpen(true);
                  }}
                  onOpenTemplates={() => setIsTemplatesModalOpen(true)}
                  onDeleteOrder={handleDeleteOrder}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onRestoreOrder={handleRestoreOrder}
                />
              )}

              {activeTab === 'actions' && (
                <ActionPlansModule
                  orders={displayedOrders}
                  onUpdateOrder={handleUpdateOrder}
                  onOpenOrder={(order) => setSelectedOrder(order)}
                />
              )}

              {activeTab === 'agenda' && (
                <AgendaModule
                  schedules={displayedSchedules}
                  units={displayedUnits}
                  templates={templates}
                  onSaveSchedule={handleSaveSchedule}
                  onDeleteSchedule={handleDeleteSchedule}
                  onStartOrderFromSchedule={handleStartOrderFromSchedule}
                />
              )}

              {activeTab === 'units' && (
                <UnitsModule
                  units={displayedUnits}
                  clients={clients}
                  orders={displayedOrders}
                  reports={displayedReports}
                  sstItems={displayedSstItems}
                  schedules={schedules}
                  isAdmin={userProfile?.role === 'admin'}
                  onSaveUnit={handleSaveUnit}
                  onDeleteUnit={handleDeleteUnit}
                  onSaveClient={handleSaveClient}
                  onDeleteClient={handleDeleteClient}
                  onSaveSstItem={handleSaveSstItem}
                  onDeleteSstItem={handleDeleteSstItem}
                  onImportUnitsFromOrders={handleImportUnitsFromOrders}
                  onNewOrderForUnit={(unit) => {
                    setPreselectedUnitForNewOrder(unit);
                    setIsNewOrderModalOpen(true);
                  }}
                  onOpenOrder={(order) => setSelectedOrder(order)}
                  onNavigateTab={navigateToTab}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsModule
                  reports={displayedReports}
                  orders={displayedOrders}
                  units={displayedUnits}
                  clients={clients}
                  hospitals={clients.map((c) => ({ clientName: c.nome, name: '' }))}
                  userProfile={userProfile}
                  initialEditingReport={pendingReportToOpen}
                  onClearInitialEditingReport={() => setPendingReportToOpen(null)}
                  onOpenOrderByCode={(codeOrId) => {
                    const found = orders.find((o) => o.id === codeOrId || o.supabaseId === codeOrId);
                    if (found) setSelectedOrder(found);
                  }}
                  onNavigateTab={navigateToTab}
                  onSaveReport={async (rep) => {
                    const next = await ReportService.saveReport(rep);
                    setReports(next);
                    if (rep?.status === 'finalizado') {
                      const linkedOrder = orders.find(
                        (o) =>
                          (rep.inspecaoId && o.supabaseId === rep.inspecaoId) ||
                          (rep.inspecaoCodigo && o.id === rep.inspecaoCodigo)
                      );
                      if (linkedOrder && linkedOrder.status !== 'completed') {
                        handleUpdateOrder({
                          ...linkedOrder,
                          status: 'completed',
                          completedAt: linkedOrder.completedAt || new Date().toISOString()
                        });
                      }
                    }
                  }}
                  onLocalDraftUpdate={(nextList) => {
                    setReports(nextList);
                  }}
                  onDeleteReport={async (rep) => {
                    const next = await ReportService.deleteReport(rep);
                    AuditService.log('report.deleted', 'relatorio', rep.codigoRelatorio, { unidade: rep.unidade });
                    setReports(next);
                  }}
                />
              )}
            </Suspense>
          </div>
        </main>
      </div>

      <Suspense fallback={null}>
        {selectedOrder && (
          <WorkOrderDetailModal
            order={selectedOrder}
            isOpen={Boolean(selectedOrder)}
            onClose={() => setSelectedOrder(null)}
            onUpdateOrder={handleUpdateOrder}
            linkedReport={findReportForOrder(selectedOrder)}
            previousOrder={findPreviousOrderForUnit(selectedOrder)}
            onOpenTechnicalReport={handleOpenTechnicalReportFromOrder}
            userProfile={userProfile}
          />
        )}

        {isNewOrderModalOpen && (
          <NewWorkOrderModal
            isOpen={isNewOrderModalOpen}
            onClose={() => {
              setIsNewOrderModalOpen(false);
              setPreselectedUnitForNewOrder(null);
            }}
            onCreateOrder={handleCreateOrder}
            onSaveUnit={handleSaveUnit}
            clients={clients}
            units={units}
            templates={templates}
            onOpenTemplates={() => setIsTemplatesModalOpen(true)}
            initialUnit={preselectedUnitForNewOrder}
            userProfile={userProfile}
          />
        )}

        {isTemplatesModalOpen && (
          <ChecklistTemplatesModal
            isOpen={isTemplatesModalOpen}
            templates={templates}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onClose={() => setIsTemplatesModalOpen(false)}
          />
        )}

        {isProfileModalOpen && (
          <UserProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            userProfile={userProfile}
            onSaveProfile={handleSaveProfile}
            onSignOut={supabaseEnabled ? handleSignOut : null}
            isOnline={isOnline}
            pendingSyncCount={pendingSyncCount}
            onSyncNow={handleSyncNow}
            onScreenLockConfigChange={refreshScreenLockConfig}
            stats={{
              clients: clients.length,
              units: units.length,
              orders: orders.length,
              reports: reports.length
            }}
          />
        )}

        {isCommandPaletteOpen && (
          <CommandPaletteModal
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            orders={orders}
            reports={reports}
            units={units}
            onSelectOrder={(ord) => setSelectedOrder(ord)}
            onSelectReport={(rep) => {
              navigateToTab('reports');
              setPendingReportToOpen(rep);
            }}
            onNavigateTab={navigateToTab}
            onNewOrder={() => {
              setPreselectedUnitForNewOrder(null);
              setIsNewOrderModalOpen(true);
            }}
            onOpenProfile={() => setIsProfileModalOpen(true)}
          />
        )}

        {legalModalTab && (
          <LegalInfoModal
            isOpen={Boolean(legalModalTab)}
            initialTab={legalModalTab || 'privacidade'}
            onClose={() => {
              setLegalModalTab(null);
              if (
                typeof window !== 'undefined' &&
                (['/privacidade', '/termos', '/suporte'].includes(window.location.pathname) ||
                  ['#/privacidade', '#/termos', '#/suporte'].includes(window.location.hash))
              ) {
                window.history.replaceState({}, '', session ? (TAB_PATHS[activeTab] || '/#/painel') : '/');
              }
            }}
          />
        )}
      </Suspense>

      <PwaInstallBanner />

      {isScreenLocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0B0B0D]/95 backdrop-blur-xl animate-fade-in">
          <form
            onSubmit={handleUnlockScreen}
            className="w-full max-w-xs bg-[#141518] border border-[#2D2F36] rounded-2xl p-6 space-y-4 shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#122620] border border-[#2EB88A]/40 text-[#34D399] flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F4F4F5]">Sessão Bloqueada</h3>
              <p className="text-[11px] text-[#71717A] mt-0.5">
                {userProfile?.name || 'Auditor Técnico'} • Digite seu PIN para retomar
              </p>
            </div>
            <div>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                value={unlockPinInput}
                onChange={(e) => setUnlockPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
              />
              {unlockPinError && (
                <p className="text-[11px] text-[#FB7185] mt-1.5">{unlockPinError}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={!unlockPinInput}
              className="w-full py-2.5 bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold rounded-lg text-xs transition"
            >
              Desbloquear
            </button>
            {supabaseEnabled && (
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[11px] text-[#71717A] hover:text-[#FB7185] transition"
              >
                Encerrar sessão neste aparelho
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
