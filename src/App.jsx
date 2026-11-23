import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardOverview from './components/dashboard/DashboardOverview';
import WorkOrderList from './components/workOrders/WorkOrderList';
import WorkOrderDetailModal from './components/workOrders/WorkOrderDetailModal';
import NewWorkOrderModal from './components/workOrders/NewWorkOrderModal';
import UserProfileModal from './components/profile/UserProfileModal';
import LoginScreen from './components/auth/LoginScreen';
import ReportsModule from './components/reports/ReportsModule';
import UnitsModule from './components/units/UnitsModule';
import { getSupabaseClient, isSupabaseConfigured } from './supabase/supabaseConfig';
import { DataService } from './supabase/dataService';
import { ReportService } from './supabase/reportService';
import { OfflineStore } from './offline/offlineStore';
import { SyncEngine } from './offline/syncEngine';
import { useFeedback } from './components/common/FeedbackProvider';
import { AppLoadingSkeleton } from './components/common/SkeletonLoader';
import CommandPaletteModal from './components/common/CommandPaletteModal';
import NotFoundPage from './components/common/NotFoundPage';
import LegalInfoModal from './components/common/LegalInfoModal';
import LandingPage from './components/public/LandingPage';
import PublicReportPortal from './components/public/PublicReportPortal';
import PwaInstallBanner from './components/common/PwaInstallBanner';

