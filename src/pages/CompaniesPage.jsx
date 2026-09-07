import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Building2,
  User,
  Users,
  Briefcase,
  Clock,
  Activity,
  FileText,
  Calendar,
  MapPin,
  ExternalLink,
  Plus,
  DollarSign,
  Phone,
  Mail,
  Globe,
  Send,
  Sparkles,
  Star,
  Tag,
  Target,
  Truck,
} from 'lucide-react';
import ContactsPage from './ContactsPage';
import { owners } from '../data/crmData';

const companyColumns = [
  ['id', 'Company ID', 'link-cell'],
  ['date', 'Date'],
  ['name', 'Company Name'],
  ['type', 'Type'],
  ['rating', 'Rating'],
  ['annualRevenue', 'Annual Revenue'],
  ['industry', 'Industry'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['owner', 'Owner'],
];

const companyRows = [];

const blankCompanyForm = {
  name: '',
  type: 'Prospect',
  rating: 'None',
  employees: '',
  annualRevenue: '',
  industry: 'Other',
  phone: '',
  email: '',
  website: '',
  date: '',
  owner: '',
  billing_address: '',
  shipping_address: '',
  description: '',
};

const companyTypeOptions = ['Prospect', 'Customer', 'Partner', 'Competitor', 'Other'];
const companyRatingOptions = ['None', 'Hot', 'Warm', 'Cold'];
const companyIndustryOptions = ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing', 'Other'];
const companyDateRangeOptions = ['All', 'Today', 'Last 7 Days', 'This Month', 'Custom Range'];

const companyFormFields = [
  { key: 'name', label: 'Company Name' },
  { key: 'type', label: 'Type', kind: 'select', options: companyTypeOptions },
  { key: 'rating', label: 'Rating', kind: 'select', options: companyRatingOptions },
  { key: 'industry', label: 'Industry', kind: 'select', options: companyIndustryOptions },
  { key: 'employees', label: 'Employees', type: 'number' },
  { key: 'annualRevenue', label: 'Annual Revenue' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'website', label: 'Website' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'billing_address', label: 'Billing Address' },
  { key: 'shipping_address', label: 'Shipping Address' },
  { key: 'owner', label: 'Owner', kind: 'select' },
  { key: 'description', label: 'Description', type: 'textarea' },
];

const companyDetailFields = [
  { key: 'id', label: 'Company ID' },
  { key: 'name', label: 'Company Name' },
  { key: 'type', label: 'Type' },
  { key: 'rating', label: 'Rating' },
  { key: 'employees', label: 'Employees' },
  { key: 'annualRevenue', label: 'Annual Revenue' },
  { key: 'industry', label: 'Industry' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'date', label: 'Date' },
  { key: 'owner', label: 'Owner' },
  { key: 'billing_address', label: 'Billing Address' },
  { key: 'shipping_address', label: 'Shipping Address' },
  { key: 'description', label: 'Description' },
];

const companyFilters = [
  { key: 'type', label: 'Type', options: ['All', ...companyTypeOptions] },
  { key: 'rating', label: 'Rating', options: ['All', ...companyRatingOptions] },
  { key: 'owner', label: 'Owner', options: owners },
  { key: 'dateRange', label: 'Date range', type: 'dateRange', options: companyDateRangeOptions, defaultValue: 'All' },
];

export default function CompaniesPage({
  currentUser,
  companies,
  setCompanies,
  setMessage,
  onDetailOpenChange,
  summaryItems,
  addButtonLabel = 'New Company',
  addButtonIcon,
  filterConfig = companyFilters,
  panelAfterContent = null,
  hideTable = false,
  onAddButtonClick = null,
  actionExtraContent = null,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) {
  const [companiesAsContacts, setCompaniesAsContacts] = useState(companyRows);
  const companyData = companies?.length ? companies.map((company) => ({
    ...company,
    id: company.id,
    date: company.date || company.createdDate || '',
    contact: company.contact || company.name || company.company || '',
    company: company.company || company.name || '',
    name: company.name || company.company || '',
    designation: company.designation || company.industry || '',
    employees: company.employees || company.employeeCount || '',
    annualRevenue: company.annualRevenue || '',
    status: company.status || 'Active',
  })) : companiesAsContacts;

  const updateCompanyData = setCompanies || setCompaniesAsContacts;

  const companySummary = useMemoSummary(companyData);

  return (
    <ContactsPage
      isCompanyPage={true}
      currentUser={currentUser}
      contacts={companyData}
      setContacts={updateCompanyData}
      setMessage={setMessage}
      onDetailOpenChange={onDetailOpenChange}
      pageClassName="companies-copy-page"
      tableColumns={companyColumns}
      showSerialColumn
      addButtonLabel={addButtonLabel}
      addButtonIcon={addButtonIcon}
      blankFormValue={blankCompanyForm}
      formFields={companyFormFields}
      formSectionTitle="Company Information"
      addFormTitle="Add Company"
      addFormDescription="Create a new company record."
      editFormTitle="Edit Company"
      editFormDescription="Update this company record."
      saveButtonLabel="Save Company"
      updateButtonLabel="Save Changes"
      idPrefix="CO"
      allowManualId={false}
      formPageClassName="company-form-page"
      detailTitle="Company Detail"
      detailAriaLabel="Company details"
      detailFields={companyDetailFields}
      detailExtraContent={null}
      showActivitySections={false}
      filterConfig={filterConfig}
      panelAfterContent={panelAfterContent}
      hideTable={hideTable}
      onAddButtonClick={onAddButtonClick}
      actionExtraContent={actionExtraContent}
      customDetailRenderer={(props) => (
        <CompanyDetailPage
          {...props}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}
      filterTopContent={<CompanySummaryStrip summary={companySummary} />}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}

function useMemoSummary(companies) {
  return React.useMemo(() => {
    return {
      total: companies.length,
      prospects: companies.filter(c => String(c.type || '').toLowerCase() === 'prospect').length,
      customers: companies.filter(c => String(c.type || '').toLowerCase() === 'customer').length,
      partners: companies.filter(c => String(c.type || '').toLowerCase() === 'partner').length,
    };
  }, [companies]);
}

function CompanySummaryStrip({ summary }) {
  return (
    <section className="crm-summary-strip company-summary-strip" aria-label="Company summary">
      <article>
        <span>Total Companies</span>
        <strong>{summary.total}</strong>
      </article>
      <article>
        <span>Prospects</span>
        <strong className="company-summary-blue">{summary.prospects}</strong>
      </article>
      <article>
        <span>Customers</span>
        <strong className="company-summary-green">{summary.customers}</strong>
      </article>
      <article>
        <span>Partners</span>
        <strong className="company-summary-cyan">{summary.partners}</strong>
      </article>
    </section>
  );
}

function CompanyDetailPage({ record, onBack, onEdit, onDelete, canEdit = true, canDelete = true, getOwnerName, onToast }) {
  if (!record) return null;

  const [activeTab, setActiveTab] = useState('overview');
  const [sessionNotes, setSessionNotes] = useState(() => {
    return record.description ? [{ id: 1, text: record.description, author: getOwnerName ? getOwnerName(record.owner) : (record.ownerName || 'System'), date: record.date || 'Initial' }] : [];
  });
  const [newNoteText, setNewNoteText] = useState('');

  // Company Initials
  const initials = useMemo(() => {
    const name = (record.name || record.company || 'Company').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'CO';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [record.name, record.company]);

  // Clean Phone & Website
  const rawPhone = String(record.phone || '').trim();
  const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');

  const websiteUrl = record.website ? (record.website.startsWith('http') ? record.website : `https://${record.website}`) : '';

  // Add Session Note
  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const noteObj = {
      id: Date.now(),
      text: newNoteText.trim(),
      author: getOwnerName ? getOwnerName(record.owner) : (record.ownerName || 'Current Rep'),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    setSessionNotes(prev => [noteObj, ...prev]);
    setNewNoteText('');
    onToast?.('Company note saved successfully.');
  };

  // Activity Timeline Events
  const timelineEvents = useMemo(() => {
    const events = [];
    if (record.date) {
      events.push({
        id: 'evt-created',
        title: 'Company Account Provisioned',
        description: `Company account created and assigned to ${getOwnerName ? getOwnerName(record.owner) : (record.ownerName || 'Salesperson')}.`,
        date: formatCompanyDate(record.date),
        type: 'CREATED',
        icon: Building2
      });
    }

    if (record.updatedAt && record.updatedAt !== record.date) {
      events.push({
        id: 'evt-updated',
        title: 'Account Record Updated',
        description: `Account attributes and metadata synced.`,
        date: formatCompanyDate(record.updatedAt),
        type: 'UPDATE',
        icon: Edit3
      });
    }

    const summary = record.summary || {};
    if (summary.total_contacts > 0) {
      events.push({
        id: 'evt-contacts',
        title: 'Contacts Linked',
        description: `Connected to ${summary.total_contacts} key company contact(s).`,
        date: 'Active Link',
        type: 'CONTACTS',
        icon: User
      });
    }

    if (summary.won_opportunities > 0) {
      events.push({
        id: 'evt-won',
        title: 'Deals Closed / Won',
        description: `Generated $${Number(summary.total_revenue || 0).toLocaleString()} in revenue across ${summary.won_opportunities} won deal(s).`,
        date: 'Revenue Event',
        type: 'REVENUE',
        icon: DollarSign
      });
    }

    return events;
  }, [record, getOwnerName]);

  const ownerDisplayName = getOwnerName ? getOwnerName(record.owner) : (record.ownerName || record.owner || 'Unassigned');

  const summary = record.summary || { total_contacts: 0, open_opportunities: 0, won_opportunities: 0, total_revenue: 0 };
  const contactsList = Array.isArray(record.contacts) ? record.contacts : [];
  const oppsList = Array.isArray(record.opportunities) ? record.opportunities : [];

  // Badge Style Helper
  const getTypeBadgeStyle = (typeStr) => {
    const t = String(typeStr || '').toLowerCase();
    if (t === 'customer') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (t === 'prospect') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (t === 'partner') return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (t === 'competitor') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getRatingBadgeStyle = (ratingStr) => {
    const r = String(ratingStr || '').toLowerCase();
    if (r === 'hot') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (r === 'warm') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (r === 'cold') return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="lf-page leads-page company-record-page">
      <section className="payment-record-detail company-record-detail lead-details-redesign" aria-label="Company details">
        {/* ── HERO HEADER ── */}
        <header className="lead-drawer-hero">
          <div className="lead-hero-left">
            <button type="button" className="lead-hero-back-btn" aria-label="Back" title="Back" onClick={onBack}>
              <ArrowLeft size={20} />
            </button>

            <div className="lead-avatar-circle company-avatar-gradient">
              <span>{initials}</span>
            </div>

            <div className="lead-hero-title-block">
              <div className="lead-hero-title-row">
                <h2>{record.name || record.company || 'Company Detail'}</h2>
                <span className={`lead-status-pill ${getTypeBadgeStyle(record.type)}`}>
                  {record.type || 'Prospect'}
                </span>
                <span className={`lead-priority-pill ${getRatingBadgeStyle(record.rating)}`}>
                  {record.rating || 'None'} Rating
                </span>
                <span className="lead-code-pill">
                  {record.company_code || record.id}
                </span>
              </div>

              <p className="lead-hero-subtitle">
                {record.industry ? (
                  <>
                    <Building2 size={14} className="inline-icon mr-1" />
                    <strong>{record.industry}</strong>
                    <span className="mx-2">•</span>
                  </>
                ) : null}
                {record.employees ? `${Number(record.employees).toLocaleString()} Employees` : 'Company Account'}
                {record.leadSource ? ` • Source: ${record.leadSource}` : ''}
              </p>
            </div>
          </div>

          <div className="lead-record-actions">
            {canEdit && (
              <button type="button" className="payment-record-edit" onClick={onEdit}>
                <Edit3 size={15} /> Edit
              </button>
            )}
            {canDelete && (
              <button type="button" className="lead-record-lost" onClick={onDelete}>
                <Trash2 size={15} /> Delete
              </button>
            )}
          </div>
        </header>

        {/* ── QUICK COMMUNICATION BAR ── */}
        <div className="lead-quick-communication-bar">
          <span className="lead-quick-comm-label">Quick Actions:</span>
          <a
            href={rawPhone ? `tel:${cleanPhone}` : undefined}
            className={`lead-comm-btn ${rawPhone ? 'active' : 'disabled'}`}
            title={rawPhone ? `Call ${rawPhone}` : 'No phone number available'}
            onClick={(e) => !rawPhone && e.preventDefault()}
          >
            <Phone size={14} /> Call
          </a>

          <a
            href={record.email ? `mailto:${record.email}` : undefined}
            className={`lead-comm-btn ${record.email ? 'active' : 'disabled'}`}
            title={record.email ? `Email ${record.email}` : 'No email address available'}
            onClick={(e) => !record.email && e.preventDefault()}
          >
            <Mail size={14} /> Email
          </a>

          <a
            href={websiteUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`lead-comm-btn ${websiteUrl ? 'active' : 'disabled'}`}
            title={websiteUrl ? `Visit ${websiteUrl}` : 'No website link available'}
            onClick={(e) => !websiteUrl && e.preventDefault()}
          >
            <Globe size={14} /> Website
          </a>
        </div>

        {/* ── TABBED NAVIGATION ── */}
        <nav className="lead-tabs-nav">
          <button
            type="button"
            className={`lead-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Building2 size={15} /> Overview & Financials
          </button>

          <button
            type="button"
            className={`lead-tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contacts')}
          >
            <Users size={15} /> Associated Contacts
            {contactsList.length > 0 && <span className="tab-count-badge">{contactsList.length}</span>}
          </button>

          <button
            type="button"
            className={`lead-tab-btn ${activeTab === 'opportunities' ? 'active' : ''}`}
            onClick={() => setActiveTab('opportunities')}
          >
            <Briefcase size={15} /> Deals & Revenue
            {oppsList.length > 0 && <span className="tab-count-badge">{oppsList.length}</span>}
          </button>

          <button
            type="button"
            className={`lead-tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
            onClick={() => setActiveTab('activities')}
          >
            <Activity size={15} /> Notes & Timeline
            {sessionNotes.length > 0 && <span className="tab-count-badge">{sessionNotes.length}</span>}
          </button>
        </nav>

        {/* ── TAB CONTENT ── */}
        <div className="lead-tab-content-container">

          {/* TAB 1: OVERVIEW & FINANCIALS */}
          {activeTab === 'overview' && (
            <div className="lead-tab-panel overview-panel">
              {/* Financial & Summary Strip */}
              <section className="payment-record-summary lead-redesign-summary" aria-label="Company metrics summary">
                <div>
                  <span>Total Revenue</span>
                  <strong>${Number(summary.total_revenue || record.annualRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
                <div>
                  <span>Won Deals</span>
                  <strong className="text-emerald-600">{summary.won_opportunities || 0} Won</strong>
                </div>
                <div>
                  <span>Open Deals</span>
                  <strong className="text-indigo-600">{summary.open_opportunities || 0} Open</strong>
                </div>
                <div>
                  <span>Contacts</span>
                  <strong>{summary.total_contacts || contactsList.length || 0} Linked</strong>
                </div>
              </section>

              <div className="lead-overview-cards-grid">
                {/* Company Attributes Card (Premium Redesign) */}
                <section className="lead-card-box payment-parameters-card">
                  <header className="lead-card-box-head">
                    <Building2 size={16} className="text-purple-600" />
                    <h3>Company Attributes</h3>
                  </header>
                  <div className="payment-param-grid">
                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-purple-50 text-purple-600">
                        <Building2 size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Company Name</span>
                        <strong className="payment-param-value">{record.name || record.company || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-indigo-50 text-indigo-600">
                        <Briefcase size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Industry</span>
                        <strong className="payment-param-value">{record.industry || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-amber-50 text-amber-600">
                        <Tag size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Account Type</span>
                        <strong className="payment-param-value">{record.type || 'Prospect'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-rose-50 text-rose-600">
                        <Star size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Rating</span>
                        <strong className="payment-param-value">{record.rating || 'None'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-sky-50 text-sky-600">
                        <Users size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Employees</span>
                        <strong className="payment-param-value">{record.employees ? Number(record.employees).toLocaleString() : '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-emerald-50 text-emerald-600">
                        <DollarSign size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Annual Revenue</span>
                        <strong className="payment-param-value text-emerald-700">{record.annualRevenue ? `$${Number(record.annualRevenue).toLocaleString()}` : '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-blue-50 text-blue-600">
                        <Target size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Lead Source</span>
                        <strong className="payment-param-value">{record.leadSource || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-purple-50 text-purple-600">
                        <User size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Assigned Owner</span>
                        <strong className="payment-param-value">{ownerDisplayName}</strong>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Contact & Address Information Card (Premium Redesign) */}
                <section className="lead-card-box payment-parameters-card">
                  <header className="lead-card-box-head">
                    <MapPin size={16} className="text-indigo-600" />
                    <h3>Contact & Address Information</h3>
                  </header>
                  <div className="payment-param-grid">
                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-emerald-50 text-emerald-600">
                        <Phone size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Phone Number</span>
                        <strong className="payment-param-value font-mono">{record.phone || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-sky-50 text-sky-600">
                        <Mail size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Email Address</span>
                        <strong className="payment-param-value text-sky-700">{record.email || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-blue-50 text-blue-600">
                        <Globe size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Website</span>
                        <div className="payment-param-value">
                          {websiteUrl ? (
                            <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="lead-link text-xs font-semibold">
                              {record.website} <ExternalLink size={11} className="inline-icon" />
                            </a>
                          ) : '-'}
                        </div>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-purple-50 text-purple-600">
                        <Building2 size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Organization</span>
                        <strong className="payment-param-value">{record.organization || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item full-span">
                      <div className="payment-param-icon bg-amber-50 text-amber-600">
                        <MapPin size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Billing Address</span>
                        <strong className="payment-param-value">{record.billing_address || record.address || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item full-span">
                      <div className="payment-param-icon bg-indigo-50 text-indigo-600">
                        <Truck size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Shipping Address</span>
                        <strong className="payment-param-value">{record.shipping_address || record.billing_address || '-'}</strong>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Description Card */}
                {record.description && (
                  <section className="lead-card-box full-width">
                    <header className="lead-card-box-head">
                      <FileText size={16} /> <h3>Company Description & Overview</h3>
                    </header>
                    <p className="text-sm text-slate-700 leading-relaxed margin-0">{record.description}</p>
                  </section>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ASSOCIATED CONTACTS */}
          {activeTab === 'contacts' && (
            <div className="lead-tab-panel contacts-panel">
              {contactsList.length > 0 ? (
                <div className="contact-related-table-wrap">
                  <table className="contact-related-table">
                    <thead>
                      <tr>
                        <th>Contact Name</th>
                        <th>Designation</th>
                        <th>Email</th>
                        <th>Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contactsList.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.full_name || c.name || 'Unnamed Contact'}</strong></td>
                          <td>{c.designation || '-'}</td>
                          <td>{c.email || '-'}</td>
                          <td>{c.phone_number || c.phone || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="lead-empty-state">
                  <Users size={36} />
                  <h4>No Contacts Linked</h4>
                  <p>When contacts are created and linked to this company, they will automatically appear here.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DEALS & REVENUE (OPPORTUNITIES) */}
          {activeTab === 'opportunities' && (
            <div className="lead-tab-panel opps-panel">
              {oppsList.length > 0 ? (
                <div className="contact-related-table-wrap">
                  <table className="contact-related-table">
                    <thead>
                      <tr>
                        <th>Opportunity Name</th>
                        <th>Stage</th>
                        <th>Value</th>
                        <th>Expected Close Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oppsList.map((opp) => (
                        <tr key={opp.id}>
                          <td><strong>{opp.name}</strong></td>
                          <td><span className="lead-status-pill bg-indigo-50 text-indigo-700 border-indigo-200">{opp.stage || 'Active'}</span></td>
                          <td><strong>{opp.value || opp.amount ? `$${Number(opp.value || opp.amount).toLocaleString()}` : '-'}</strong></td>
                          <td>{opp.expected_close_date ? formatCompanyDate(opp.expected_close_date) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="lead-empty-state">
                  <Briefcase size={36} />
                  <h4>No Opportunities Linked</h4>
                  <p>Opportunities converted or created under this company account will appear here.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: NOTES & ACTIVITY */}
          {activeTab === 'activities' && (
            <div className="lead-tab-panel activities-panel">
              {/* Sales Note Composer */}
              <form onSubmit={handleAddNote} className="lead-note-composer">
                <h4>Add Company Account Note</h4>
                <textarea
                  placeholder="Record account updates, meeting notes, or rep insights for this company..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  rows={3}
                  required
                />
                <button type="submit" className="lead-add-note-btn">
                  <Send size={14} /> Save Note
                </button>
              </form>

              {/* Notes List */}
              {sessionNotes.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Notes & Comments</h4>
                  <ul className="lead-notes-list">
                    {sessionNotes.map((n) => (
                      <li key={n.id} className="lead-note-card">
                        <header className="lead-note-head">
                          <strong className="lead-note-author">{n.author}</strong>
                          <span className="lead-note-date">{n.date}</span>
                        </header>
                        <p className="lead-note-body">{n.text}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timeline */}
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Account Activity Timeline</h4>
              {timelineEvents.length > 0 ? (
                <ul className="lead-timeline-tree">
                  {timelineEvents.map((evt, idx) => {
                    const IconComp = (evt.icon && (typeof evt.icon === 'function' || typeof evt.icon === 'object')) ? evt.icon : Clock;
                    return (
                      <li key={evt.id || idx} className="lead-timeline-item">
                        <div className="lead-timeline-node">
                          <IconComp size={15} />
                        </div>
                        <div className="lead-timeline-card">
                          <header className="lead-timeline-card-head">
                            <h4>{evt.title || evt.action || 'Account Event'}</h4>
                            <span className="lead-timeline-date">{evt.date || 'Recent'}</span>
                          </header>
                          <p className="lead-timeline-desc">{evt.description || evt.notes || 'Activity logged on this account.'}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="lead-empty-state">
                  <Activity size={36} />
                  <h4>No Recorded Activity History</h4>
                  <p>Account activity events will log here as updates occur.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </section>
    </div>
  );
}

function formatCompanyDate(value) {
  if (!value) return '-';
  try {
    const str = String(value).trim();
    if (!str) return '-';
    const d = new Date(str.includes('T') ? str : `${str}T00:00:00`);
    if (isNaN(d.getTime())) return str;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  } catch (e) {
    return String(value);
  }
}
