import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart2,
  BarChart3,
  Bell,
  Boxes,
  Briefcase,
  Building2,
  Check,
  CreditCard,
  Database,
  DollarSign,
  FileText,
  HelpCircle,
  LayoutGrid,
  Lock,
  MessageSquareText,
  Menu,
  Power,
  Search,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import LeadsPage from './pages/LeadsPage';
import ContactsPage from './pages/ContactsPage';
import CompaniesPage from './pages/CompaniesPage';
import PipelinePage from './pages/PipelinePage';
import PaymentsPage from './pages/PaymentsPage';
import RolesPage from './pages/RolesPage';
import PermissionsPage from './pages/PermissionsPage';
import UsersPage from './pages/UsersPage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import UserReportingPage from './pages/UserReportingPage';
import JtsPortalSection from './jts/JtsPortalSection';
import {
  leadBackendToUi,
  contactBackendToUi,
  companyBackendToUi,
  opportunityBackendToUi,
  paymentBackendToUi,
} from './utils/adapters';
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutGrid },
  { key: 'leads', label: 'Leads', Icon: LayoutGrid, operational: true },
  { key: 'contacts', label: 'Contacts', Icon: Users, operational: true },
  { key: 'companies', label: 'Companies', Icon: Building2, operational: true },
  { key: 'opportunities', label: 'Opportunities', Icon: FileText, operational: true },
  { key: 'pipeline', label: 'Pipeline', Icon: BarChart3, operational: true },
  { key: 'payments', label: 'Payments', Icon: CreditCard, operational: true },
  { key: 'user-reporting', label: 'User Reporting', Icon: BarChart2, adminOnly: true },
  { key: 'users', label: 'Users', Icon: Users, adminOnly: true },
  { key: 'roles', label: 'Roles', Icon: ShieldCheck, adminOnly: true },
  { key: 'permissions', label: 'Permissions', Icon: Lock, adminOnly: true },
];