const TAB_TITLES = {
  dashboard: 'Kivo — Meu Painel',
  orders: 'Kivo — Vistorias & Checklists',
  reports: 'Kivo — Relatórios Técnicos',
  units: 'Kivo — Clientes & Unidades'
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
  const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(window.location.search || '');
  const hasAuthCallback =
    window.location.hash.includes('access_token=') ||
    window.location.hash.includes('type=recovery') ||
    window.location.search.includes('code=') ||
    window.location.search.includes('error=');

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
  const [recoveryMode, setRecoveryMode] = useState(false);

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

  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pendingReportToOpen, setPendingReportToOpen] = useState(null);
  const [preselectedUnitForNewOrder, setPreselectedUnitForNewOrder] = useState(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      setUserProfile(result.profile);
      setPendingSyncCount(result.pendingCount);
      if (result.synced > 0) {
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

    if (supabaseEnabled && navigator.onLine !== false) {
      if (OfflineStore.getPendingCount() > 0) {
        await handleSyncNow();
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
    }
  };

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
    if (!supabaseEnabled) {
      loadAllData();
      return;
    }

    const { client } = getSupabaseClient();
    if (!client) {
      setAuthChecked(true);
      return;
    }

    client.auth.getSession().then(({ data }) => {
      const activeSession = data?.session || null;
      if (activeSession?.user) {
        DataService.syncSessionUser(activeSession.user);
      }
      setSession(activeSession);
      setAuthChecked(true);
    });

    const { data: authListener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      }
      if (nextSession?.user) {
        DataService.syncSessionUser(nextSession.user);
      }
      setSession(nextSession);
      setAuthChecked(true);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabaseEnabled]);

  useEffect(() => {
    if (!supabaseEnabled || session) {
      loadAllData();
    }
  }, [supabaseEnabled, session]);

  const handleSignOut = async () => {
    const { client } = getSupabaseClient();
    await client?.auth.signOut();
    DataService.syncSessionUser(null);
    ReportService.clearLocalCache();
    setSession(null);
    setOrders([]);
    setReports([]);
    setClients([]);
    setUnits([]);
    setUserProfile(null);
    setSelectedOrder(null);
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

  const navigatePublicAuth = (nextMode) => {
    setPublicAuthMode(nextMode);
    if (typeof window !== 'undefined') {
      const target = nextMode === 'signup' ? '/cadastro' : nextMode === 'login' ? '/login' : '/';
      if (window.location.pathname !== target) {
        window.history.pushState({}, '', target);
      }
    }
  };

  useEffect(() => {
    const onPopState = () => {
      const next = resolveInitialRoute();
      setIsNotFound(next.initialNotFound);
      setPublicReportToken(next.publicReportToken);
      setPublicAuthMode(next.initialAuthMode);
      setLegalModalTab(next.initialLegalTab);
      if (next.initialTab) setActiveTab(next.initialTab);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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
      <>
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
      </>
    );
  }

  if (supabaseEnabled && !authChecked) {
    return <AppLoadingSkeleton />;
  }

  if (isNotFound) {
    return (
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
    );
  }

  if (supabaseEnabled && recoveryMode) {
    return (
      <LoginScreen
        initialMode="recovery"
        onRecoveryComplete={() => {
          setRecoveryMode(false);
          loadAllData();
        }}
      />
    );
  }

  if (supabaseEnabled && !session) {
    return (
      <>
        {publicAuthMode ? (
          <LoginScreen
            initialMode={publicAuthMode}
            onBackToLanding={() => navigatePublicAuth(null)}
            onLoginSuccess={(nextSession) => {
              if (nextSession?.user) {
                DataService.syncSessionUser(nextSession.user);
              }
              setSession(nextSession);
              if (typeof window !== 'undefined' && ['/login', '/entrar', '/cadastro'].includes(window.location.pathname)) {
                window.history.replaceState({}, '', '/');
              }
            }}
          />
        ) : (
          <LandingPage
            onOpenLogin={() => navigatePublicAuth('login')}
            onOpenSignup={() => navigatePublicAuth('signup')}
            onOpenLegal={(tab) => setLegalModalTab(tab)}
          />
        )}
        {legalModalTab && (
          <LegalInfoModal
            isOpen={Boolean(legalModalTab)}
            initialTab={legalModalTab}
            onClose={() => {
              setLegalModalTab(null);
              if (typeof window !== 'undefined' && ['/privacidade', '/termos', '/suporte'].includes(window.location.pathname)) {
                window.history.replaceState({}, '', '/');
              }
            }}
          />
        )}
        <PwaInstallBanner />
      </>
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
    setSelectedOrder(updatedOrder);
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
    setActiveTab('reports');
    setPendingReportToOpen(updated);
  };

  const handleDeleteOrder = async (order) => {
    const updatedList = await DataService.deleteOrder(order);
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

  return (
    <div className="flex h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tabId) => {
          if (tabId === 'profile') {
            setIsProfileModalOpen(true);
          } else {
            setActiveTab(tabId);
          }
        }}
        openOrdersCount={openOrdersCount}
        reportsCount={reports.length}
        unitsCount={units.length}
        userProfile={userProfile}
        onSignOut={supabaseEnabled ? handleSignOut : null}
        onOpenLegalModal={(tab) => setLegalModalTab(tab)}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          clientNames={clientNames}
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
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          <div key={activeTab} className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {activeTab === 'dashboard' && (
              <DashboardOverview
                orders={displayedOrders}
                reports={displayedReports}
                units={displayedUnits}
                userProfile={userProfile}
                onOpenOrder={(order) => setSelectedOrder(order)}
                onNewOrder={() => {
                  setPreselectedUnitForNewOrder(null);
                  setIsNewOrderModalOpen(true);
                }}
                onNavigateTab={setActiveTab}
                onOpenProfile={() => setIsProfileModalOpen(true)}
              />
            )}

            {activeTab === 'orders' && (
              <WorkOrderList
                orders={displayedOrders}
                onOpenOrder={(order) => setSelectedOrder(order)}
                onNewOrder={() => {
                  setPreselectedUnitForNewOrder(null);
                  setIsNewOrderModalOpen(true);
                }}
                onDeleteOrder={handleDeleteOrder}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onRestoreOrder={handleRestoreOrder}
              />
            )}

            {activeTab === 'units' && (
              <UnitsModule
                units={displayedUnits}
                clients={clients}
                orders={displayedOrders}
                reports={displayedReports}
                onSaveUnit={handleSaveUnit}
                onDeleteUnit={handleDeleteUnit}
                onSaveClient={handleSaveClient}
                onDeleteClient={handleDeleteClient}
                onImportUnitsFromOrders={handleImportUnitsFromOrders}
                onNewOrderForUnit={(unit) => {
                  setPreselectedUnitForNewOrder(unit);
                  setIsNewOrderModalOpen(true);
                }}
                onOpenOrder={(order) => setSelectedOrder(order)}
                onNavigateTab={setActiveTab}
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
                onNavigateTab={setActiveTab}
                onSaveReport={async (rep) => {
                  const next = await ReportService.saveReport(rep);
                  setReports(next);
                }}
                onLocalDraftUpdate={(nextList) => {
                  setReports(nextList);
                }}
                onDeleteReport={async (rep) => {
                  const next = await ReportService.deleteReport(rep);
                  setReports(next);
                }}
              />
            )}
          </div>
        </main>
      </div>

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
          initialUnit={preselectedUnitForNewOrder}
          userProfile={userProfile}
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
          stats={{
            clients: clients.length,
            units: units.length,
            orders: orders.length,
            reports: reports.length
          }}
        />
      )}

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        orders={orders}
        reports={reports}
        units={units}
        onSelectOrder={(ord) => setSelectedOrder(ord)}
        onSelectReport={(rep) => {
          setActiveTab('reports');
          setPendingReportToOpen(rep);
        }}
        onNavigateTab={setActiveTab}
        onNewOrder={() => {
          setPreselectedUnitForNewOrder(null);
          setIsNewOrderModalOpen(true);
        }}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      <LegalInfoModal
        isOpen={Boolean(legalModalTab)}
        initialTab={legalModalTab || 'privacidade'}
        onClose={() => {
          setLegalModalTab(null);
          if (typeof window !== 'undefined' && ['/privacidade', '/termos', '/suporte'].includes(window.location.pathname)) {
            window.history.replaceState({}, '', '/');
          }
        }}
      />

      <PwaInstallBanner />
    </div>
  );
}
