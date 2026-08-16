import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CreditCard,
  Database,
  HelpCircle,
  LayoutGrid,
  Lock,
  MessageSquareText,
  Menu,
  Power,
  Search,
  Settings,
  ShieldCheck,
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
import JtsPortalSection from './jts/JtsPortalSection';
import { companySeed, contactSeed, leadSeed, opportunitySeed, paymentSeed } from './data/crmData';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutGrid },
  { key: 'leads', label: 'Leads', Icon: LayoutGrid },
  { key: 'contacts', label: 'Contacts', Icon: Users },
  { key: 'companies', label: 'Companies', Icon: Building2 },
  { key: 'pipeline', label: 'Pipeline', Icon: BarChart3 },
  { key: 'payments', label: 'Payments', Icon: CreditCard },
  { key: 'roles', label: 'Roles', Icon: ShieldCheck, adminOnly: true },
  { key: 'permissions', label: 'Permissions', Icon: Lock, adminOnly: true },
  { key: 'jts-portal', label: 'JTS Portal', Icon: Database },
];

export default function App() {
  const [authStatus, setAuthStatus] = useState('checking');
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [leads, setLeads] = useState(leadSeed);
  const [contacts, setContacts] = useState(contactSeed);
  const [companies, setCompanies] = useState(companySeed);
  const [opportunities, setOpportunities] = useState(opportunitySeed);
  const [payments, setPayments] = useState(paymentSeed);
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

  useEffect(() => {
    setAuthStatus('ready');
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

  const hasViewPermission = (pageKey) => {
    if (!currentUser) return false;
    if (currentUser.user_type === 'ADMIN') return true;
    if (pageKey === 'roles' || pageKey === 'permissions') return false;
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
    pipeline: 'Pipeline',
    pipelineStage: activeStagePage || dynamicStagePage,
    payments: 'Payments',
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
    if (item.adminOnly) {
      return currentUser?.user_type === 'ADMIN';
    }
    if (!currentUser) return false;
    if (currentUser.user_type === 'ADMIN') return true;

    const moduleName = (item.key === 'pipelineStage' || item.key === 'pipeline') ? 'pipeline' : item.key;
    if (moduleName === 'dashboard') return true;

    const perms = currentUser.permissions?.[moduleName];
    return perms ? !!perms.view : false;
  });

  const handleLogin = async ({ username, password }) => {
    if (username === 'admin' && password === 'admin123') {
      setCurrentUser({
        id: 1,
        username: 'admin',
        user_type: 'ADMIN',
        permissions: {},
      });

      setMessage('');
      return;
    }

    if (username === 'user' && password === 'User@123') {
      setCurrentUser({
        id: 2,
        username: 'user',
        user_type: 'USER',
        permissions: {
          leads: { view: true, create: true, edit: true, delete: false },
          contacts: { view: true, create: true, edit: true, delete: false },
          companies: { view: true, create: true, edit: true, delete: false },
          pipeline: { view: true, create: true, edit: true, delete: false },
          payments: { view: true, create: false, edit: false, delete: false },
        },
      });

      setMessage('');
      return;
    }

    throw new Error('Invalid username or password.');
  };

  const handleLogout = async () => {
    try {
      await authRequest('/api/logout/', { method: 'POST' });
    } catch {
      // The local UI should still return to login if the server session is already gone.
    } finally {
      setCurrentUser(null);
      setPage('dashboard');
      setMessage('');
    }
  };

  if (authStatus === 'checking') {
    return <AuthLoading />;
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (page === 'jts-portal') {
    return <JtsPortalSection onBackToCrm={() => { navigate('dashboard'); }} />;
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
            </>
          )}
        </main>

      </div>
    </div>
  );
}

async function authRequest(path, options = {}) {
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
    throw new Error(payload.message || 'Request failed.');
  }

  return payload;
}

function apiGet(path) {
  return authRequest(path);
}