export default function App() {
  const [authStatus, setAuthStatus] = useState('checking');
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState('jts-portal');
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [payments, setPayments] = useState([]);
  const [message, setMessage] = useState('');
  const [dynamicStagePage, setDynamicStagePage] = useState('');
  const [activeStagePage, setActiveStagePage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);   // mobile drawer
  const [profileOpen, setProfileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [leadDetailOpen, setLeadDetailOpen] = useState(false);
  const [contactDetailOpen, setContactDetailOpen] = useState(false);
  const [companyDetailOpen, setCompanyDetailOpen] = useState(false);
  const [leadDetailRequest, setLeadDetailRequest] = useState('');
  const [usingBackendData, setUsingBackendData] = useState(false);
  const [permissionRole, setPermissionRole] = useState(null);
  const [opportunityStageConfig, setOpportunityStageConfig] = useState({
    id: '', mode: 'standard', fields: [], records: [],
  });
  const [jtsInitialScreen, setJtsInitialScreen] = useState('landing');
  const [reapplyEmail, setReapplyEmail] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    // Parse query params to intercept password reset links
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    const uid = urlParams.get('uid');
    const token = urlParams.get('token');

    if (view === 'reset-password' && uid && token) {
      setPage('jts-portal');
    }

    async function recoverSession() {
      try {
        const response = await authRequest('/api/me/');
        if (!isMounted) return;
        if (response.success && response.data) {
          const userBackendData = response.data;
          const userObj = {
            id: userBackendData.id,
            username: userBackendData.username,
            email: userBackendData.email,
            first_name: userBackendData.first_name,
            last_name: userBackendData.last_name,
            is_staff: userBackendData.is_staff,
            is_superuser: userBackendData.is_superuser,
            user_type: userBackendData.user_type || 'USER',
            profile: userBackendData.profile,
            role: userBackendData.role || null,
            permissions: userBackendData.permissions || {},
            direct_crm: userBackendData.direct_crm || false,
          };
          setCurrentUser(userObj);
          setUsingBackendData(true);

          // Route recovered session to default page based on identity
          const isJtsAdmin = !!(userObj.is_staff || userObj.is_superuser);
          const isJtsUser = !isJtsAdmin && !!(userObj.profile && userObj.profile.organization && userObj.profile.cnic !== "");
          const hasCrmAccess = !isJtsAdmin && (!isJtsUser || userObj.user_type === 'ADMIN');
          const isDirectCrm = !!userObj.direct_crm;

          const path = window.location.pathname.replace(/\/$/, '');
          const requestedCrmPage = (path && path !== '/' && path !== '/index.html') ? path.substring(1) : null;

          if (isJtsAdmin) {
            if (requestedCrmPage) {
              setPage(requestedCrmPage);
            } else {
              setPage('jts-portal');
              setJtsInitialScreen('admin-dashboard');
            }
          } else if (isJtsUser && !isDirectCrm) {
            if (requestedCrmPage && requestedCrmPage !== 'jts-portal') {
              setPage(requestedCrmPage);
            } else {
              setPage('jts-portal');
              setJtsInitialScreen('user-dashboard');
            }
          } else {
            setPage(requestedCrmPage || 'dashboard');
          }
        }
      } catch (err) {
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setAuthStatus('ready');
        }
      }
    }
    recoverSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const isErrorMessage = message.includes('required') || message.includes('exists');

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(''), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);
  /*
    useEffect(() => {
      if (!currentUser) return undefined;
      let isMounted = true;
  
      async function loadBackendWorkspace() {
        try {
          const [leadsResponse, contactsResponse, companiesResponse, opportunitiesResponse, pipelineResponse] = await Promise.all([
            apiGet('/api/leads/?page_size=100'),
            apiGet('/api/contacts/?page_size=100'),
            apiGet('/api/companies/?page_size=100'),
            apiGet('/api/opportunities/?page_size=100'),
            apiGet('/api/pipeline/'),
          ]);
  
          if (!isMounted) return;
  
          const backendLeads = extractApiResults(leadsResponse).map(mapBackendLead);
          const backendContacts = extractApiResults(contactsResponse).map(mapBackendContact);
          const backendCompanies = extractApiResults(companiesResponse).map(mapBackendCompany);
          const backendOpportunities = extractApiResults(opportunitiesResponse).map(mapBackendOpportunity);
          const backendPipelineCards = extractApiResults(pipelineResponse);
  
          setLeads(backendLeads);
          setContacts(backendContacts);
          setCompanies(backendCompanies);
          setOpportunities(mergePipelineCardsIntoOpportunities(backendOpportunities, backendPipelineCards));
          setUsingBackendData(true);
        } catch (err) {
          if (!isMounted) return;
          setUsingBackendData(false);
          setMessage(err.message || 'Could not load backend CRM data.');
        }
      }
  
      loadBackendWorkspace();
      return () => { isMounted = false; };
    }, [currentUser]);
    */

  // Close mobile sidebar when navigating
  const navigate = (key) => {
    setPage(key);
    if (key !== 'jts-portal') setJtsInitialScreen('login');
    if (key === 'pipelineStage') setActiveStagePage(dynamicStagePage);
    if (key === 'pipeline') setActiveStagePage('');
    setSidebarOpen(false);
    setProfileOpen(false);
    if (key !== 'leads') setLeadDetailOpen(false);
    if (key !== 'contacts') setContactDetailOpen(false);
    if (key !== 'companies') setCompanyDetailOpen(false);
  };

  const globalSearchResults = buildGlobalSearchResults(globalSearch, {
    leads,
    contacts,
    companies,
    opportunities,
    payments,
  });

  const hasPermission = (moduleName, action) => {
    if (!currentUser) return false;
    if (currentUser.user_type === 'ADMIN') return true;
    const perms = currentUser.permissions?.[moduleName];
    return perms ? !!perms[action] : false;
  };

  const isManagerOrAdmin = (user) => {
    if (!user) return false;
    if (user.user_type === 'ADMIN') return true;
    const leadsScope = user.permissions?.leads?.view;
    const oppsScope = user.permissions?.opportunities?.view;
    return (leadsScope === true || leadsScope === 'ALL') && (oppsScope === true || oppsScope === 'ALL');
  };

  const hasViewPermission = (pageKey) => {
    if (!currentUser) return false;
    if (currentUser.user_type === 'ADMIN') return true;
    if (pageKey === 'user-reporting') {
      return false; // ADMIN-ONLY
    }
    if (pageKey === 'roles' || pageKey === 'permissions' || pageKey === 'users') return false;
    if (pageKey === 'dashboard' || pageKey === 'jts-portal') return true;
    const moduleName = (pageKey === 'pipelineStage' || pageKey === 'pipeline') ? 'pipeline' : pageKey;
    const perms = currentUser.permissions?.[moduleName];
    return perms ? !!perms.view : false;
  };

  const pageLabels = {
    dashboard: 'Dashboard',
    leads: 'Leads',
    contacts: 'Contacts',
    companies: 'Companies',
    opportunities: 'Opportunities',
    pipeline: 'Pipeline',
    pipelineStage: activeStagePage || dynamicStagePage,
    payments: 'Payments',
    'user-reporting': 'User Reporting',
    users: 'Users',
    roles: 'Roles',
    permissions: 'Permissions',
    'jts-portal': 'JTS Portal',
  };
  const pageTitleOverride = page === 'leads' && leadDetailOpen
    ? 'Lead Detail'
    : page === 'contacts' && contactDetailOpen
      ? 'Contact Detail'
      : page === 'companies' && companyDetailOpen
        ? 'Company Detail'
        : '';
  const currentNavItem = NAV_ITEMS.find((item) => item.key === (page === 'pipelineStage' ? 'pipeline' : page)) || NAV_ITEMS[0];
  const CurrentPageIcon = currentNavItem.Icon;

  const baseNavItems = dynamicStagePage
    ? [...NAV_ITEMS, { key: 'pipelineStage', label: dynamicStagePage, Icon: BarChart3 }]
    : NAV_ITEMS;

  const visibleNavItems = baseNavItems.filter((item) => {
    if (!currentUser) return false;

    if (item.key === 'user-reporting') {
      return currentUser.user_type === 'ADMIN';
    }

    // CRM Admin Sidebar layout
    if (currentUser.user_type === 'ADMIN') {
      return item.key === 'dashboard' || item.adminOnly === true;
    }

    // CRM User Sidebar layout
    if (item.adminOnly) return false;
    if (item.key === 'dashboard') return true;

    const moduleName = (item.key === 'pipelineStage' || item.key === 'pipeline') ? 'pipeline' : item.key;
    const perms = currentUser.permissions?.[moduleName];
    return perms ? !!perms.view : false;
  });

  const handleLogin = async ({ username, password }) => {
    // 1. Authenticate with backend API
    await authRequest('/api/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    // 2. Fetch authenticated profile details
    const meRes = await authRequest('/api/me/');
    if (meRes.success && meRes.data) {
      const userBackendData = meRes.data;
      const userObj = {
        id: userBackendData.id,
        username: userBackendData.username,
        email: userBackendData.email,
        first_name: userBackendData.first_name,
        last_name: userBackendData.last_name,
        is_staff: userBackendData.is_staff,
        is_superuser: userBackendData.is_superuser,
        user_type: userBackendData.user_type || 'USER',
        profile: userBackendData.profile,
        role: userBackendData.role || null,
        permissions: userBackendData.permissions || {},
        direct_crm: userBackendData.direct_crm || false,
      };
      setCurrentUser(userObj);
      setUsingBackendData(true);

      // Route logged in user to correct default page based on identity
      const isJtsAdmin = !!(userObj.is_staff || userObj.is_superuser);
      const isJtsUser = !isJtsAdmin && !!(userObj.profile && userObj.profile.organization && userObj.profile.cnic !== "");
      const hasCrmAccess = !isJtsAdmin && (!isJtsUser || userObj.user_type === 'ADMIN');
      const isDirectCrm = !!userObj.direct_crm;

      if (isJtsAdmin) {
        setPage('jts-portal');
        setJtsInitialScreen('admin-dashboard');
      } else if (isJtsUser && !isDirectCrm) {
        setPage('jts-portal');
        setJtsInitialScreen('user-dashboard');
      } else {
        setPage('dashboard');
      }

      setMessage('');
    } else {
      throw new Error('Failed to load user profile.');
    }
  };

  const handleLogout = async () => {
    try {
      await authRequest('/api/logout/', { method: 'POST' });
    } catch {
      // The local UI should still return to login if the server session is already gone.
    } finally {
      setCurrentUser(null);
      setUsingBackendData(false);
      setPage('dashboard');
      setMessage('');
    }
  };

  if (authStatus === 'checking') {
    return <AuthLoading />;
  }

  if (!currentUser) {
    const isJtsPublicScreen = page === 'jts-portal' && (
      jtsInitialScreen === 'landing' ||
      jtsInitialScreen === 'product-details' ||
      jtsInitialScreen === 'service-details' ||
      jtsInitialScreen === 'register' ||
      jtsInitialScreen === 'forgot' ||
      jtsInitialScreen === 'reset-password-confirm'
    );
    if (isJtsPublicScreen) {
      return (
        <JtsPortalSection
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
          initialScreen={jtsInitialScreen}
          onBackToCrm={() => { navigate('dashboard'); }}
          reapplyEmail={reapplyEmail}
          onReapplyHandled={() => setReapplyEmail('')}
        />
      );
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        onForgotPassword={() => {
          setJtsInitialScreen('forgot');
          setPage('jts-portal');
        }}
        onGoRegister={(email) => {
          setReapplyEmail(email);
          setJtsInitialScreen('register');
          setPage('jts-portal');
        }}
      />
    );
  }

  const isJtsAdmin = !!(currentUser?.is_staff || currentUser?.is_superuser);
  const isJtsUser = !isJtsAdmin && !!(currentUser?.profile && currentUser?.profile.organization && currentUser?.profile.cnic !== "");
  const hasCrmAccess = !isJtsAdmin && (!isJtsUser || currentUser?.user_type === 'ADMIN');

  console.warn('App Render State:', JSON.stringify({ page, message, isJtsAdmin, isJtsUser, hasCrmAccess, currentUser: currentUser?.email }));

  // Route Guard: CRM-only user trying to access JTS Portal
  if (page === 'jts-portal' && !isJtsAdmin && !isJtsUser) {
    setPage('dashboard');
    setMessage('Access restricted to JTS Admin or registered Organization Owners.');
    return <AuthLoading />;
  }

  // Route Guard: JTS-only user / JTS Admin trying to access CRM workspace
  if (page !== 'jts-portal' && !hasCrmAccess) {
    setPage('jts-portal');
    setJtsInitialScreen(isJtsAdmin ? 'admin-dashboard' : 'user-dashboard');
    setMessage(isJtsAdmin ? 'CRM workspace is available only to organization users.' : 'Access restricted. Your current plan does not include CRM.');
    window.history.replaceState({}, document.title, '/');
    return <AuthLoading />;
  }

  if (page === 'jts-portal') {
    return (
      <div className="jts-portal-wrapper relative w-full min-h-screen">
        {message && (
          <div
            role="alert"
            aria-live="polite"
            className={`crm-alert fixed top-4 right-4 z-50 shadow-lg ${isErrorMessage ? ' crm-alert--error' : ' crm-alert--success'}`}
            style={{ width: 'auto', maxWidth: '400px' }}
          >
            <span>{message}</span>
            <button type="button" aria-label="Close alert" onClick={() => setMessage('')}>
              <X size={15} />
            </button>
          </div>
        )}
        <JtsPortalSection
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
          initialScreen={jtsInitialScreen}
          onBackToCrm={() => { navigate('dashboard'); }}
          reapplyEmail={reapplyEmail}
          onReapplyHandled={() => setReapplyEmail('')}
        />
      </div>
    );
  }

  return (
    <div className="crm-shell">
      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div className="crm-sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ── Sidebar ── */}
      <aside className={`crm-sidebar${sidebarOpen ? ' crm-sidebar--open' : ''}`} aria-label="Main navigation">
        {/* Logo */}
        <div className="crm-sb-logo">
          <div className="crm-sb-logo-icon" aria-hidden="true">
            <Boxes size={22} />
          </div>
          <span className="crm-sb-logo-name">Lead<span>Flow</span></span>
        </div>

        {/* Nav section label */}
        <p className="crm-sb-section-label">MAIN MENU</p>

        {/* Nav items */}
        <nav className="crm-sb-nav" aria-label="Primary navigation">
          {visibleNavItems.map(({ key, label, Icon }) => {
            const isActive = page === key || (key === 'pipeline' && page === 'pipelineStage');
            return (
              <button
                key={key}
                className={`crm-sb-item${isActive ? ' crm-sb-item--active' : ''}`}
                onClick={() => navigate(key)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="crm-sb-item-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="crm-sb-item-label">{label}</span>
                {isActive && <span className="crm-sb-item-dot" aria-hidden="true" />}
              </button>
            );
          })}

        </nav>

      </aside>

      {/* ── Right column: Navbar + Content ── */}
      <div className="crm-main">
        {globalSearchOpen && <div className="crm-search-backdrop" aria-hidden="true" />}

        {/* ── Top Navbar ── */}
        <header className="crm-navbar" role="banner">
          {/* Mobile menu toggle */}
          <button
            className="crm-navbar-menu-btn"
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            <Menu size={20} />
          </button>

          <div className="crm-navbar-brand" aria-hidden="true">
            <span className="crm-navbar-page-icon">
              <CurrentPageIcon size={18} />
            </span>
            <span>{pageTitleOverride || pageLabels[page]}</span>
          </div>

          {/* Logo (mobile only, hidden on desktop) */}
          <div className="crm-navbar-brand-mobile" aria-hidden="true">
            <Boxes size={20} />
            <span>Lead<span>Flow</span></span>
          </div>

          {/* Global search (center) */}
          <div
            className={`crm-navbar-search${globalSearchOpen ? ' crm-navbar-search--active' : ''}`}
            role="search"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setGlobalSearchOpen(false);
            }}
          >
            <Search size={15} aria-hidden="true" />
            <input
              id="global-search"
              type="search"
              placeholder="Search..."
              aria-label="Global CRM search"
              value={globalSearch}
              onFocus={() => setGlobalSearchOpen(true)}
              onChange={(event) => {
                setGlobalSearch(event.target.value);
                setGlobalSearchOpen(true);
              }}
            />
            {globalSearchOpen && (
              <div className="crm-search-popover">
                <div className="crm-search-popover-head">
                  <strong>Search Results</strong>
                  {globalSearch && <span>{globalSearchResults.length} found</span>}
                </div>
                {globalSearch.trim() ? (
                  <div className="crm-search-results">
                    {globalSearchResults.length > 0 ? globalSearchResults.map((result) => (
                      <button
                        type="button"
                        key={`${result.type}-${result.id}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setPage(result.page);
                          if (result.type === 'Lead') setLeadDetailRequest(result.id);
                          setGlobalSearchOpen(false);
                        }}
                      >
                        <span>{result.type}</span>
                        <strong>{highlightMatch(result.title, globalSearch)}</strong>
                        <small>{highlightMatch(result.meta, globalSearch)}</small>
                      </button>
                    )) : <p>No matching records found.</p>}
                  </div>
                ) : (
                  <p className="crm-search-empty">Type a name, ID, company, phone, email, status, or amount.</p>
                )}
              </div>
            )}
          </div>

          {/* Right controls */}
          <div className="crm-navbar-right">
            {(isJtsAdmin || isJtsUser) && (
              <button
                className="button secondary sm domain-switch-btn"
                type="button"
                onClick={() => {
                  setPage('jts-portal');
                  setJtsInitialScreen('user-dashboard');
                }}
                style={{
                  marginRight: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <Database size={14} /> Switch to JTS Platform
              </button>
            )}
            <button className="crm-navbar-icon-btn" type="button" aria-label="Notifications" title="Notifications">
              <Bell size={18} />
              <span className="crm-notif-dot" aria-label="3 unread notifications" />
            </button>
            <button className="crm-navbar-icon-btn" type="button" aria-label="Help and support" title="Help">
              <HelpCircle size={18} />
            </button>
            <div className="crm-profile-wrap">
              <button
                className="crm-navbar-profile"
                type="button"
                aria-label="Open account panel"
                aria-haspopup="dialog"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((open) => !open)}
              >
                <div className="crm-avatar" aria-hidden="true">{getInitials(currentUser.username)}</div>
                <div className="crm-profile-meta">
                  <span className="crm-profile-name">{formatUsername(currentUser.username)}</span>
                  <span className="crm-profile-role">{currentUser.user_type === 'ADMIN' ? 'Admin' : 'User'}</span>
                </div>
              </button>
            </div>
          </div>
        </header>

        {profileOpen && (
          <AccountDrawer
            user={currentUser}
            onClose={() => setProfileOpen(false)}
            onLogout={handleLogout}
          />
        )}

        {/* ── Alert banner ── */}
        {message && (
          <div
            role="alert"
            aria-live="polite"
            className={`crm-alert${isErrorMessage ? ' crm-alert--error' : ' crm-alert--success'}`}
          >
            <span>{message}</span>
            <button type="button" aria-label="Close alert" onClick={() => setMessage('')}>
              <X size={15} />
            </button>
          </div>
        )}

        {/* ── Page content ── */}
        <main className="crm-content" id="main-content">
          {!hasViewPermission(page) ? (
            <AccessRestrictedScreen pageName={pageLabels[page]} onGoBack={() => navigate('dashboard')} />
          ) : (
            <>
              {page === 'dashboard' && (
                <RoleDashboardPanel
                  user={currentUser}
                  usingBackendData={usingBackendData}
                  onNavigate={navigate}
                  leads={leads}
                  contacts={contacts}
                  companies={companies}
                  opportunities={opportunities}
                  counts={{
                    leads: leads.length,
                    contacts: contacts.length,
                    companies: companies.length,
                    opportunities: opportunities.length,
                  }}
                />
              )}

              {page === 'leads' && (
                /* Leads page – uses dedicated lf-page-content styles */
                <div className="lf-page-content">
                  <LeadsPage
                    currentUser={currentUser}
                    leads={leads}
                    contacts={contacts}
                    setLeads={setLeads}
                    setContacts={setContacts}
                    setCompanies={setCompanies}
                    setMessage={setMessage}
                    onDetailOpenChange={setLeadDetailOpen}
                    globalSearch={globalSearch}
                    detailRequestId={leadDetailRequest}
                    onDetailRequestHandled={() => setLeadDetailRequest('')}
                    canCreate={hasPermission('leads', 'create')}
                    canEdit={hasPermission('leads', 'edit')}
                    canDelete={hasPermission('leads', 'delete')}
                  />
                </div>
              )}

              {page === 'contacts' && (
                <div className="crm-legacy-page">
                  <ContactsPage
                    currentUser={currentUser}
                    contacts={contacts}
                    setContacts={setContacts}
                    setMessage={setMessage}
                    onDetailOpenChange={setContactDetailOpen}
                    canCreate={hasPermission('contacts', 'create')}
                    canEdit={hasPermission('contacts', 'edit')}
                    canDelete={hasPermission('contacts', 'delete')}
                  />
                </div>
              )}

              {page === 'companies' && (
                <div className="crm-legacy-page">
                  <CompaniesPage
                    currentUser={currentUser}
                    companies={companies}
                    setCompanies={setCompanies}
                    contacts={contacts}
                    opportunities={opportunities}
                    setMessage={setMessage}
                    onDetailOpenChange={setCompanyDetailOpen}
                    canCreate={hasPermission('companies', 'create')}
                    canEdit={hasPermission('companies', 'edit')}
                    canDelete={hasPermission('companies', 'delete')}
                  />
                </div>
              )}

              {(page === 'pipeline' || page === 'pipelineStage') && (
                <div className="lf-page-content">
                  <PipelinePage
                    currentUser={currentUser}
                    leads={leads}
                    setLeads={setLeads}
                    opportunities={opportunities}
                    setOpportunities={setOpportunities}
                    setMessage={setMessage}
                    dynamicStagePage={dynamicStagePage}
                    setDynamicStagePage={setDynamicStagePage}
                    activeStagePage={page === 'pipelineStage' ? activeStagePage : ''}
                    setActiveStagePage={setActiveStagePage}
                    opportunityStageConfig={opportunityStageConfig}
                    setOpportunityStageConfig={setOpportunityStageConfig}
                    canCreate={hasPermission('pipeline', 'create')}
                    canEdit={hasPermission('pipeline', 'edit')}
                    canDelete={hasPermission('pipeline', 'delete')}
                  />
                </div>
              )}

              {page === 'payments' && (
                <div className="crm-legacy-page">
                  <PaymentsPage
                    payments={payments}
                    setPayments={setPayments}
                    setMessage={setMessage}
                    globalSearch={globalSearch}
                    canCreate={hasPermission('payments', 'create')}
                    canEdit={hasPermission('payments', 'edit')}
                    canDelete={hasPermission('payments', 'delete')}
                  />
                </div>
              )}

              {page === 'roles' && (
                <div className="crm-legacy-page">
                  <RolesPage
                    setMessage={setMessage}
                    onManagePermissions={(role) => {
                      setPermissionRole(role);
                      navigate('permissions');
                    }}
                  />
                </div>
              )}

              {page === 'permissions' && (
                <div className="crm-legacy-page">
                  <PermissionsPage
                    setMessage={setMessage}
                    selectedRole={permissionRole}
                    onBack={() => navigate('roles')}
                  />
                </div>
              )}

              {page === 'opportunities' && (
                <div className="crm-legacy-page">
                  <OpportunitiesPage
                    currentUser={currentUser}
                    setMessage={setMessage}
                    canCreate={hasPermission('opportunities', 'create')}
                    canEdit={hasPermission('opportunities', 'edit')}
                    canDelete={hasPermission('opportunities', 'delete')}
                  />
                </div>
              )}

              {page === 'user-reporting' && (
                <div className="crm-legacy-page">
                  <UserReportingPage
                    currentUser={currentUser}
                    setMessage={setMessage}
                  />
                </div>
              )}

              {page === 'users' && (
                <div className="crm-legacy-page">
                  <UsersPage
                    setMessage={setMessage}
                  />
                </div>
              )}
            </>
          )}
        </main>

      </div>
    </div>
  );
}

export function formatApiErrorMessage(payload) {
  if (!payload) return 'Request failed.';
  const rawErrors = payload.errors || payload.data;
  
  if (rawErrors && typeof rawErrors === 'object') {
    const messages = [];
    Object.entries(rawErrors).forEach(([field, value]) => {
      const label = (field === 'detail' || field === 'non_field_errors') 
        ? '' 
        : `${field.replace(/_/g, ' ')}: `;
      if (Array.isArray(value)) {
        messages.push(`${label}${value.join(', ')}`);
      } else if (typeof value === 'string') {
        messages.push(`${label}${value}`);
      }
    });
    if (messages.length > 0) {
      return messages.join(' | ');
    }
  }
  
  return payload.message || 'Request failed.';
}

export async function authRequest(path, options = {}) {
  const csrfToken = getCookie('csrftoken');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      ...options.headers,
    },
    ...options,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok || payload.success === false) {
    const detailMsg = formatApiErrorMessage(payload);
    const error = new Error(detailMsg);
    error.status = response.status;
    error.data = payload.errors || payload.data || payload;
    throw error;
  }

  return payload;
}

export function apiGet(path) {
  return authRequest(path);
}

function extractApiResults(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function mapBackendLead(lead) {
  return leadBackendToUi(lead);
}

function mapBackendContact(contact) {
  return contactBackendToUi(contact);
}

function mapBackendCompany(company) {
  return companyBackendToUi(company);
}

function mapBackendOpportunity(opportunity) {
  return opportunityBackendToUi(opportunity);
}

function mergePipelineCardsIntoOpportunities(opportunities, cards) {
  if (!cards.length) return opportunities;

  const existingIds = new Set(opportunities.map((opportunity) => String(opportunity.backendId || opportunity.id)));
  const pipelineOpportunities = cards
    .filter((card) => card.entity_type === 'opportunity' && !existingIds.has(String(card.id)))
    .map((card) => ({
      id: `OP-${card.id}`,
      backendId: card.id,
      name: card.name || 'Pipeline Opportunity',
      company: card.company_name || '',
      contact: card.name || '',
      value: Number(card.amount || 0),
      priority: 'Medium',
      closeDate: toDateOnly(card.expected_close_date),
      owner: card.assigned_salesperson_name || displayUserId(card.assigned_salesperson_id),
      stage: normalizeLabel(card.stage) || 'Prospecting',
      product: 'CRM Suite',
      notes: card.notes || '',
      pipelineStage: card.pipeline_stage_id,
    }));

  return [...opportunities, ...pipelineOpportunities];
}

function toDateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function normalizeLabel(value) {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function displayUserId(value) {
  if (!value) return 'Unassigned';
  return `User ${value}`;
}

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

function AuthLoading() {
  return (
    <div className="auth-page auth-page--center">
      <div className="auth-loading-card">
        <Boxes size={28} aria-hidden="true" />
        <span>Preparing your workspace...</span>
      </div>
    </div>
  );
}

function LoginPage({ onLogin, onForgotPassword, onGoRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLogin = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onLogin({ username: username.trim(), password });
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRejected = error && error.includes('rejected') && error.includes('Reason:');

  return (
    <div className="auth-page auth-page--center">
      <form className="login-card" onSubmit={submitLogin}>
        <div className="login-brand" aria-hidden="true">
          <span><Boxes size={24} /></span>
          <strong>Lead<span>Flow</span></strong>
        </div>
        <div className="login-heading">
          <h1>Login</h1>
          <p>Access your CRM portal account</p>
        </div>

        <label className="auth-field">
          <span>Username</span>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin or salesperson1"
            autoComplete="username"
            required
          />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
          />
        </label>

        <button
          className="auth-link-button"
          type="button"
          onClick={onForgotPassword}
        >
          Forgot Password?
        </button>

        {error && (
          <div className="auth-error" role="alert" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span>{error}</span>
            {isRejected && onGoRegister && (
              <button
                type="button"
                onClick={() => onGoRegister(username.trim())}
                style={{
                  backgroundColor: '#991b1b',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '4px',
                  alignSelf: 'flex-start'
                }}
              >
                Update & Reapply
              </button>
            )}
          </div>
        )}

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          <Lock size={17} aria-hidden="true" />
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

function DonutChart({ data, title }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 0;
  const isAllZero = data.every(d => d.value === 0);
  let accumulatedPercent = 0;

  return (
    <div className="donut-chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', padding: '12px 0' }}>
      <div className="donut-chart-visual" style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg viewBox="0 0 100 100" width="130" height="130">
          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="9" />
          {!isAllZero && data.map((item, index) => {
            const percent = (item.value / total) * 100;
            const strokeLength = (percent / 100) * 2 * Math.PI * 38;
            const strokeOffset = (accumulatedPercent / 100) * 2 * Math.PI * 38;
            accumulatedPercent += percent;
            
            if (item.value === 0) return null;

            return (
              <circle
                key={index}
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke={item.color}
                strokeWidth="9"
                strokeDasharray={`${strokeLength} ${2 * Math.PI * 38}`}
                strokeDashoffset={-strokeOffset}
                transform="rotate(-90 50 50)"
              />
            );
          })}
        </svg>
        <div className="donut-chart-center" style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span className="donut-chart-center-val" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-secondary)' }}>{total}</span>
          <span className="donut-chart-center-lbl" style={{ fontSize: '8px', fontWeight: '750', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title || 'Total'}</span>
        </div>
      </div>
      <div className="donut-chart-legend" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1' }}>
        {data.map((item, index) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div className="donut-legend-item" key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="donut-legend-color" style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                <span className="donut-legend-label" style={{ color: 'var(--color-muted)', fontWeight: '500' }}>{item.label}</span>
              </div>
              <strong className="donut-legend-value" style={{ color: 'var(--color-secondary)', fontWeight: '700' }}>{item.value} <span style={{ color: 'var(--color-muted)', fontWeight: '400', fontSize: '11px', marginLeft: '4px' }}>({percent}%)</span></strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinancialLineChart() {
  return null;
}

function FinancialsChart({ paid, pending }) {
  const total = Number(paid) + Number(pending) || 1;
  const isAllZero = Number(paid) === 0 && Number(pending) === 0;
  const paidPercent = isAllZero ? 0 : Math.round((Number(paid) / total) * 100);
  const pendingPercent = isAllZero ? 0 : Math.round((Number(pending) / total) * 100);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(Number(val || 0)).replace('PKR', 'Rs.');
  };

  return (
    <div className="financials-chart" style={{ marginTop: '16px' }}>
      <div className="financials-track" style={{ display: 'flex', height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
        {paidPercent > 0 && (
          <div style={{ width: `${paidPercent}%`, background: '#10b981' }} title={`Paid: ${paidPercent}%`} />
        )}
        {pendingPercent > 0 && (
          <div style={{ width: `${pendingPercent}%`, background: '#f59e0b' }} title={`Pending: ${pendingPercent}%`} />
        )}
      </div>
      <div className="financials-legend" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '750', color: 'var(--color-muted)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} />
            PAID PAYMENTS
          </div>
          <strong style={{ fontSize: '14px', color: 'var(--color-secondary)' }}>{formatCurrency(paid)}</strong>
          <small style={{ color: 'var(--color-muted)', fontSize: '10px' }}>{paidPercent}% of won revenue</small>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '750', color: 'var(--color-muted)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }} />
            PENDING
          </div>
          <strong style={{ fontSize: '14px', color: 'var(--color-secondary)' }}>{formatCurrency(pending)}</strong>
          <small style={{ color: 'var(--color-muted)', fontSize: '10px' }}>{pendingPercent}% open invoices</small>
        </div>
      </div>
    </div>
  );
}

function ValueFunnel({ stages = [], totalLeads = 0, pipelineValue = 0, wonDeals = 0, wonRevenue = 0, formatCurrency }) {
  const getStageStats = (stageTypes = [], entityTypes = []) => {
    const matched = (stages || []).filter(s => s && (stageTypes.includes(s.stage_type) || (entityTypes && entityTypes.includes(s.entity_type))));
    const count = matched.reduce((sum, s) => sum + (s.opportunity_count || s.lead_count || 0), 0);
    const value = matched.reduce((sum, s) => sum + (s.total_value || 0), 0);
    return { count, value };
  };

  const funnelItems = [
    {
      step: 1,
      label: 'Prospecting',
      stats: { count: totalLeads, value: pipelineValue },
      gradient: ['#3b82f6', '#1d4ed8'],
      color: '#3b82f6',
      points: '0,5 100,5 86,27 14,27',
      bgPill: 'bg-slate-800/80 text-blue-300 border-blue-500/40 hover:border-blue-400',
    },
    {
      step: 2,
      label: 'Qualified & Follow-Up',
      stats: getStageStats(['CONTACTED', 'FOLLOW_UP', 'QUALIFIED', 'NORMAL_OPPORTUNITY'], []),
      gradient: ['#a855f7', '#7e22ce'],
      color: '#a855f7',
      points: '13.5,30 86.5,30 73.5,52 26.5,52',
      bgPill: 'bg-slate-800/80 text-purple-300 border-purple-500/40 hover:border-purple-400',
    },
    {
      step: 3,
      label: 'Negotiation & Proposal',
      stats: getStageStats(['PROPOSAL', 'NEGOTIATION'], []),
      gradient: ['#ec4899', '#be185d'],
      color: '#ec4899',
      points: '28,55 72,55 58.5,77 41.5,77',
      bgPill: 'bg-slate-800/80 text-pink-300 border-pink-500/40 hover:border-pink-400',
    },
    {
      step: 4,
      label: 'Closed/Won',
      stats: { count: wonDeals, value: wonRevenue },
      gradient: ['#10b981', '#047857'],
      color: '#10b981',
      points: '43,80 57,80 50,98 50,98',
      bgPill: 'bg-slate-800/80 text-emerald-300 border-emerald-500/40 hover:border-emerald-400',
    },
  ];

  return (
    <div className="value-funnel-container flex flex-col gap-3">
      {/* 3D GLOWING TRANSLUCENT FUNNEL GRAPHIC & TIER BADGES */}
      <div className="relative w-full p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 shadow-inner flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden min-h-[210px]">
        {/* Ambient backdrop glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-slate-950/60 to-slate-950/90 pointer-events-none" />

        {/* Left Side: 3D Stacked Translucent Funnel SVG */}
        <div className="relative z-10 w-full sm:w-1/2 h-[175px] flex items-center justify-center">
          <svg viewBox="0 0 100 102" width="100%" height="100%" preserveAspectRatio="none" className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
            <defs>
              {funnelItems.map((item, idx) => (
                <linearGradient key={idx} id={`dashboardFunnelGrad_${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={item.gradient[0]} stopOpacity="0.85" />
                  <stop offset="100%" stopColor={item.gradient[1]} stopOpacity="0.95" />
                </linearGradient>
              ))}
            </defs>
            {funnelItems.map((item, index) => (
              <g key={index} className="transition-all duration-300 hover:brightness-125 cursor-pointer">
                <polygon
                  points={item.points}
                  fill={`url(#dashboardFunnelGrad_${index})`}
                  stroke={item.color}
                  strokeWidth="0.8"
                  opacity="0.9"
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Right Side: Tier Glass Badges matching dashboard.png */}
        <div className="relative z-10 w-full sm:w-1/2 flex flex-col justify-between gap-2">
          {funnelItems.map((item, index) => (
            <div
              key={index}
              className={`px-3 py-2 rounded-xl border backdrop-blur-md transition-all shadow-sm flex items-center justify-between gap-2 ${item.bgPill}`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider">{item.label}</span>
              <span className="text-xs font-black shrink-0">
                {item.stats.count} cards {item.stats.value > 0 ? `- ${formatCurrency(item.stats.value)}` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleDashboardPanel({
  user,
  usingBackendData,
  onNavigate,
}) {
  const isAdmin = user?.user_type === 'ADMIN' || Boolean(user?.is_staff) || Boolean(user?.is_superuser);
  const isManager = user?.user_type === 'MANAGER' || user?.role?.name?.toLowerCase().includes('manager');
  const canFilterSalesperson = isAdmin || isManager;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [activities, setActivities] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [charts, setCharts] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  // Redesign Dropdown states
  const [pipelines, setPipelines] = useState([]);
  const [salespeopleList, setSalespeopleList] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState('all');
  const [selectedSalesperson, setSelectedSalesperson] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('lifetime');

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(Number(val || 0)).replace('PKR', 'Rs.');
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (selectedPipeline && selectedPipeline !== 'all') queryParams.append('pipeline_id', selectedPipeline);
      if (selectedSalesperson && selectedSalesperson !== 'all') queryParams.append('salesperson_id', selectedSalesperson);
      if (selectedDateRange && selectedDateRange !== 'lifetime') queryParams.append('date_range', selectedDateRange);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const [summaryRes, pipelineRes, activitiesRes, followupsRes, chartsRes, leaderboardRes, pipelinesRes] = await Promise.all([
        apiGet(`/api/dashboard/summary/${qs}`),
        apiGet(`/api/dashboard/pipeline/${qs}`),
        apiGet(`/api/dashboard/activity/${qs}`),
        apiGet(`/api/dashboard/followups/${qs}`),
        apiGet(`/api/dashboard/charts/${qs}`),
        apiGet(`/api/dashboard/leaderboard/${qs}`).catch(err => {
          console.warn("Leaderboard widget request non-fatal fallback:", err);
          return { data: [] };
        }),
        apiGet('/api/pipelines/'),
      ]);

      setSummary(summaryRes.data);
      setPipeline(pipelineRes.data || []);
      setActivities(activitiesRes.data || []);
      setFollowups(followupsRes.data || []);
      setCharts(chartsRes.data);
      setLeaderboard(leaderboardRes.data || []);

      const pipelinesList = Array.isArray(pipelinesRes) ? pipelinesRes : (pipelinesRes?.data || []);
      setPipelines(pipelinesList);

      // Populate salesperson dropdown based on role (Admin vs Manager) without touching Admin-only User Reporting for Managers
      if (isAdmin) {
        try {
          const userRepRes = await apiGet('/api/reports/user-performance/');
          if (userRepRes.success && userRepRes.data?.users) {
            const formatted = userRepRes.data.users.map(u => ({
              id: u.user_id || u.id,
              user_name: u.full_name || u.username || u.user_name,
              user_email: u.email || u.user_email
            }));
            setSalespeopleList(formatted);
          }
        } catch (e) {
          console.warn("Could not fetch user reporting list for admin salesperson dropdown", e);
        }
      } else if (isManager) {
        try {
          const usersRes = await apiGet('/api/users/');
          const usersData = Array.isArray(usersRes) ? usersRes : (usersRes?.data?.results || usersRes?.data || []);
          const formatted = usersData.map(u => ({
            id: u.id,
            user_name: (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.username,
            user_email: u.email
          }));
          setSalespeopleList(formatted);
        } catch (e) {
          console.warn("Could not fetch users list for manager salesperson dropdown", e);
        }
      }

    } catch (err) {
      console.error(err);
      if (err.status === 403 || (err.message && (err.message.includes('403') || err.message.toLowerCase().includes('permission')))) {
        setError({ status: 403, message: 'Access Denied: You do not have permission to view Dashboard analytics.' });
      } else {
        setError({ status: 500, message: err.message || 'Failed to load dashboard metrics from backend database.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, selectedPipeline, selectedSalesperson, selectedDateRange]);

  if (loading && !error && !summary) {
    return (
      <div className="portal-page portal-page--embedded user-dashboard dashboard-v2 loading-skeleton-state">
        <header className="user-dashboard-hero dashboard-v2-hero animate-pulse">
          <div style={{ height: '32px', width: '250px', background: 'var(--color-surface-elevated)', borderRadius: '4px', marginBottom: '8px' }} />
          <div style={{ height: '20px', width: '400px', background: 'var(--color-surface-elevated)', borderRadius: '4px' }} />
        </header>
        <main className="portal-main dashboard-v2-main" style={{ marginTop: '24px' }}>
          <div className="dashboard-v2-metrics grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="dashboard-v2-metric animate-pulse" style={{ height: '100px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px' }} />
            ))}
          </div>
          <div className="dashboard-v2-content-grid" style={{ marginTop: '24px' }}>
            <div className="dashboard-v2-panel animate-pulse" style={{ height: '300px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '16px' }} />
            <div className="dashboard-v2-panel animate-pulse" style={{ height: '300px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '16px' }} />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portal-page portal-page--embedded user-dashboard dashboard-v2 error-state">
        <div className="text-center p-12" style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center' }}>
          <div className="inline-flex p-4 rounded-full mb-4" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', padding: '16px', display: 'inline-block' }}>
            <Lock size={40} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#ef4444', marginTop: '16px', fontSize: '20px' }}>
            {error.status === 403 ? 'Access Restricted' : 'Failed to Load Dashboard'}
          </h2>
          <p className="text-slate-400 mb-6" style={{ fontSize: 'var(--font-sm)', lineHeight: '1.6', color: 'var(--color-muted)', margin: '12px 0 24px' }}>
            {error.message}
          </p>
          {error.status !== 403 && (
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 rounded text-white font-medium lf-btn"
              style={{ background: 'var(--color-primary)', border: 'none', cursor: 'pointer', padding: '10px 20px', borderRadius: '4px', color: '#fff' }}
            >
              Retry Connection
            </button>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // DYNAMIC SUMMARY DATA BINDING
  // ----------------------------------------------------
  const displaySummary = summary ? { ...summary } : {
    total_leads: 0,
    new_leads: 0,
    qualified_leads: 0,
    converted_leads: 0,
    active_opportunities: 0,
    won_deals: 0,
    lost_deals: 0,
    total_pipeline_value: 0,
    won_revenue: 0,
    pending_payments: 0,
    paid_payments: 0,
    total_companies: 0,
    total_contacts: 0,
    conversion_rate: 0,
    average_deal_size: 0
  };

  const displayPipeline = pipeline || [];
  const displayLeadSources = charts ? { ...charts.lead_sources } : { WEBSITE: 0, REFERRAL: 0, FACEBOOK: 0, WALK_IN: 0, OTHER: 0 };
  const displayPaymentsPaid = displaySummary.paid_payments || 0;
  const displayPaymentsPending = displaySummary.pending_payments || 0;

  // Lead sources donut chart data
  const leadSourcesData = [
    { label: 'Website', value: displayLeadSources.WEBSITE || 0, color: '#2563eb' },
    { label: 'Referral', value: displayLeadSources.REFERRAL || 0, color: '#10b981' },
    { label: 'Facebook', value: displayLeadSources.FACEBOOK || 0, color: '#1877f2' },
    { label: 'Walk-In', value: displayLeadSources.WALK_IN || 0, color: '#f59e0b' },
    { label: 'Other', value: displayLeadSources.OTHER || 0, color: '#6b7280' },
  ];

  // Opportunity status donut chart data
  const oppsStatusData = [
    { label: 'Won', value: displaySummary.won_deals || 0, color: '#10b981' },
    { label: 'Lost', value: displaySummary.lost_deals || 0, color: '#ef4444' },
    { label: 'Open', value: displaySummary.active_opportunities || 0, color: '#3b82f6' },
  ];

  const getStageCard = (nameKeyword) => {
    const matched = (displayPipeline || []).find(s => String(s?.stage_name || s?.name || '').toLowerCase().includes(nameKeyword));
    return {
      count: matched ? (matched.opportunity_count || matched.lead_count || 0) : 0,
      value: matched ? (matched.total_value || 0) : 0,
      name: matched ? (matched.stage_name || matched.name) : nameKeyword.toUpperCase()
    };
  };

  const activeStagesList = [
    getStageCard('opportunity'),
    getStageCard('proposal'),
    getStageCard('negotiation'),
    getStageCard('won')
  ];

  // Quick Action Buttons checking user permissions
  const canViewLeads = Boolean(user?.permissions?.leads?.view || isAdmin);
  const canViewPipeline = Boolean(user?.permissions?.pipeline?.view || isAdmin);
  const canViewContacts = Boolean(user?.permissions?.contacts?.view || isAdmin);
  const canViewCompanies = Boolean(user?.permissions?.companies?.view || isAdmin);
  const canViewOpportunities = Boolean(user?.permissions?.opportunities?.view || isAdmin);
  const canViewPayments = Boolean(user?.permissions?.payments?.view || isAdmin);

  const parseFollowupDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return { month: 'TBD', day: '??', weekday: '---' };
      }
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return {
        month: months[d.getMonth()],
        day: String(d.getDate()).padStart(2, '0'),
        weekday: weekdays[d.getDay()]
      };
    } catch {
      return { month: 'TBD', day: '??', weekday: '---' };
    }
  };

  return (
    <div className="portal-page portal-page--embedded user-dashboard dashboard-v2">
      
      {/* Breadcrumbs */}
      <div className="dashboard-v2-breadcrumbs" style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
        <span>CRM</span>
        <span style={{ color: 'var(--color-soft)' }}>&gt;</span>
        <span style={{ color: 'var(--color-primary)' }}>Dashboard</span>
      </div>

      {/* Header & 3-Filter Executive Toolbar */}
      <header className="user-dashboard-hero dashboard-v2-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '0 0 16px 0', borderBottom: '1px solid var(--color-border)' }}>
        <div className="user-dashboard-hero-copy">
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-secondary)', margin: '0' }}>Sales Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px', color: 'var(--color-muted)' }}>
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <span>·</span>
            <span>Snapshot as of {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>·</span>
            <div className={`dashboard-v2-connection ${usingBackendData ? 'is-connected' : ''}`} style={{ border: 'none', padding: '0', background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '800', color: '#16a34a' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
              Backend Connected
            </div>
          </div>
        </div>

        {/* 3-Filter Toolbar Controls */}
        <div className="dashboard-v2-header-filters" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Pipeline Filter */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '0 10px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-muted)', textTransform: 'uppercase', marginRight: '4px' }}>Pipeline:</span>
            <select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '8px 4px', fontSize: '12px', fontWeight: '750', color: 'var(--color-secondary)', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Pipelines</option>
              {pipelines.map(p => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Salesperson Filter (Admin / Manager Only) */}
          {canFilterSalesperson && (
            <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '0 10px' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-muted)', textTransform: 'uppercase', marginRight: '4px' }}>Salesperson:</span>
              <select
                value={selectedSalesperson}
                onChange={(e) => setSelectedSalesperson(e.target.value)}
                style={{ border: 'none', background: 'transparent', padding: '8px 4px', fontSize: '12px', fontWeight: '750', color: 'var(--color-secondary)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Representatives</option>
                {salespeopleList.map(u => (
                  <option key={u.id} value={String(u.id)}>{u.user_name || u.user_email}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '0 10px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-muted)', textTransform: 'uppercase', marginRight: '4px' }}>Date Range:</span>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '8px 4px', fontSize: '12px', fontWeight: '750', color: 'var(--color-secondary)', outline: 'none', cursor: 'pointer' }}
            >
              <option value="lifetime">Lifetime</option>
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
          </div>

        </div>
      </header>

      <main className="portal-main dashboard-v2-main" style={{ marginTop: '20px' }}>
        
        {/* SECTION 1: TOP EXECUTIVE SALES KPIS (5 Clean Focused Cards) */}
        <section className="dashboard-v2-metrics-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Card 1: Open Opportunities */}
          {canViewOpportunities && (
            <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-white p-4 rounded-xl border border-indigo-900/60 shadow-md hover:shadow-lg transition-all flex flex-col justify-between min-h-[120px]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider">Open Opportunities</span>
                  <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                    <Briefcase size={13} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <strong className="text-2xl font-black text-white">{displaySummary.active_opportunities}</strong>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-indigo-800/40 flex items-center justify-between text-[10px] text-indigo-200 font-medium">
                <span className="truncate">{formatCurrency(displaySummary.total_pipeline_value)}</span>
                <span className="font-bold shrink-0">{displaySummary.won_deals} W / {displaySummary.lost_deals} L</span>
              </div>
            </div>
          )}

          {/* Card 2: Total Leads */}
          {canViewLeads && (
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between min-h-[120px]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Leads</span>
                  <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Target size={13} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <strong className="text-2xl font-black text-slate-900">{displaySummary.total_leads}</strong>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>New {displaySummary.new_leads} · Qual {displaySummary.qualified_leads}</span>
              </div>
            </div>
          )}

          {/* Card 3: Pipeline Value */}
          {canViewOpportunities && (
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:border-amber-200 hover:shadow-md transition-all flex flex-col justify-between min-h-[120px]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pipeline Value</span>
                  <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                    <DollarSign size={13} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <strong className="text-lg font-black text-slate-900 truncate">{formatCurrency(displaySummary.total_pipeline_value)}</strong>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span className="truncate">Avg: {formatCurrency(displaySummary.average_deal_size)}</span>
              </div>
            </div>
          )}

          {/* Card 4: Won Revenue */}
          {canViewPayments && (
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all flex flex-col justify-between min-h-[120px]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Won Revenue</span>
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Award size={13} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <strong className="text-lg font-black text-emerald-700 truncate">{formatCurrency(displaySummary.won_revenue)}</strong>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span className="truncate">Paid: {formatCurrency(displaySummary.paid_payments)}</span>
              </div>
            </div>
          )}

          {/* Card 5: Win Rate */}
          {canViewOpportunities && (
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between min-h-[120px]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Win Rate</span>
                  <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <TrendingUp size={13} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <strong className="text-2xl font-black text-slate-900">{displaySummary.conversion_rate}%</strong>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>{displaySummary.won_deals} W / {displaySummary.lost_deals} L</span>
              </div>
            </div>
          )}

        </section>

        {/* SECTION 2: PIPELINE FLOW & STAGE CONVERSION (2-Column Grid) */}
        {canViewOpportunities && (
          <section className="mt-5 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full items-stretch">
              
              {/* LEFT COLUMN: STAGE FLOW CARD */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
                
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold shadow-sm shrink-0">
                        <BarChart3 size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider m-0">STAGE FLOW</h3>
                        <p className="text-[10px] font-medium text-slate-400 m-0">Pipeline Stage Progression & Value</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cards & Value</span>
                  </div>

                  {/* Stage Flow Items List */}
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {displayPipeline && displayPipeline.length > 0 ? (
                      displayPipeline.map((stage) => {
                        const count = stage.opportunity_count || stage.lead_count || 0;
                        const maxCount = Math.max(...displayPipeline.map(s => s.opportunity_count || s.lead_count || 0)) || 1;
                        const percentage = Math.round((count / maxCount) * 100);

                        return (
                          <div
                            key={stage.stage_id}
                            className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all flex items-center justify-between gap-3"
                          >
                            {/* Stage Name & Color Dot */}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ background: stage.color || '#3b82f6' }} />
                              <strong className="font-bold text-slate-800 text-xs truncate">{stage.stage_name}</strong>
                            </div>

                            {/* Proportional Progress Track */}
                            <div className="w-24 sm:w-32 bg-slate-200/80 rounded-full h-1.5 overflow-hidden shrink-0 hidden sm:block">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.max(4, percentage)}%`,
                                  background: stage.color || '#3b82f6'
                                }}
                              />
                            </div>

                            {/* Cards Count & Formatted Revenue */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 text-[10px] font-bold">
                                {count} cards
                              </span>
                              <strong className="text-indigo-700 font-extrabold text-xs text-right min-w-[70px]">
                                {formatCurrency(stage.total_value || 0)}
                              </strong>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No pipeline stages available.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span>Total Active Stages: <strong className="text-slate-900">{displayPipeline ? displayPipeline.length : 0}</strong></span>
                  <span>Pipeline Value: <strong className="text-emerald-700">{formatCurrency(displaySummary.total_pipeline_value)}</strong></span>
                </div>
              </div>

              {/* RIGHT COLUMN: VALUE FUNNEL & KPI SUB-GRID */}
              <div className="flex flex-col gap-4 justify-between">
                
                {/* Top: VALUE FUNNEL CARD */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex-1 flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />

                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold shadow-sm shrink-0">
                          <LayoutGrid size={16} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider m-0">VALUE FUNNEL</h3>
                          <p className="text-[10px] font-medium text-slate-400 m-0">Pipeline Stage Conversion Progression</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progression</span>
                    </div>

                    <ValueFunnel
                      stages={displayPipeline}
                      totalLeads={displaySummary.total_leads}
                      pipelineValue={displaySummary.total_pipeline_value}
                      wonDeals={displaySummary.won_deals}
                      wonRevenue={displaySummary.won_revenue}
                      formatCurrency={formatCurrency}
                    />
                  </div>
                </div>

                {/* Bottom: 4-COLUMN KPI SUB-GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {activeStagesList.map((stage, idx) => {
                    const nameLower = String(stage.name || '').toLowerCase();
                    const isWon = nameLower.includes('won');
                    const isProposal = nameLower.includes('proposal');
                    const isNegotiation = nameLower.includes('negotiation');

                    const tileTheme = 'bg-white border-slate-200/90 text-slate-900 shadow-sm hover:border-indigo-200 hover:shadow-md';

                    const iconStyle = isWon
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60'
                      : isNegotiation
                      ? 'bg-amber-50 text-amber-600 border-amber-200/60'
                      : isProposal
                      ? 'bg-purple-50 text-purple-600 border-purple-200/60'
                      : 'bg-blue-50 text-blue-600 border-blue-200/60';

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col items-center justify-between text-center ${tileTheme}`}
                      >
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center mb-1.5 font-bold shadow-sm ${iconStyle}`}>
                          {isWon ? <Check size={14} /> : isNegotiation ? <MessageSquareText size={14} /> : isProposal ? <FileText size={14} /> : <Briefcase size={14} />}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate w-full">{stage.name}</span>
                        <strong className="text-xl sm:text-2xl font-black text-slate-900 my-1">{stage.count}</strong>
                        <span className="text-[10px] font-extrabold text-slate-700 block truncate w-full">{formatCurrency(stage.value)}</span>
                        <span className="text-[9px] font-bold mt-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/90 shrink-0">
                          {stage.count} {stage.count === 1 ? 'deal' : 'deals'}
                        </span>
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>
          </section>
        )}

        {/* SECTION 3: REVENUE RECEIVABLES & SALES REPRESENTATIVE LEADERBOARD */}
        <section className="dashboard-v2-content-grid" style={{ marginTop: '24px' }}>
          
          {/* Revenue & Payments Overview Card */}
          {canViewPayments ? (
            <article className="dashboard-v2-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <header className="dashboard-v2-panel-head">
                <div>
                  <span className="dashboard-v2-eyebrow">FINANCIAL PERFORMANCE</span>
                  <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-secondary)' }}>Revenue & Payments Overview</h2>
                </div>
              </header>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: '750' }}>TOTAL WON REVENUE</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <strong style={{ fontSize: '28px', fontWeight: '850', color: '#10b981' }}>{formatCurrency(displaySummary.won_revenue)}</strong>
                </div>
              </div>

              {/* Uncollected Receivables Warning Strip */}
              {displayPaymentsPending > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                    <span className="font-semibold text-amber-900">Uncollected Receivables Warning</span>
                  </div>
                  <strong className="text-amber-700 font-extrabold">{formatCurrency(displayPaymentsPending)} pending</strong>
                </div>
              )}

              <div className="mt-4">
                <FinancialsChart paid={displayPaymentsPaid} pending={displayPaymentsPending} />
              </div>
            </article>
          ) : (
            <div style={{ display: 'none' }} />
          )}

          {/* Sales Representative Leaderboard Card */}
          <article className="dashboard-v2-panel" style={{ padding: '20px', borderRadius: '16px' }}>
            <header className="dashboard-v2-panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="dashboard-v2-eyebrow">TEAM PERFORMANCE</span>
                <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-secondary)' }}>Top Sales Representatives</h2>
              </div>
              <Award size={18} className="text-indigo-600" />
            </header>

            <div className="mt-3 space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {leaderboard && leaderboard.length > 0 ? (
                leaderboard.map((rep, idx) => (
                  <div key={rep.user_id || idx} className="p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-slate-200 text-slate-700'}`}>
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <strong className="font-bold text-slate-900 block truncate">{rep.user_name || rep.user_email}</strong>
                        <small className="text-[10px] text-slate-400 block truncate">{rep.role_name} · {rep.assigned_leads_count || 0} leads</small>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <strong className="text-emerald-700 font-black block">{formatCurrency(rep.total_won_amount || 0)}</strong>
                      <span className="text-[10px] text-slate-500 font-semibold">{rep.won_deals_count || 0} won ({rep.win_rate || 0}%)</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No representative performance data available.
                </div>
              )}
            </div>
          </article>

        </section>

        {/* SECTION 4: CHANNEL ANALYSIS & CONVERSION OUTCOMES */}
        <section className="dashboard-v2-content-grid" style={{ marginTop: '24px' }}>
          
          {/* Lead Source donut chart */}
          {canViewLeads ? (
            <article className="dashboard-v2-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <header className="dashboard-v2-panel-head">
                <div>
                  <span className="dashboard-v2-eyebrow">PROSPECTING CHANNELS</span>
                  <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-secondary)' }}>Lead Source Distribution</h2>
                </div>
              </header>
              <DonutChart data={leadSourcesData} title="TOTAL LEADS" />
            </article>
          ) : (
            <div style={{ display: 'none' }} />
          )}

          {/* Opportunity status Success Ratio Donut Chart */}
          {canViewOpportunities ? (
            <article className="dashboard-v2-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <header className="dashboard-v2-panel-head">
                <div>
                  <span className="dashboard-v2-eyebrow">CONVERSION SUCCESS</span>
                  <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-secondary)' }}>Opportunity Status Breakdown</h2>
                </div>
              </header>
              <DonutChart data={oppsStatusData} title="TOTAL DEALS" />

              {/* WIN RATE VS TARGET progress bar */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '750', color: 'var(--color-muted)', marginBottom: '6px' }}>
                  <span>WIN RATE VS TARGET</span>
                  <span style={{ color: 'var(--color-secondary)' }}>{displaySummary.won_deals} / {displaySummary.won_deals + displaySummary.lost_deals || 1} CLOSED</span>
                </div>
                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${displaySummary.conversion_rate}%`, background: '#10b981', borderRadius: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-muted)', marginTop: '4px' }}>
                  <span>{displaySummary.conversion_rate}% average success ratio</span>
                  <span>Goal: 80%</span>
                </div>
              </div>
            </article>
          ) : (
            <div style={{ display: 'none' }} />
          )}
        </section>

        {/* SECTION 5: ACTIONABLE EXECUTION & AUDIT STREAM */}
        <section className="dashboard-v2-content-grid" style={{ marginTop: '24px' }}>
          
          {/* Target Close Followups List */}
          {canViewOpportunities ? (
            <article className="dashboard-v2-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <header className="dashboard-v2-panel-head">
                <div>
                  <span className="dashboard-v2-eyebrow">FOLLOW-UPS</span>
                  <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-secondary)' }}>Upcoming Target Closes</h2>
                  <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>{followups.length} deals scheduled to close · next 14 days</p>
                </div>
              </header>

              <div className="dashboard-v2-recent-list" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {followups && followups.length > 0 ? (
                  followups.slice(0, 5).map((item) => {
                    const isOverdue = new Date(item.date) < new Date();
                    const dateInfo = parseFollowupDate(item.date);
                    return (
                      <div className="followup-row" key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                        
                        {/* Calendar Date Block */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '38px', height: '42px', background: isOverdue ? '#fef2f2' : '#f8fafc', border: `1px solid ${isOverdue ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', flexShrink: 0 }}>
                          <span style={{ fontSize: '7px', fontWeight: '800', color: isOverdue ? '#ef4444' : 'var(--color-muted)', textTransform: 'uppercase' }}>{dateInfo.month}</span>
                          <span style={{ fontSize: '15px', fontWeight: '850', color: isOverdue ? '#dc2626' : 'var(--color-secondary)', lineHeight: '1' }}>{dateInfo.day}</span>
                          <span style={{ fontSize: '7px', color: 'var(--color-muted)', fontWeight: '700' }}>{dateInfo.weekday}</span>
                        </div>

                        {/* Text Block */}
                        <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <strong style={{ fontSize: '13px', color: 'var(--color-secondary)', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</strong>
                          <small style={{ color: 'var(--color-muted)', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.assigned_salesperson} {isOverdue ? '· OVERDUE' : ''}
                          </small>
                        </div>

                        {/* Amount/Priority Block */}
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ fontSize: '8px', fontWeight: '850', color: item.priority === 'HIGH' ? '#dc2626' : item.priority === 'MEDIUM' ? '#d97706' : '#2563eb', background: item.priority === 'HIGH' ? '#fee2e2' : item.priority === 'MEDIUM' ? '#fef3c7' : '#eff6ff', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            {item.priority}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-secondary)' }}>
                            {formatCurrency(item.amount || 0)}
                          </span>
                        </div>

                      </div>
                    );
                  })
                ) : (
                  <div className="dashboard-v2-empty">No upcoming closes.</div>
                )}
              </div>
            </article>
          ) : (
            <div style={{ display: 'none' }} />
          )}

          {/* CRM timeline stream + Quick actions */}
          <article className="dashboard-v2-panel" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <header className="dashboard-v2-panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="dashboard-v2-eyebrow">CRM STREAM</span>
                  <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-secondary)' }}>Recent Activity</h2>
                </div>
              </header>

              <div className="dashboard-v2-timeline" style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activities && activities.length > 0 ? (
                  activities.slice(0, 4).map((act) => (
                    <div className="recent-activity-row" key={act.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: act.type === 'OPPORTUNITY_WON' ? '#dcfce7' : act.type === 'PAYMENT_RECEIVED' ? '#ecfeff' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {act.type === 'OPPORTUNITY_WON' ? (
                          <span style={{ color: '#10b981', fontSize: '11px' }}>★</span>
                        ) : act.type === 'PAYMENT_RECEIVED' ? (
                          <span style={{ color: '#06b6d4', fontSize: '11px' }}>$</span>
                        ) : (
                          <span style={{ color: '#2563eb', fontSize: '11px' }}>●</span>
                        )}
                      </div>
                      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <strong style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-secondary)' }}>{act.description}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: 'var(--color-muted)' }}>
                          <span>{act.actor_name || 'System'}</span>
                          <span>·</span>
                          <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="dashboard-v2-empty">No recent activity.</div>
                )}
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '14px' }}>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Shortcuts</span>
              <div className="dashboard-v2-actions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {canViewLeads && (
                  <button type="button" className="quick-action-card" onClick={() => onNavigate('leads')} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px 10px', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}><TrendingUp size={13} /></div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-secondary)' }}>Add Lead</span>
                  </button>
                )}

                {canViewPipeline && (
                  <button type="button" className="quick-action-card" onClick={() => onNavigate('pipeline')} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px 10px', background: '#ffffff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}><BarChart3 size={13} /></div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-secondary)' }}>Review Board</span>
                  </button>
                )}
              </div>
            </div>

          </article>
        </section>

      </main>

    </div>
  );
}

function AccountDrawer({ user, onClose, onLogout }) {
  const roleName = user?.role?.name || (user?.user_type === 'ADMIN' ? 'Administrator' : 'Standard User');
  const isAdmin = user?.user_type === 'ADMIN';
  return (
    <div className="account-drawer-layer" role="presentation">
      <button className="account-drawer-backdrop" type="button" aria-label="Close account panel" onClick={onClose} />
      <aside className="account-drawer account-drawer--simple" role="menu" aria-label="Account menu">
        <header className="account-drawer-head">
          <div className="account-drawer-avatar">{getInitials(user.username)}</div>
          <div>
            <h2>{formatUsername(user.username)}</h2>
            <p>User Id: {user.id}</p>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                marginTop: '6px',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                background: isAdmin ? 'var(--color-primary)' : 'var(--color-surface-elevated)',
                color: isAdmin ? '#fff' : 'var(--color-muted)',
                border: isAdmin ? 'none' : '1px solid var(--color-border)',
              }}
            >
              {isAdmin ? <ShieldCheck size={11} /> : <Lock size={11} />}
              {roleName}
            </span>
          </div>
        </header>

        <footer className="account-drawer-footer">
          <button type="button" className="account-signout-button" role="menuitem" onClick={onLogout}><Power size={18} />Sign Out</button>
        </footer>
      </aside>
    </div>
  );
}


function formatUsername(username) {
  return String(username || 'User')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitials(username) {
  return String(username || 'User')
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

function buildGlobalSearchResults(query, data) {
  const term = normalizeSearch(query);
  if (!term) return [];

  const makeResult = ({ id, type, page, title, fields }) => {
    const normalizedFields = fields.map(([label, value]) => [label, String(value ?? '')]).filter(([, value]) => value.trim());
    const matches = normalizedFields.filter(([, value]) => normalizeSearch(value).includes(term));
    if (matches.length === 0) return null;
    const titleText = String(title ?? '');
    const titleLower = normalizeSearch(titleText);
    const bestMatch = matches[0];
    const exact = normalizedFields.some(([, value]) => normalizeSearch(value) === term);
    const starts = normalizedFields.some(([, value]) => normalizeSearch(value).startsWith(term));
    const titleHit = titleLower.includes(term);
    const score = (exact ? 100 : 0) + (starts ? 50 : 0) + (titleHit ? 25 : 0) - normalizeSearch(matches[0][1]).indexOf(term);
    const meta = `${bestMatch[0]}: ${bestMatch[1]}`;
    return { id, type, page, title: titleText, meta, score };
  };

  const results = [];

  data.leads.forEach((lead) => {
    const result = makeResult({
      id: lead.id,
      type: 'Lead',
      page: 'leads',
      title: `${lead.clientId} · ${lead.customer}`,
      fields: [
        ['Client ID', lead.clientId],
        ['Contact', lead.customer],
        ['Company', lead.company],
        ['Designation', lead.jobTitle],
        ['Phone', lead.phone],
        ['Email', lead.email],
        ['Owner', lead.owner],
        ['Status', lead.status],
        ['Priority', lead.priority],
        ['Source', lead.source],
        ['Last Activity', lead.lastActivity],
        ['Date', lead.createdDate || lead.date],
        ['Value', lead.estimatedValue || lead.leadValue],
      ],
    });
    if (result) results.push(result);
  });

  data.contacts.forEach((contact) => {
    const result = makeResult({
      id: contact.id,
      type: 'Contact',
      page: 'contacts',
      title: contact.contact || contact.customer || contact.id,
      fields: [
        ['Contact ID', contact.id],
        ['Contact', contact.contact || contact.customer],
        ['Company', contact.company],
        ['Designation', contact.designation],
        ['Phone', contact.phone],
        ['Email', contact.email],
        ['Owner', contact.owner],
        ['Status', contact.status],
      ],
    });
    if (result) results.push(result);
  });

  data.companies.forEach((company) => {
    const result = makeResult({
      id: company.id,
      type: 'Company',
      page: 'companies',
      title: `${company.id || ''} · ${company.name || company.company || ''}`,
      fields: [
        ['Company ID', company.id],
        ['Company', company.name || company.company],
        ['Email', company.email],
        ['Phone', company.phone],
        ['Owner', company.owner],
        ['Type', company.type],
        ['Rating', company.rating],
        ['Industry', company.industry],
      ],
    });
    if (result) results.push(result);
  });

  data.opportunities.forEach((opportunity) => {
    const result = makeResult({
      id: opportunity.id,
      type: 'Opportunity',
      page: 'pipeline',
      title: opportunity.name || opportunity.id,
      fields: [
        ['Opportunity ID', opportunity.id],
        ['Opportunity', opportunity.name],
        ['Company', opportunity.company],
        ['Stage', opportunity.stage],
        ['Owner', opportunity.owner],
        ['Value', opportunity.value],
      ],
    });
    if (result) results.push(result);
  });

  data.payments.forEach((payment) => {
    const result = makeResult({
      id: payment.id,
      type: 'Payment',
      page: 'payments',
      title: payment.invoiceNo || payment.id,
      fields: [
        ['Payment ID', payment.id],
        ['Invoice', payment.invoiceNo],
        ['Customer', payment.customer],
        ['Company', payment.company],
        ['Status', payment.status],
        ['Amount', payment.amount],
        ['Date', payment.date],
      ],
    });
    if (result) results.push(result);
  });

  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 8);
}

function normalizeSearch(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '');
}

function highlightMatch(text, query) {
  const value = String(text ?? '');
  const term = normalizeSearch(query);
  if (!term) return value;
  const map = [];
  const normalized = [];
  [...value].forEach((char, index) => {
    if (/\s/.test(char)) return;
    normalized.push(char.toLowerCase());
    map.push(index);
  });
  const index = normalized.join('').indexOf(term);
  if (index === -1) return value;
  const start = map[index];
  const end = map[index + term.length - 1] + 1;
  return (
    <>
      {value.slice(0, start)}
      <mark>{value.slice(start, end)}</mark>
      {value.slice(end)}
    </>
  );
}

function AccessRestrictedScreen({ pageName, onGoBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', textAlign: 'center', padding: '40px' }}>
      <div style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary)', padding: '20px', borderRadius: '50%', marginBottom: '20px' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', color: 'var(--color-text)', marginBottom: '8px' }}>
        Access Restricted
      </h2>
      <p style={{ color: 'var(--color-muted)', maxWidth: '420px', marginBottom: '24px', fontSize: 'var(--font-sm)', lineHeight: '1.6' }}>
        Your account role does not have permission to view the <strong>{pageName || 'requested'}</strong> module. Please contact your system administrator.
      </p>
      <button className="lf-btn lf-btn-primary" onClick={onGoBack} style={{ width: 'auto', padding: '10px 24px' }}>
        Return to Dashboard
      </button>
    </div>
  );
}

