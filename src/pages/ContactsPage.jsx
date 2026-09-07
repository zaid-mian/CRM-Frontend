import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Edit3,
  PlusCircle,
  Trash2,
  X,
  Phone,
  Mail,
  Send,
  Building2,
  User,
  Briefcase,
  Clock,
  Activity,
  FileText,
  Calendar,
  MapPin,
  ExternalLink,
  Plus,
  DollarSign,
  MessageSquare,
  Globe,
} from 'lucide-react';
import { contactStatuses, owners } from '../data/crmData';
import { authRequest, apiGet } from '../App';
import { contactBackendToUi, contactUiToBackend, companyBackendToUi, companyUiToBackend } from '../utils/adapters';

const contactColumns = [
  ['contactId', 'Contact ID', 'link-cell'],
  ['date', 'Date'],
  ['contact', 'Contact'],
  ['company', 'Company'],
  ['designation', 'Designation'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['owner', 'Owner'],
  ['status', 'Status'],
];

const dummyContacts = [];

const blankContactForm = {
  contact: '',
  company: '',
  designation: '',
  phone: '',
  email: '',
  whatsapp: '',
  address: '',
  city: '',
  country: '',
  owner: '',
  status: 'Active',
  notes: '',
};

const defaultContactFormFields = [
  { key: 'contact', label: 'Contact Name' },
  { key: 'company', label: 'Company' },
  { key: 'designation', label: 'Designation' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
  { key: 'owner', label: 'Owner', kind: 'select' },
  { key: 'status', label: 'Status', kind: 'select', options: contactStatuses.filter((item) => item !== 'All') },
];

const defaultContactDetailFields = [
  { key: 'contactId', label: 'Contact ID', fallbackKey: 'id' },
  { key: 'contact', label: 'Contact' },
  { key: 'company', label: 'Company' },
  { key: 'designation', label: 'Designation' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
  { key: 'owner', label: 'Owner' },
  { key: 'status', label: 'Status', render: (contact) => <span className={`lf-badge contact-status contact-status--${String(contact.status || '').toLowerCase()}`}>{contact.status || '-'}</span> },
  { key: 'date', label: 'Created Date', render: (contact) => formatContactDate(contact.date) },
];

const dateRangeOptions = ['All', 'Today', 'Last 7 Days', 'This Month', 'Custom Range'];

const defaultContactFilters = [
  { key: 'status', label: 'Status', options: contactStatuses },
  { key: 'owner', label: 'Owner', options: owners },
  { key: 'dateRange', label: 'Date range', type: 'dateRange', options: dateRangeOptions, defaultValue: 'All' },
];

export default function ContactsPage({
  isCompanyPage = false,
  isPipelineRecordsPage = false,
  currentUser,
  contacts = [],
  setContacts,
  setMessage,
  onDetailOpenChange,
  filterTopContent = null,
  pageClassName = '',
  tableColumns = contactColumns,
  showSerialColumn = true,
  addButtonLabel = 'New Contact',
  addButtonIcon: AddButtonIcon = PlusCircle,
  blankFormValue = blankContactForm,
  formFields = defaultContactFormFields,
  formSectionTitle = 'Contact Information',
  addFormTitle = 'Add Contact',
  addFormDescription = 'Create a new contact record.',
  editFormTitle = 'Edit Contact',
  editFormDescription = 'Update this contact record.',
  saveButtonLabel = 'Save Contact',
  updateButtonLabel = 'Save Changes',
  idPrefix = 'CT',
  allowManualId = true,
  formPageClassName = '',
  detailTitle = 'Contact Detail',
  detailAriaLabel = 'Contact details',
  detailFields = defaultContactDetailFields,
  detailExtraContent = null,
  showActivitySections = true,
  filterConfig = defaultContactFilters,
  panelAfterContent = null,
  hideTable = false,
  onAddButtonClick = null,
  actionExtraContent = null,
  customDetailRenderer = null,
  useFallbackRows = true,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) {
  const [localContacts, setLocalContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState([]);

  const [filters, setFilters] = useState(() => buildDefaultFilters(filterConfig));
  const [dateRanges, setDateRanges] = useState({});
  const [addOpen, setAddOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [deletingContact, setDeletingContact] = useState(null);
  const [form, setForm] = useState(blankFormValue);

  const endpointBase = isCompanyPage ? '/api/companies/' : '/api/contacts/';

  // Fetch available salespeople
  const fetchUsers = async () => {
    try {
      const res = await apiGet('/api/admin/users/');
      if (res.success && Array.isArray(res.data)) {
        setAvailableUsers(res.data);
      } else {
        if (currentUser) {
          setAvailableUsers([{ id: currentUser.id, full_name: currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser.username }]);
        }
      }
    } catch (err) {
      if (currentUser) {
        setAvailableUsers([{ id: currentUser.id, full_name: currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser.username }]);
      }
    }
  };

  // Fetch all items (contacts or companies)
  const fetchAllContacts = async () => {
    try {
      setLoading(true);
      let allItems = [];
      let url = `${endpointBase}?page_size=100`;
      while (url) {
        const path = url.includes(endpointBase) ? url.substring(url.indexOf(endpointBase)) : url;
        const res = await apiGet(path);
        if (res.success && res.data) {
          const results = res.data.results || [];
          allItems = [...allItems, ...results];
          url = res.data.pagination?.next || null;
        } else {
          break;
        }
      }
      const mapper = isCompanyPage ? companyBackendToUi : contactBackendToUi;
      const mapped = allItems.map(mapper);
      setLocalContacts(mapped);
      setContacts?.(mapped);
    } catch (err) {
      console.error(err);
      setMessage?.(err.message || `Failed to fetch ${isCompanyPage ? 'companies' : 'contacts'} from server.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPipelineRecordsPage) {
      setLoading(false);
      return;
    }
    fetchUsers();
    fetchAllContacts();
  }, [isCompanyPage, isPipelineRecordsPage]);

  const getOwnerName = (ownerId) => {
    if (!ownerId) return 'Unassigned';
    const found = availableUsers.find(u => String(u.id) === String(ownerId));
    return found ? (found.full_name || found.username) : `User ${ownerId}`;
  };

  // Fetch detailed record
  const fetchContactDetail = async (item) => {
    try {
      const res = await apiGet(`${endpointBase}${item.backendId || item.id}/`);
      if (res.success && res.data) {
        const mapper = isCompanyPage ? companyBackendToUi : contactBackendToUi;
        const detailed = mapper(res.data);
        setSelectedContact(detailed);
      }
    } catch (err) {
      console.error('Failed to retrieve detail:', err);
    }
  };

  const contactRows = isPipelineRecordsPage ? contacts : localContacts;

  const contactSummary = useMemo(() => ({
    total: contactRows.length,
    active: contactRows.filter((item) => item.status === 'Active').length,
    inactive: contactRows.filter((item) => item.status === 'Inactive').length,
    companies: new Set(contactRows.map((item) => item.company).filter(Boolean)).size,
  }), [contactRows]);

  const rows = useMemo(() => contactRows
    .filter((item) => filterConfig.every((filter) => {
      const selected = filters[filter.key];
      if (!selected || (selected === 'All' && filter.type !== 'dateRange') || selected === 'Any Time') return true;
      if (filter.type === 'dateRange') return matchesDateFilter(item.date, selected, dateRanges[filter.key]);
      if (filter.key === 'owner') return getOwnerName(item.owner) === selected;
      return item[filter.field || filter.key] === selected;
    })), [contactRows, filterConfig, filters, dateRanges, availableUsers]);

  const activeFilterCount = Object.values(filters).filter((value) => value !== 'All' && value !== 'Any Time').length;
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const resetFilters = () => {
    setFilters(buildDefaultFilters(filterConfig));
    setDateRanges({});
  };

  const deleteContact = async (item) => {
    if (!item) return;
    try {
      const res = await authRequest(`${endpointBase}${item.backendId || item.id}/`, {
        method: 'DELETE',
      });
      if (res.success) {
        setMessage?.(`${isCompanyPage ? 'Company' : 'Contact'} deleted successfully.`);
        if (selectedContact?.id === item.id) {
          setSelectedContact(null);
          onDetailOpenChange?.(false);
        }
        if (editingContact?.id === item.id) setEditingContact(null);
        setDeletingContact(null);
        fetchAllContacts();
      } else {
        setMessage?.(res.message || `Failed to delete ${isCompanyPage ? 'company' : 'contact'}.`);
        setDeletingContact(null);
      }
    } catch (err) {
      console.error(err);
      setMessage?.(err.message || `Failed to delete ${isCompanyPage ? 'company' : 'contact'}.`);
      setDeletingContact(null);
    }
  };

  const requestDeleteContact = (item) => {
    setDeletingContact(item);
  };

  const openAddContact = () => {
    setForm({ ...blankFormValue, date: blankFormValue.date || new Date().toISOString().slice(0, 10), owner: currentUser?.id || '' });
    setEditingContact(null);
    setSelectedContact(null);
    onDetailOpenChange?.(false);
    setAddOpen(true);
  };

  const openEditContact = (item) => {
    setForm(isCompanyPage ? {
      name: item.name || '',
      type: item.type || 'Prospect',
      rating: item.rating || 'None',
      employees: String(item.employees || ''),
      annualRevenue: String(item.annualRevenue || ''),
      industry: item.industry || 'Other',
      phone: item.phone || '',
      email: item.email || '',
      website: item.website || '',
      date: item.date || '',
      owner: item.owner || currentUser?.id || '',
      billing_address: item.billing_address || item.address || '',
      shipping_address: item.shipping_address || item.address || '',
      description: item.description || '',
    } : {
      contact: item.contact || '',
      company: item.company || '',
      designation: item.designation || '',
      phone: item.phone || '',
      email: item.email || '',
      whatsapp: item.whatsapp || '',
      address: item.address || '',
      city: item.city || '',
      country: item.country || '',
      owner: item.owner || currentUser?.id || '',
      status: item.status || 'Active',
      notes: item.notes || '',
    });
    setEditingContact(item);
    setSelectedContact(null);
    onDetailOpenChange?.(false);
    setAddOpen(false);
  };

  const openContactDetails = (item) => {
    setSelectedContact(item);
    onDetailOpenChange?.(true);
    fetchContactDetail(item);
  };

  const closeContactDetails = () => {
    setSelectedContact(null);
    onDetailOpenChange?.(false);
  };

  const saveContact = async () => {
    try {
      const payload = isCompanyPage ? companyUiToBackend(form) : contactUiToBackend(form);
      const res = await authRequest(endpointBase, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.success) {
        setMessage?.(`${isCompanyPage ? 'Company' : 'Contact'} saved successfully.`);
        setAddOpen(false);
        setForm(blankFormValue);
        fetchAllContacts();
      } else {
        setMessage?.(res.message || `Failed to save ${isCompanyPage ? 'company' : 'contact'}.`);
      }
    } catch (err) {
      console.error(err);
      if (err.data && typeof err.data === 'object') {
        // Expose backend validation messages
        const msgs = Object.entries(err.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' | ');
        setMessage?.(msgs);
      } else {
        setMessage?.(err.message || `Failed to save ${isCompanyPage ? 'company' : 'contact'}.`);
      }
    }
  };

  const saveEditedContact = async () => {
    if (!editingContact) return;
    try {
      const payload = isCompanyPage ? companyUiToBackend(form) : contactUiToBackend(form);
      const res = await authRequest(`${endpointBase}${editingContact.backendId || editingContact.id}/`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res.success) {
        setMessage?.(`${isCompanyPage ? 'Company' : 'Contact'} updated successfully.`);
        setEditingContact(null);
        setForm(blankFormValue);
        fetchAllContacts();
      } else {
        setMessage?.(res.message || `Failed to update ${isCompanyPage ? 'company' : 'contact'}.`);
      }
    } catch (err) {
      console.error(err);
      if (err.data && typeof err.data === 'object') {
        const msgs = Object.entries(err.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' | ');
        setMessage?.(msgs);
      } else {
        setMessage?.(err.message || `Failed to update ${isCompanyPage ? 'company' : 'contact'}.`);
      }
    }
  };

  // Build filter options dynamically using live owners
  const dynamicFilterConfig = useMemo(() => {
    return filterConfig.map(filter => {
      if (filter.key === 'owner') {
        const list = ['All'];
        availableUsers.forEach(u => {
          const name = u.full_name || u.username;
          if (name && !list.includes(name)) list.push(name);
        });
        return { ...filter, options: list };
      }
      return filter;
    });
  }, [filterConfig, availableUsers]);

  if (loading && contactRows.length === 0) {
    return <div className="text-slate-400 p-8 text-center font-semibold animate-pulse">Loading {isCompanyPage ? 'companies' : 'contacts'} from server...</div>;
  }

  if (addOpen) {
    return (
      <ContactFormPage
        title={addFormTitle}
        description={addFormDescription}
        submitLabel={saveButtonLabel}
        sectionTitle={formSectionTitle}
        fields={formFields}
        pageClassName={formPageClassName}
        form={form}
        setForm={setForm}
        onClose={() => { setAddOpen(false); onDetailOpenChange?.(false); }}
        onSubmit={saveContact}
        availableUsers={availableUsers}
        currentUser={currentUser}
        resourceName={isCompanyPage ? 'companies' : 'contacts'}
      />
    );
  }

  if (editingContact) {
    return (
      <ContactFormPage
        title={editFormTitle}
        description={editFormDescription}
        submitLabel={updateButtonLabel}
        sectionTitle={formSectionTitle}
        fields={formFields}
        pageClassName={formPageClassName}
        form={form}
        setForm={setForm}
        onClose={() => { setEditingContact(null); onDetailOpenChange?.(false); }}
        onSubmit={saveEditedContact}
        availableUsers={availableUsers}
        currentUser={currentUser}
        resourceName={isCompanyPage ? 'companies' : 'contacts'}
      />
    );
  }

  if (selectedContact) {
    if (customDetailRenderer) {
      return customDetailRenderer({
        record: selectedContact,
        onBack: closeContactDetails,
        onEdit: () => openEditContact(selectedContact),
        onDelete: () => requestDeleteContact(selectedContact),
        deletingContact,
        onCancelDelete: () => setDeletingContact(null),
        onConfirmDelete: () => deleteContact(deletingContact),
        getOwnerName,
      });
    }

    return (
      <>
        <ContactRecordDetailPage
          contact={selectedContact}
          onBack={closeContactDetails}
          onEdit={() => openEditContact(selectedContact)}
          onDelete={() => requestDeleteContact(selectedContact)}
          canEdit={canEdit}
          canDelete={canDelete}
          getOwnerName={getOwnerName}
        />
        {deletingContact && (
          <ConfirmDeleteContact
            contact={deletingContact}
            onCancel={() => setDeletingContact(null)}
            onConfirm={() => deleteContact(deletingContact)}
            isCompany={isCompanyPage}
          />
        )}
      </>
    );
  }

  return (
    <div className={`lf-page leads-page contacts-page${pageClassName ? ` ${pageClassName}` : ''}`}>
      <section className="lf-table-card sales-table-card">
        <section className="page-panel leads-page-panel">
          {filterTopContent || <ContactSummaryStrip summary={contactSummary} />}
          <section className="page-panel-filters lf-filter-bar" aria-label="Contact filters">
            {dynamicFilterConfig.map((filter) => (
              <ContactFilter
                key={filter.key}
                label={filter.label}
                value={filters[filter.key]}
                options={filter.options}
                type={filter.type}
                range={dateRanges[filter.key] || { from: '', to: '' }}
                onChange={(value) => updateFilter(filter.key, value)}
                onRangeChange={(range) => setDateRanges((current) => ({ ...current, [filter.key]: range }))}
              />
            ))}
            {activeFilterCount > 0 && (
              <button className="lf-clear-filters lf-clear-filters--icon" type="button" aria-label="Clear Filter" title="Clear Filter" onClick={resetFilters}><X size={16} /></button>
            )}
          </section>
          <header className="page-panel-header sales-page-header" aria-label="Contact actions">
            <div className="lf-page-actions lf-page-actions--hero">
              {actionExtraContent}
              {canCreate && <button className="lf-btn lf-btn-primary" onClick={onAddButtonClick || openAddContact}><AddButtonIcon size={17} />{addButtonLabel}</button>}
            </div>
          </header>
        </section>

        {panelAfterContent}

        {!hideTable && <div className="lf-table-scroll">
          <table className="lf-leads-table">
            <thead>
              <tr>
                {showSerialColumn && <th className="lf-sr-col">#</th>}
                {tableColumns.map(([, label]) => <th key={label}>{label}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, rowIndex) => {
                return (
                  <tr key={item.id} className="clickable-row" onClick={() => openContactDetails(item)}>
                    {showSerialColumn && <td className="lf-sr-col">{rowIndex + 1}</td>}
                    {tableColumns.map(([key, , className]) => (
                      <td key={key} className={className || undefined}>
                        {key === 'status'
                          ? <span className={`lf-badge contact-status contact-status--${String(item.status || '').toLowerCase()}`}>{item.status || '-'}</span>
                          : key === 'owner'
                            ? getOwnerName(item.owner)
                            : key === 'annualRevenue' && typeof item[key] === 'number'
                              ? `$${item[key].toLocaleString()}`
                              : item[key] || '-'}
                      </td>
                    ))}
                    <td className="lf-actions-cell">
                      <div className="inline-row-actions">
                        {canEdit && <button type="button" className="inline-action inline-action--edit" aria-label={`Edit ${getContactDisplayName(item)}`} title="Edit" onClick={(event) => { event.stopPropagation(); openEditContact(item); }}><Edit3 size={15} /></button>}
                        {canDelete && <button type="button" className="inline-action inline-action--delete" aria-label={`Delete ${getContactDisplayName(item)}`} title="Delete" onClick={(event) => { event.stopPropagation(); requestDeleteContact(item); }}><Trash2 size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>}
      </section>
      {deletingContact && (
        <ConfirmDeleteContact
          contact={deletingContact}
          onCancel={() => setDeletingContact(null)}
          onConfirm={() => deleteContact(deletingContact)}
          isCompany={isCompanyPage}
        />
      )}
    </div>
  );
}

function ContactSummaryStrip({ summary }) {
  return (
    <section className="crm-summary-strip contact-summary-strip" aria-label="Contact summary">
      <article>
        <span>Total Contacts</span>
        <strong>{summary.total}</strong>
      </article>
      <article>
        <span>Active</span>
        <strong className="contact-summary-blue">{summary.active}</strong>
      </article>
      <article>
        <span>Inactive</span>
        <strong className="contact-summary-red">{summary.inactive}</strong>
      </article>
      <article>
        <span>Companies</span>
        <strong className="contact-summary-green">{summary.companies}</strong>
      </article>
    </section>
  );
}

function ContactFormPage({ title, description, submitLabel, sectionTitle, fields, pageClassName, form, setForm, onClose, onSubmit, availableUsers, currentUser, resourceName }) {
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const userRoleName = typeof currentUser?.role === 'string' 
    ? currentUser.role 
    : (currentUser?.role?.name || '');

  const hasAssignAll = currentUser?.user_type === 'ADMIN' || 
                       currentUser?.is_staff || 
                       currentUser?.is_superuser || 
                       userRoleName === 'Administrator' || 
                       userRoleName === 'Salesperson Manager';

  const displayUsers = hasAssignAll 
    ? availableUsers 
    : (availableUsers.some(u => String(u.id) === String(currentUser?.id)) 
        ? availableUsers.filter(u => String(u.id) === String(currentUser?.id))
        : [{ id: currentUser?.id, full_name: currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser?.username }]);

  return (
    <div className={`lf-page leads-page contacts-page${pageClassName ? ` ${pageClassName}` : ''}`}>
      <section className="lead-form-page contact-form-page">
        <div className="lead-form-page-card">
          <header className="lead-form-page-head">
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <button type="button" className="lead-form-back" aria-label="Back" title="Back" onClick={onClose}><ArrowLeft size={22} /></button>
          </header>
          <form className="lf-lead-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
            <div className="contact-form-section-title">
              <h3>{sectionTitle}</h3>
            </div>
            {fields.map((field) => {
              if (field.key === 'owner') {
                return (
                  <label className="lf-field" key={field.key}>
                    <span>{field.label}</span>
                    <select 
                      value={form[field.key] || ''} 
                      onChange={(e) => setField(field.key, e.target.value)}
                      disabled={!hasAssignAll}
                    >
                      {hasAssignAll && <option value="">Unassigned</option>}
                      {displayUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                      ))}
                    </select>
                  </label>
                );
              }
              return field.kind === 'select'
                ? <ContactFormSelect key={field.key} label={field.label} value={form[field.key] || ''} options={field.options} onChange={(value) => setField(field.key, value)} />
                : <ContactTextInput key={field.key} label={field.label} type={field.type || 'text'} value={form[field.key] || ''} onChange={(value) => setField(field.key, value)} />;
            })}
          </form>
          <div className="lf-modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="button" className="primary" onClick={onSubmit}>{submitLabel}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactTextInput({ label, value, onChange, type = 'text' }) {
  return (
    <label className="lf-field">
      <span>{label}</span>
      {type === 'textarea' ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
      ) : (
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function ContactFormSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filteredOptions = options.filter((option) => String(option).toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <label className="lf-field searchable" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(''); } }}>
      <span>{label}</span>
      <button type="button" className="lf-combo-button" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{value}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="lf-combo-menu">
          <label className="lf-combo-search">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}...`} autoFocus />
          </label>
          <div role="listbox">
            {filteredOptions.length > 0 ? filteredOptions.map((option) => (
              <button type="button" key={option} className={option === value ? 'selected' : ''} onClick={() => { onChange(option); setQuery(''); setOpen(false); }}>{option}</button>
            )) : <p>No results</p>}
          </div>
        </div>
      )}
    </label>
  );
}

function ContactRecordDetailPage({
  contact,
  onBack,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  getOwnerName,
  onToast,
}) {
  if (!contact) return null;

  const [activeTab, setActiveTab] = useState('overview');
  const [sessionNotes, setSessionNotes] = useState(() => {
    return contact.notes ? [{ id: 1, text: contact.notes, author: getOwnerName ? getOwnerName(contact.owner) : (contact.ownerName || 'System'), date: contact.date || 'Initial' }] : [];
  });
  const [newNoteText, setNewNoteText] = useState('');

  // Avatar Initials
  const initials = useMemo(() => {
    const name = (contact.contact || contact.full_name || 'Contact').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'CT';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [contact.contact, contact.full_name]);

  // Phone & WhatsApp clean links
  const rawPhone = String(contact.phone || '').trim();
  const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
  const rawWA = String(contact.whatsapp || contact.phone || '').trim();
  const cleanWA = rawWA.replace(/[^0-9+]/g, '').replace(/^\+/, '');

  // Add Session Note
  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const noteObj = {
      id: Date.now(),
      text: newNoteText.trim(),
      author: getOwnerName ? getOwnerName(contact.owner) : (contact.ownerName || 'Current Rep'),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    setSessionNotes(prev => [noteObj, ...prev]);
    setNewNoteText('');
    onToast?.('Note saved successfully.');
  };

  // Activity Timeline Events
  const timelineEvents = useMemo(() => {
    if (Array.isArray(contact.activities) && contact.activities.length > 0) {
      return contact.activities;
    }
    const events = [];
    if (contact.date) {
      events.push({
        id: 'evt-created',
        title: 'Contact Created',
        description: `Contact record created and assigned to ${getOwnerName ? getOwnerName(contact.owner) : (contact.ownerName || 'Salesperson')}.`,
        date: formatContactDate(contact.date),
        type: 'CREATED',
        icon: User
      });
    }

    if (contact.updatedAt && contact.updatedAt !== contact.date) {
      events.push({
        id: 'evt-updated',
        title: 'Contact Updated',
        description: `Status: ${contact.status || 'Active'}.`,
        date: formatContactDate(contact.updatedAt),
        type: 'UPDATE',
        icon: Edit3
      });
    }

    if (Array.isArray(contact.related_opportunities) && contact.related_opportunities.length > 0) {
      events.push({
        id: 'evt-opps',
        title: 'Linked to Deals',
        description: `Associated with ${contact.related_opportunities.length} active opportunity record(s).`,
        date: 'Active Link',
        type: 'OPPORTUNITY',
        icon: Briefcase
      });
    }

    return events;
  }, [contact, getOwnerName]);

  const ownerDisplayName = getOwnerName ? getOwnerName(contact.owner) : (contact.ownerName || contact.owner || 'Unassigned');

  // Related Deals array
  const relatedOpps = Array.isArray(contact.related_opportunities) ? contact.related_opportunities : [];

  return (
    <div className="lf-page leads-page contact-record-page">
      <section className="payment-record-detail contact-record-detail lead-details-redesign" aria-label="Contact details">
        {/* ── HERO HEADER ── */}
        <header className="lead-drawer-hero">
          <div className="lead-hero-left">
            <button type="button" className="lead-hero-back-btn" aria-label="Back" title="Back" onClick={onBack}>
              <ArrowLeft size={20} />
            </button>

            <div className="lead-avatar-circle contact-avatar-gradient">
              <span>{initials}</span>
            </div>

            <div className="lead-hero-title-block">
              <div className="lead-hero-title-row">
                <h2>{contact.contact || contact.full_name || 'Contact Detail'}</h2>
                <span className={`lead-status-pill ${String(contact.status || '').toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {contact.status || 'Active'}
                </span>
                <span className="lead-code-pill">
                  {contact.contactId || contact.clientId || contact.id}
                </span>
              </div>

              <p className="lead-hero-subtitle">
                {contact.designation ? (
                  <>
                    <strong>{contact.designation}</strong>
                    <span className="mx-2">•</span>
                  </>
                ) : null}
                {contact.company ? (
                  <>
                    <Building2 size={14} className="inline-icon mr-1" />
                    {contact.company}
                  </>
                ) : 'Individual Contact'}
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
            href={contact.email ? `mailto:${contact.email}` : undefined}
            className={`lead-comm-btn ${contact.email ? 'active' : 'disabled'}`}
            title={contact.email ? `Email ${contact.email}` : 'No email address available'}
            onClick={(e) => !contact.email && e.preventDefault()}
          >
            <Mail size={14} /> Email
          </a>

          <a
            href={cleanWA ? `https://wa.me/${cleanWA}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`lead-comm-btn whatsapp ${cleanWA ? 'active' : 'disabled'}`}
            title={cleanWA ? `WhatsApp ${rawWA}` : 'No phone / WhatsApp number available'}
            onClick={(e) => !cleanWA && e.preventDefault()}
          >
            <Send size={14} /> WhatsApp
          </a>
        </div>

        {/* ── TABBED NAVIGATION ── */}
        <nav className="lead-tabs-nav">
          <button
            type="button"
            className={`lead-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <User size={15} /> Profile & Details
          </button>

          <button
            type="button"
            className={`lead-tab-btn ${activeTab === 'opportunities' ? 'active' : ''}`}
            onClick={() => setActiveTab('opportunities')}
          >
            <Briefcase size={15} /> Linked Deals
            {relatedOpps.length > 0 && <span className="tab-count-badge">{relatedOpps.length}</span>}
          </button>

          <button
            type="button"
            className={`lead-tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
            onClick={() => setActiveTab('activities')}
          >
            <Activity size={15} /> Activities & Notes
            {sessionNotes.length > 0 && <span className="tab-count-badge">{sessionNotes.length}</span>}
          </button>
        </nav>

        {/* ── TAB CONTENT ── */}
        <div className="lead-tab-content-container">

          {/* TAB 1: OVERVIEW & PROFILE */}
          {activeTab === 'overview' && (
            <div className="lead-tab-panel overview-panel">
              {/* Summary Strip */}
              <section className="payment-record-summary lead-redesign-summary" aria-label="Contact summary">
                <div>
                  <span>Contact ID</span>
                  <strong>{contact.contactId || contact.id || '-'}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{contact.status || 'Active'}</strong>
                </div>
                <div>
                  <span>Assigned Owner</span>
                  <strong>{ownerDisplayName}</strong>
                </div>
                <div>
                  <span>Created Date</span>
                  <strong>{formatContactDate(contact.date)}</strong>
                </div>
              </section>

              <div className="lead-overview-cards-grid">
                {/* Contact Details Card (Premium Redesign) */}
                <section className="lead-card-box payment-parameters-card">
                  <header className="lead-card-box-head">
                    <User size={16} className="text-cyan-600" />
                    <h3>Contact Details</h3>
                  </header>
                  <div className="payment-param-grid">
                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-cyan-50 text-cyan-600">
                        <User size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Full Name</span>
                        <strong className="payment-param-value">{contact.contact || contact.full_name || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-indigo-50 text-indigo-600">
                        <Briefcase size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Designation / Title</span>
                        <strong className="payment-param-value">{contact.designation || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-emerald-50 text-emerald-600">
                        <Phone size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Phone Number</span>
                        <strong className="payment-param-value font-mono">{contact.phone || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-sky-50 text-sky-600">
                        <Mail size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Email Address</span>
                        <strong className="payment-param-value text-sky-700">{contact.email || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-emerald-50 text-emerald-600">
                        <MessageSquare size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">WhatsApp</span>
                        <strong className="payment-param-value font-mono">{contact.whatsapp || contact.phone || '-'}</strong>
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

                {/* Company & Address Details Card (Premium Redesign) */}
                <section className="lead-card-box payment-parameters-card">
                  <header className="lead-card-box-head">
                    <MapPin size={16} className="text-indigo-600" />
                    <h3>Company & Address Details</h3>
                  </header>
                  <div className="payment-param-grid">
                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-purple-50 text-purple-600">
                        <Building2 size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Company</span>
                        <strong className="payment-param-value">{contact.company || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-amber-50 text-amber-600">
                        <MapPin size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Street Address</span>
                        <strong className="payment-param-value">{contact.address || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-sky-50 text-sky-600">
                        <Building2 size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">City</span>
                        <strong className="payment-param-value">{contact.city || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-emerald-50 text-emerald-600">
                        <Globe size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Country</span>
                        <strong className="payment-param-value">{contact.country || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-blue-50 text-blue-600">
                        <Building2 size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Organization</span>
                        <strong className="payment-param-value">{contact.organization || '-'}</strong>
                      </div>
                    </div>

                    <div className="payment-param-item">
                      <div className="payment-param-icon bg-slate-100 text-slate-600">
                        <Activity size={15} />
                      </div>
                      <div className="payment-param-text">
                        <span className="payment-param-label">Status</span>
                        <strong className="payment-param-value">{contact.status || 'Active'}</strong>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* TAB 2: RELATED OPPORTUNITIES */}
          {activeTab === 'opportunities' && (
            <div className="lead-tab-panel opps-panel">
              {relatedOpps.length > 0 ? (
                <div className="contact-related-table-wrap">
                  <table className="contact-related-table">
                    <thead>
                      <tr>
                        <th>Deal Code</th>
                        <th>Opportunity Name</th>
                        <th>Stage</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatedOpps.map((opp) => (
                        <tr key={opp.id || opp.opportunity_code || opp.name}>
                          <td><span className="font-mono text-xs font-bold text-indigo-600">{opp.opportunity_code || `OP-${opp.id}`}</span></td>
                          <td><strong>{opp.name}</strong></td>
                          <td><span className="lead-status-pill bg-indigo-50 text-indigo-700 border-indigo-200">{opp.stage || 'Active'}</span></td>
                          <td><strong>{opp.amount || opp.value ? `$${Number(opp.amount || opp.value).toLocaleString()}` : '-'}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="lead-empty-state">
                  <Briefcase size={36} />
                  <h4>No Linked Opportunities Found</h4>
                  <p>When opportunities are created for this contact, they will automatically appear here.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACTIVITIES & NOTES */}
          {activeTab === 'activities' && (
            <div className="lead-tab-panel activities-panel">
              {/* Note Composer */}
              <form onSubmit={handleAddNote} className="lead-note-composer">
                <h4>Add Sales Note</h4>
                <textarea
                  placeholder="Record call summary or rep notes for this contact..."
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
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Activity Timeline</h4>
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
                            <h4>{evt.title || evt.action || 'Contact Event'}</h4>
                            <span className="lead-timeline-date">{evt.date || 'Recent'}</span>
                          </header>
                          <p className="lead-timeline-desc">{evt.description || evt.notes || 'Activity logged on this contact.'}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="lead-empty-state">
                  <Activity size={36} />
                  <h4>No Recorded Activity History</h4>
                  <p>Activity events will be logged here as updates occur.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </section>
    </div>
  );
}

function ContactDetail({ label, value }) {
  return (
    <div className="lf-detail-item">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function ConfirmDeleteContact({ contact, onCancel, onConfirm, isCompany = false }) {
  return (
    <div className="lf-modal-backdrop" role="presentation">
      <section className="lf-modal" role="dialog" aria-modal="true" aria-labelledby="lf-modal-title">
        <div className="lf-modal-head">
          <div>
            <h2 id="lf-modal-title">Delete this {isCompany ? 'company' : 'contact'}?</h2>
            <p>Delete {getContactDisplayName(contact)}? This action cannot be undone.</p>
          </div>
          <button aria-label="Close modal" onClick={onCancel}><X size={18}/></button>
        </div>
        <div className="lf-modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button className="danger" onClick={onConfirm}>Delete {isCompany ? 'Company' : 'Contact'}</button>
        </div>
      </section>
    </div>
  );
}

function buildDefaultFilters(config) {
  return config.reduce((filters, filter) => ({
    ...filters,
    [filter.key]: filter.defaultValue || 'All',
  }), {});
}

function matchesDateFilter(dateText, preset, customRange) {
  if (!dateText) return false;
  const date = new Date(`${dateText}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preset === 'Today') {
    return date.getTime() === today.getTime();
  }
  if (preset === 'Last 7 Days') {
    const limit = new Date(today);
    limit.setDate(limit.getDate() - 7);
    return date >= limit && date <= today;
  }
  if (preset === 'This Month') {
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  }
  if (preset === 'Custom Range') {
    if (customRange?.from && new Date(`${customRange.from}T00:00:00`) > date) return false;
    if (customRange?.to && new Date(`${customRange.to}T00:00:00`) < date) return false;
    return true;
  }
  return true;
}

function ContactFilter({ label, value, options, type, range, onChange, onRangeChange }) {
  const [open, setOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);

  const displayLabel = type === 'dateRange' && value === 'Custom Range' && (range.from || range.to)
    ? `${range.from || 'From'} to ${range.to || 'To'}`
    : value;

  return (
    <div className="lf-select-field searchable date-range-filter" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setRangeOpen(false); } }}>
      <span>{label}</span>
      <button type="button" className="lf-combo-button" onClick={() => setOpen((current) => !current)} aria-haspopup={type === 'dateRange' ? 'dialog' : 'listbox'} aria-expanded={open}>
        <span>{label}: {displayLabel}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="lf-combo-menu lf-date-menu">
          <div className="lf-date-presets" role="listbox">
            {options.map((option) => (
              <button
                type="button"
                key={option}
                role="option"
                aria-selected={option === value}
                className={option === value ? 'selected' : ''}
                onClick={() => {
                  onChange(option);
                  if (type === 'dateRange' && option === 'Custom Range') {
                    setOpen(false);
                    setRangeOpen(true);
                  } else {
                    setRangeOpen(false);
                    setOpen(false);
                  }
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
      {rangeOpen && (
        <div className="lf-date-range-popover">
          <div className="lf-date-range-fields">
            <label><span>From</span><input type="date" value={range.from} onChange={(event) => onRangeChange({ ...range, from: event.target.value })} /></label>
            <label><span>To</span><input type="date" value={range.to} onChange={(event) => onRangeChange({ ...range, to: event.target.value })} /></label>
          </div>
          <div className="lf-date-actions">
            <button type="button" onClick={() => { onRangeChange({ from: '', to: '' }); onChange('All'); setOpen(false); setRangeOpen(false); }}>Clear</button>
            <button type="button" className="selected" onClick={() => { setOpen(false); setRangeOpen(false); }}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}

function getContactDisplayName(contact) {
  return contact.name || contact.contact || 'Unnamed Record';
}

function formatContactDate(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
  } catch (e) {
    return value;
  }
}