function extractApiResults(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function mapBackendLead(lead) {
  return {
    id: lead.lead_code || `LD-${lead.id}`,
    backendId: lead.id,
    clientId: lead.lead_code || `LD-${lead.id}`,
    createdDate: toDateOnly(lead.created_at),
    date: toDateOnly(lead.created_at),
    customer: lead.full_name || 'Unnamed Lead',
    company: lead.company_name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    source: normalizeLabel(lead.source) || 'Website',
    owner: lead.assigned_salesperson_name || displayUserId(lead.assigned_salesperson),
    priority: normalizeLabel(lead.priority) || 'Medium',
    status: normalizeLabel(lead.status) || 'New',
    leadValue: Number(lead.amount || 0),
    estimatedValue: Number(lead.amount || 0),
    lastActivity: lead.updated_at ? `Updated ${toDateOnly(lead.updated_at)}` : 'Loaded from backend',
    upcomingFollowUp: '',
    nextFollowUp: '',
    notes: lead.notes || '',
    pipeline: lead.pipeline,
    pipelineStage: lead.pipeline_stage,
    isConverted: Boolean(lead.is_converted),
  };
}

function mapBackendContact(contact) {
  return {
    id: contact.contact_code || `CT-${contact.id}`,
    backendId: contact.id,
    clientId: contact.contact_code || `CT-${contact.id}`,
    date: toDateOnly(contact.created_at),
    contact: contact.full_name || 'Unnamed Contact',
    company: contact.company_name || '',
    designation: contact.designation || '',
    phone: contact.phone || contact.phone_number || '',
    email: contact.email || '',
    whatsapp: contact.whatsapp || contact.phone || contact.phone_number || '',
    address: contact.address || '',
    city: contact.city || '',
    country: contact.country || '',
    owner: contact.assigned_salesperson_name || displayUserId(contact.assigned_salesperson),
    status: normalizeLabel(contact.status) || 'Active',
    notes: contact.notes || '',
  };
}

function mapBackendCompany(company) {
  return {
    id: company.company_code || `CO-${company.id}`,
    backendId: company.id,
    name: company.name || 'Unnamed Company',
    type: normalizeLabel(company.type) || 'Prospect',
    rating: normalizeLabel(company.rating) || 'None',
    industry: company.industry || '',
    phone: company.phone || '',
    email: company.email || '',
    website: company.website || '',
    annualRevenue: Number(company.annual_revenue || 0),
    employees: Number(company.employee_count || 0),
    owner: company.assigned_salesperson_name || displayUserId(company.assigned_salesperson),
    leadSource: normalizeLabel(company.lead_source) || '',
    description: company.description || '',
    createdDate: toDateOnly(company.created_at),
  };
}

function mapBackendOpportunity(opportunity) {
  return {
    id: opportunity.opportunity_code || `OP-${opportunity.id}`,
    backendId: opportunity.id,
    name: opportunity.name || 'Unnamed Opportunity',
    company: opportunity.company_name || '',
    contact: opportunity.primary_contact_name || '',
    value: Number(opportunity.amount || 0),
    priority: 'Medium',
    closeDate: toDateOnly(opportunity.expected_close_date),
    owner: displayUserId(opportunity.assigned_salesperson),
    stage: normalizeLabel(opportunity.stage) || 'Prospecting',
    product: opportunity.product || 'CRM Suite',
    notes: opportunity.description || '',
    pipeline: opportunity.pipeline,
    pipelineStage: opportunity.pipeline_stage,
  };
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

function LoginPage({ onLogin }) {
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

        <button className="auth-link-button" type="button">Forgot Password?</button>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          <Lock size={17} aria-hidden="true" />
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

function RoleDashboardPanel({
  user,
  usingBackendData,
  counts,
  onNavigate,
  leads = [],
  contacts = [],
  companies = [],
  opportunities = [],
}) {
  const isAdmin = user.user_type === 'ADMIN';

  const totalPipelineValue = opportunities.reduce(
    (total, opportunity) => total + Number(opportunity.value || 0),
    0
  );

  const stageCounts = opportunities.reduce((acc, opportunity) => {
    const stage = opportunity.stage || 'Unassigned';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  const pipelineStages = Object.entries(stageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const recentLeads = [...leads]
    .sort((a, b) =>
      String(b.createdDate || b.date || '').localeCompare(
        String(a.createdDate || a.date || '')
      )
    )
    .slice(0, 4);

  const metrics = [
    {
      label: 'Leads',
      value: counts.leads,
      helper: 'Potential customers',
      Icon: TrendingUp,
      page: 'leads',
    },
    {
      label: 'Contacts',
      value: counts.contacts,
      helper: 'CRM relationships',
      Icon: Users,
      page: 'contacts',
    },
    {
      label: 'Companies',
      value: counts.companies,
      helper: 'Business accounts',
      Icon: Building2,
      page: 'companies',
    },
    {
      label: 'Opportunities',
      value: counts.opportunities,
      helper: 'Active pipeline',
      Icon: BarChart3,
      page: 'pipeline',
    },
  ];

  const cards = isAdmin
    ? [
      [
        'Admin Access',
        `${formatUsername(user.username)} is active with administrative CRM access.`,
        ShieldCheck,
      ],
      [
        'Backend Database',
        usingBackendData
          ? 'CRM records are currently connected to the Django backend.'
          : 'Waiting for backend CRM APIs to respond.',
        Database,
      ],
      [
        'System Configuration',
        'CRM pipeline and workflow configuration are available through your existing backend.',
        Settings,
      ],
    ]
    : [
      [
        'Workspace Access',
        `${formatUsername(user.username)} is signed in with role-based CRM access.`,
        UserRound,
      ],
      [
        'Backend Database',
        usingBackendData
          ? 'Live CRM records are currently connected to the Django backend.'
          : 'Local fallback data is being used until the backend responds.',
        Database,
      ],
      [
        'Support Queue',
        'Use the workspace to manage customer follow-ups and service activity.',
        MessageSquareText,
      ],
    ];

  return (
    <div className="portal-page portal-page--embedded user-dashboard dashboard-v2">

      {/* Hero */}
      <header className="user-dashboard-hero dashboard-v2-hero">
        <div className="user-dashboard-hero-copy">
          <span className="user-dashboard-kicker">
            {isAdmin ? 'CRM ADMIN PANEL' : 'CRM USER PANEL'}
          </span>

          <h1>Welcome, {formatUsername(user.username)}</h1>

          <p>
            {isAdmin
              ? 'Administrative overview of your CRM workspace.'
              : 'Here is a quick overview of your CRM workspace.'}
          </p>
        </div>

        <div
          className={`dashboard-v2-connection ${usingBackendData ? 'is-connected' : ''
            }`}
        >
          <span />
          {usingBackendData ? 'Backend Connected' : 'Using Local Data'}
        </div>
      </header>

      <main className="portal-main dashboard-v2-main">

        {/* Metrics */}
        <section
          className="dashboard-v2-metrics"
          aria-label="Workspace record counts"
        >
          {metrics.map(({ label, value, helper, Icon, page }) => (
            <button
              type="button"
              className="dashboard-v2-metric"
              key={label}
              onClick={() => !isAdmin && onNavigate(page)}
              disabled={isAdmin}
            >
              <span className="dashboard-v2-metric-icon" aria-hidden="true">
                <Icon size={20} />
              </span>

              <span className="dashboard-v2-metric-copy">
                <span className="dashboard-v2-metric-label">{label}</span>
                <strong>{value}</strong>
                <small>{helper}</small>
              </span>

              {!isAdmin && (
                <ArrowRight
                  size={16}
                  className="dashboard-v2-metric-arrow"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </section>

        {!isAdmin && (
          <>
            {/* Main dashboard content */}
            <section className="dashboard-v2-content-grid">

              {/* Pipeline */}
              <article className="dashboard-v2-panel">
                <header className="dashboard-v2-panel-head">
                  <div>
                    <span className="dashboard-v2-eyebrow">
                      SALES PIPELINE
                    </span>
                    <h2>Pipeline Overview</h2>
                  </div>

                  <button
                    type="button"
                    className="dashboard-v2-text-button"
                    onClick={() => onNavigate('pipeline')}
                  >
                    View Pipeline
                    <ArrowRight size={15} />
                  </button>
                </header>

                <div className="dashboard-v2-pipeline-total">
                  <div>
                    <span>Total Opportunity Value</span>
                    <strong>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0,
                      }).format(totalPipelineValue)}
                    </strong>
                  </div>

                  <span className="dashboard-v2-pipeline-count">
                    {counts.opportunities} opportunities
                  </span>
                </div>

                <div className="dashboard-v2-stage-list">
                  {pipelineStages.length > 0 ? (
                    pipelineStages.map(([stage, count]) => {
                      const percentage = counts.opportunities
                        ? Math.round((count / counts.opportunities) * 100)
                        : 0;

                      return (
                        <div className="dashboard-v2-stage" key={stage}>
                          <div className="dashboard-v2-stage-top">
                            <span>{stage}</span>
                            <strong>{count}</strong>
                          </div>

                          <div className="dashboard-v2-stage-track">
                            <span style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="dashboard-v2-empty">
                      No pipeline opportunities available.
                    </div>
                  )}
                </div>
              </article>

              {/* Recent leads */}
              <article className="dashboard-v2-panel">
                <header className="dashboard-v2-panel-head">
                  <div>
                    <span className="dashboard-v2-eyebrow">
                      RECENT ACTIVITY
                    </span>
                    <h2>Latest Leads</h2>
                  </div>

                  <button
                    type="button"
                    className="dashboard-v2-text-button"
                    onClick={() => onNavigate('leads')}
                  >
                    View All
                    <ArrowRight size={15} />
                  </button>
                </header>

                <div className="dashboard-v2-recent-list">
                  {recentLeads.length > 0 ? (
                    recentLeads.map((lead) => (
                      <button
                        type="button"
                        className="dashboard-v2-recent-row"
                        key={lead.id}
                        onClick={() => onNavigate('leads')}
                      >
                        <span className="dashboard-v2-recent-avatar">
                          {getInitials(lead.customer)}
                        </span>

                        <span className="dashboard-v2-recent-copy">
                          <strong>{lead.customer || 'Unnamed Lead'}</strong>
                          <small>
                            {lead.company || lead.email || 'No company'}
                          </small>
                        </span>

                        <span className="dashboard-v2-status">
                          {lead.status || 'New'}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="dashboard-v2-empty">
                      No recent leads available.
                    </div>
                  )}
                </div>
              </article>
            </section>

            {/* Quick Actions */}
            <section className="dashboard-v2-actions-panel">
              <div>
                <span className="dashboard-v2-eyebrow">SHORTCUTS</span>
                <h2>Quick Actions</h2>
              </div>

              <div className="dashboard-v2-actions">
                <button type="button" onClick={() => onNavigate('leads')}>
                  <TrendingUp size={17} />
                  Open Leads
                </button>

                <button type="button" onClick={() => onNavigate('pipeline')}>
                  <BarChart3 size={17} />
                  Review Pipeline
                </button>

                <button type="button" onClick={() => onNavigate('contacts')}>
                  <Users size={17} />
                  View Contacts
                </button>

                <button type="button" onClick={() => onNavigate('companies')}>
                  <Building2 size={17} />
                  Companies
                </button>
              </div>
            </section>
          </>
        )}

        {/* Workspace status */}
        <section className="dashboard-v2-status-grid">
          {cards.map(([cardTitle, cardBody, Icon]) => (
            <article className="dashboard-v2-status-card" key={cardTitle}>
              <span className="dashboard-v2-status-icon" aria-hidden="true">
                <Icon size={19} />
              </span>

              <div>
                <h3>{cardTitle}</h3>
                <p>{cardBody}</p>
              </div>
            </article>
          ))}
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

