import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarDays,
  Check,
  ArrowLeft,
  ChevronDown,
  Columns3,
  Download,
  Edit3,
  Eye,
  FileText,
  Mail,
  Phone,
  PlusCircle,
  Search,
  Trash2,
  User,
  UserPlus,
  X,
  Building2,
  ExternalLink,
  Clock,
  Calendar,
  CheckSquare,
  Plus,
  Send,
  MessageSquare,
  DollarSign,
  Activity,
  Sparkles,
  Globe,
  Tag,
  Briefcase,
  Target,
  Users,
} from 'lucide-react';
import {
  defaultLeadColumns,
  leadColumns,
  leadDateOptions,
  leadOwnerOptions,
  leadPriorityOptions,
  leadSourceOptions,
  leadStatusOptions,
} from '../data/leads';
import { companyTypes } from '../data/crmData';
import { authRequest, apiGet } from '../App';
import { leadBackendToUi, leadUiToBackend } from '../utils/adapters';

const priorityRank = { Urgent: 1, High: 2, Medium: 3, Low: 4 };
const statusRank = { New: 1, Contacted: 2, Qualified: 3, 'Proposal Sent': 4, Negotiation: 5, Converted: 6, Lost: 7 };
const salesTableColumns = [
  { key: 'clientId', label: 'Lead ID', sortable: true },
  { key: 'createdDate', label: 'Date', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'company', label: 'Company', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'source', label: 'Source' },
  { key: 'owner', label: 'Owner', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

const blankLeadForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  companyType: 'Prospect',
  companyEmployees: '',
  companyAnnualRevenue: '',
  companyIndustry: '',
  companyPhone: '',
  companyEmail: '',
  companyOwner: '',
  jobTitle: '',
  source: 'Website',
  owner: '',
  priority: 'Medium',
  status: 'New',
  createdDate: '',
  estimatedValue: '',
  expectedCloseDate: '',
  notes: '',
  pipeline: '',
  contactAttempts: 0,
  lastContactDate: '',
};

export default function LeadsPage({
  currentUser,
  setLeads,
  setContacts,
  setCompanies,
  setMessage,
  onDetailOpenChange,
  globalSearch = '',
  detailRequestId = '',
  onDetailRequestHandled,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) {
  const [leads, setLocalLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [lostModalLead, setLostModalLead] = useState(null);
  const [pipelinesList, setPipelinesList] = useState([]);

  const [filters, setFilters] = useState({
    status: 'All Statuses',
    owner: 'All Owners',
    priority: 'All Priorities',
    source: 'All Sources',
    dateRange: 'Any Time',
  });
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [visibleColumns, setVisibleColumns] = useState(defaultLeadColumns);
  const [draftColumns, setDraftColumns] = useState(defaultLeadColumns);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [detailsLead, setDetailsLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [deletingLead, setDeletingLead] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(blankLeadForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

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

  // Fetch all leads by traversing paginated results
  const fetchAllLeads = async () => {
    try {
      setLoading(true);
      let allLeads = [];
      let url = '/api/leads/?page_size=100';
      while (url) {
        const path = url.includes('/api/leads/') ? url.substring(url.indexOf('/api/leads/')) : url;
        const res = await apiGet(path);
        if (res.success && res.data) {
          const results = res.data.results || [];
          allLeads = [...allLeads, ...results];
          url = res.data.pagination?.next || null;
        } else {
          break;
        }
      }
      const mapped = allLeads.map(leadBackendToUi);
      setLocalLeads(mapped);
      setLeads?.(mapped);
    } catch (err) {
      console.error(err);
      setMessage?.(err.message || 'Failed to fetch leads from backend.');
    } finally {
      setLoading(false);
    }
  };

  // Resolve user ID to display name
  const getOwnerName = (ownerId) => {
    if (!ownerId) return 'Unassigned';
    const found = availableUsers.find(u => String(u.id) === String(ownerId));
    return found ? (found.full_name || found.username) : `User ${ownerId}`;
  };

  // Load detailed lead object on demand
  const fetchLeadDetail = async (lead) => {
    try {
      const res = await apiGet(`/api/leads/${lead.backendId || lead.id}/`);
      if (res.success && res.data) {
        const detailed = leadBackendToUi(res.data);
        setDetailsLead(detailed);
      }
    } catch (err) {
      console.error('Failed to retrieve lead details:', err);
    }
  };

  const fetchPipelines = async () => {
    try {
      const res = await apiGet('/api/pipelines/');
      if (Array.isArray(res)) {
        setPipelinesList(res);
      } else if (res.success && Array.isArray(res.data)) {
        setPipelinesList(res.data);
      } else if (res.data && Array.isArray(res.data.results)) {
        setPipelinesList(res.data.results);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAllLeads();
    fetchPipelines();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setColumnsOpen(false);
      setExportOpen(false);
      setDetailsLead(null);
      setDeletingLead(null);
      closeForm();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    onDetailOpenChange?.(Boolean(detailsLead));
    return () => onDetailOpenChange?.(false);
  }, [detailsLead, onDetailOpenChange]);

  useEffect(() => {
    if (!detailRequestId) return;
    const requestedLead = leads.find((lead) => lead.id === detailRequestId || lead.clientId === detailRequestId);
    if (requestedLead) {
      setDetailsLead(requestedLead);
      fetchLeadDetail(requestedLead);
    }
    onDetailRequestHandled?.();
  }, [detailRequestId, leads, onDetailRequestHandled]);

  const showToast = (text) => setMessage?.(text);

  const filteredLeads = useMemo(() => {
    const searchTerm = globalSearch.trim().toLowerCase();
    return leads
      .filter((lead) => {
        if (!searchTerm) return true;
        const ownerName = getOwnerName(lead.owner);
        return [lead.clientId, lead.customer, lead.company, lead.phone, lead.source, ownerName, lead.priority, lead.status]
          .some((value) => String(value || '').toLowerCase().includes(searchTerm));
      })
      .filter((lead) => filters.status === 'All Statuses' || lead.status === filters.status)
      .filter((lead) => {
        if (filters.owner === 'All Owners') return true;
        return getOwnerName(lead.owner) === filters.owner;
      })
      .filter((lead) => filters.priority === 'All Priorities' || lead.priority === filters.priority)
      .filter((lead) => filters.source === 'All Sources' || lead.source === filters.source)
      .filter((lead) => {
        if (filters.dateRange !== 'Custom Range') return true;
        if (dateRange.from && lead.createdDate < dateRange.from) return false;
        if (dateRange.to && lead.createdDate > dateRange.to) return false;
        return true;
      })
      .sort((a, b) => compareLeads(a, b, sortBy, sortDirection));
  }, [dateRange, filters, globalSearch, leads, sortBy, sortDirection, availableUsers]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = filteredLeads.slice(pageStart, pageStart + rowsPerPage);
  const leadSummary = useMemo(() => ({
    total: leads.length,
    new: leads.filter((lead) => lead.status === 'New').length,
    qualified: leads.filter((lead) => lead.status === 'Qualified' || lead.status === 'Proposal Sent' || lead.status === 'Negotiation').length,
    converted: leads.filter((lead) => lead.status === 'Converted').length,
    lost: leads.filter((lead) => lead.status === 'Lost').length,
  }), [leads]);

  const activeFilterCount = Object.values(filters).filter((value) => !String(value).startsWith('All') && value !== 'Any Time').length;
  const displayColumns = salesTableColumns;
  const hasEmailHidden = false;

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    setSortBy((current) => {
      if (current === key) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
        return current;
      }
      setSortDirection('asc');
      return key;
    });
  };

  const resetFilters = () => {
    setFilters({ status: 'All Statuses', owner: 'All Owners', priority: 'All Priorities', source: 'All Sources', dateRange: 'Any Time' });
    setDateRange({ from: '', to: '' });
    setCurrentPage(1);
  };

  const toggleVisible = (checked) => {
    const ids = pageRows.map((lead) => lead.id);
    setSelectedIds((current) => checked ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id)));
  };

  const toggleColumn = (key) => {
    setDraftColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const openAdd = () => {
    setEditingLead(null);
    setForm({ ...blankLeadForm, createdDate: new Date().toISOString().slice(0, 10), owner: currentUser?.id || '' });
    setErrors({});
    setAddOpen(true);
  };

  const openEdit = (lead) => {
    const [firstName = '', ...rest] = (lead.customer || '').split(' ');
    setEditingLead(lead);
    setForm({
      firstName,
      lastName: rest.join(' '),
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      companyType: lead.companyType || 'Prospect',
      companyEmployees: String(lead.companyEmployees || ''),
      companyAnnualRevenue: String(lead.companyAnnualRevenue || ''),
      companyIndustry: lead.companyIndustry || lead.industry || '',
      companyPhone: lead.companyPhone || lead.phone || '',
      companyEmail: lead.companyEmail || lead.email || '',
      companyOwner: lead.companyOwner || lead.owner || '',
      jobTitle: lead.jobTitle || '',
      source: lead.source,
      owner: lead.owner || '',
      priority: lead.priority,
      status: lead.status,
      createdDate: lead.createdDate,
      estimatedValue: String(lead.estimatedValue || 0),
      expectedCloseDate: lead.expectedCloseDate || '',
      notes: lead.notes || '',
      pipeline: lead.pipeline || '',
      contactAttempts: lead.contactAttempts || 0,
      lastContactDate: lead.lastContactDate || '',
    });
    setErrors({});
    setAddOpen(true);
  };

  const closeForm = () => {
    setAddOpen(false);
    setEditingLead(null);
    setSaving(false);
  };

  const submitLead = async (mode = 'final') => {
    const nextErrors = validateLeadForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      const customer = `${form.firstName.trim()} ${form.lastName.trim()}`;
      const uiModel = {
        ...form,
        customer,
        status: mode === 'draft' ? 'New' : form.status,
      };
      const payload = leadUiToBackend(uiModel);

      let res;
      if (editingLead) {
        res = await authRequest(`/api/leads/${editingLead.backendId || editingLead.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await authRequest('/api/leads/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.success) {
        showToast(editingLead ? 'Lead updated successfully' : 'Lead created successfully');
        closeForm();
        fetchAllLeads();
      } else {
        setMessage?.(res.message || 'Failed to save lead.');
      }
    } catch (err) {
      console.error(err);
      if (err.data && typeof err.data === 'object') {
        const valErrors = {};
        for (const [key, msg] of Object.entries(err.data)) {
          valErrors[key] = Array.isArray(msg) ? msg[0] : msg;
        }
        setErrors(valErrors);
      } else {
        setMessage?.(err.message || 'An error occurred while saving the lead.');
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteLead = async () => {
    if (!deletingLead) return;
    try {
      const res = await authRequest(`/api/leads/${deletingLead.backendId || deletingLead.id}/`, {
        method: 'DELETE',
      });
      // Backend does not expose Delete on ViewSet, handles Method Not Allowed
      if (res.success) {
        showToast('Lead deleted successfully');
        setDeletingLead(null);
        fetchAllLeads();
      } else {
        setMessage?.(res.message || 'Deleting leads is not permitted on this server.');
        setDeletingLead(null);
      }
    } catch (err) {
      console.error(err);
      setMessage?.(err.message || 'Deleting leads is not permitted on this server.');
      setDeletingLead(null);
    }
  };

  // Convert Lead Custom Action
  const handleConvertLead = async (lead) => {
    try {
      const res = await authRequest(`/api/leads/${lead.backendId || lead.id}/convert/`, {
        method: 'POST',
        body: JSON.stringify({ opp_data: {} }),
      });
      if (res.success) {
        showToast('Lead converted successfully');
        setDetailsLead(null);
        fetchAllLeads();
      } else {
        setMessage?.(res.message || 'Failed to convert lead.');
      }
    } catch (err) {
      console.error(err);
      setMessage?.(err.message || 'Failed to convert lead.');
    }
  };

  // Mark Lost Custom Action
  const handleMarkLost = async (lead, reason, notes) => {
    try {
      const res = await authRequest(`/api/leads/${lead.backendId || lead.id}/lost/`, {
        method: 'POST',
        body: JSON.stringify({
          lost_reason: reason,
          lost_notes: notes,
        }),
      });
      if (res.success) {
        showToast('Lead marked lost successfully');
        setDetailsLead(null);
        fetchAllLeads();
      } else {
        setMessage?.(res.message || 'Failed to mark lead as lost.');
      }
    } catch (err) {
      console.error(err);
      setMessage?.(err.message || 'Failed to mark lead as lost.');
    }
  };

  const runExport = (scope, format) => {
    setExportOpen(false);
    showToast(`Export started: ${scope} as ${format}`);
  };

  const dynamicOwnersList = useMemo(() => {
    const list = ['All Owners'];
    availableUsers.forEach(u => {
      const name = u.full_name || u.username;
      if (name && !list.includes(name)) list.push(name);
    });
    return list;
  }, [availableUsers]);

  if (loading && leads.length === 0) {
    return <div className="text-slate-400 p-8 text-center font-semibold animate-pulse">Loading leads from server...</div>;
  }

  return (
    <div className="lf-page leads-page salesforce-leads">
      {!addOpen && !detailsLead && selectedIds.length > 0 && (
        <section className="lf-bulk-bar" aria-live="polite">
          <strong>{selectedIds.length} selected</strong>
          <button onClick={() => showToast('Lead assigned successfully')}><UserPlus size={15} />Assign Owner</button>
          <button onClick={() => showToast('Status changed successfully')}><Check size={15} />Change Status</button>
          <button onClick={() => runExport('selected records', 'CSV')}><Download size={15} />Export</button>
          <button className="danger" onClick={() => showToast('Unable to complete the action')}><Trash2 size={15} />Delete</button>
          <button onClick={() => setSelectedIds([])}><X size={15} />Clear Selection</button>
        </section>
      )}

      {!addOpen && !detailsLead && (
        <section className="lf-table-card sales-table-card">
          <PagePanel>
            <LeadSummaryStrip summary={leadSummary} />
            <PageFilters
              filters={filters}
              dateRange={dateRange}
              activeFilterCount={activeFilterCount}
              updateFilter={updateFilter}
              setDateRange={setDateRange}
              resetFilters={resetFilters}
              owners={dynamicOwnersList}
            />
            {canCreate && (
              <PageHeader
                onAdd={openAdd}
              />
            )}
          </PagePanel>
          <div className="lf-table-scroll">
            <table className="lf-leads-table">
              <thead>
                <tr>
                  <th className="lf-sr-col">
                    <input
                      type="checkbox"
                      checked={pageRows.length > 0 && pageRows.every(lead => selectedIds.includes(lead.id))}
                      onChange={(e) => toggleVisible(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </th>
                  {displayColumns.map((column) => (
                    <th key={column.key}>
                      {column.sortable ? (
                        <button className="lf-sort-btn" onClick={() => handleSort(column.key)}>
                          {column.label}<span>{sortBy === column.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
                        </button>
                      ) : column.label}
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((lead, rowIndex) => {
                  return (
                    <tr key={lead.id} className={selectedIds.includes(lead.id) ? 'selected' : ''} onClick={() => { setDetailsLead(lead); fetchLeadDetail(lead); }}>
                      <td className="lf-sr-col" onClick={(e) => { e.stopPropagation(); setSelectedIds(curr => curr.includes(lead.id) ? curr.filter(id => id !== lead.id) : [...curr, lead.id]); }}>
                        <input type="checkbox" checked={selectedIds.includes(lead.id)} readOnly />
                      </td>
                      {displayColumns.map((column) => (
                        <td key={column.key}>{renderLeadCell(lead, column.key, { onDetails: (l) => { setDetailsLead(l); fetchLeadDetail(l); }, emailHidden: hasEmailHidden, query: globalSearch, getOwnerName })}</td>
                      ))}
                      <td className="lf-actions-cell">
                        <div className="inline-row-actions" onClick={(event) => event.stopPropagation()}>
                          {canEdit && <button type="button" className="inline-action inline-action--edit" aria-label={`Edit ${lead.customer}`} title="Edit" onClick={() => openEdit(lead)}><Edit3 size={15} /></button>}
                          {canDelete && <button type="button" className="inline-action inline-action--delete" aria-label={`Delete ${lead.customer}`} title="Delete" onClick={() => setDeletingLead(lead)}><Trash2 size={15} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredLeads.length === 0 && (
              <div className="lf-empty-state">
                <h3>No leads found</h3>
                <p>Try adjusting your search or filters, or create your first lead.</p>
                <button onClick={resetFilters}>Clear Filters</button>
                {canCreate && <button className="primary" onClick={openAdd}>Add New Lead</button>}
              </div>
            )}
          </div>

        </section>
      )}

      {addOpen && (
        <AddLeadModal
          form={form}
          setForm={setForm}
          errors={errors}
          saving={saving}
          editing={Boolean(editingLead)}
          onClose={closeForm}
          onDraft={() => submitLead('draft')}
          onSubmit={() => submitLead('final')}
          availableUsers={availableUsers}
          pipelinesList={pipelinesList}
          currentUser={currentUser}
        />
      )}

      {!addOpen && detailsLead && (
        <LeadDetailsDrawer
          lead={detailsLead}
          onClose={() => setDetailsLead(null)}
          onEdit={() => { openEdit(detailsLead); setDetailsLead(null); }}
          onConvert={() => handleConvertLead(detailsLead)}
          onMarkLost={() => setLostModalLead(detailsLead)}
          onToast={showToast}
          canEdit={canEdit}
          getOwnerName={getOwnerName}
        />
      )}

      {!addOpen && columnsOpen && (
        <ColumnSelector draftColumns={draftColumns} setDraftColumns={setDraftColumns} toggleColumn={toggleColumn} onClose={() => setColumnsOpen(false)} onApply={() => { setVisibleColumns([...new Set([...draftColumns, 'customer'])]); setColumnsOpen(false); }} />
      )}
      {!addOpen && deletingLead && <ConfirmDelete lead={deletingLead} onCancel={() => setDeletingLead(null)} onConfirm={deleteLead} />}

      {lostModalLead && (
        <LostReasonModal
          onCancel={() => setLostModalLead(null)}
          onConfirm={async (reason, notes) => {
            await handleMarkLost(lostModalLead, reason, notes);
            setLostModalLead(null);
          }}
        />
      )}
    </div>
  );
}

function PagePanel({ children }) {
  return <section className="page-panel leads-page-panel">{children}</section>;
}

function Divider() {
  return <div className="page-panel-divider" role="presentation" />;
}

function LeadSummaryStrip({ summary }) {
  return (
    <section className="crm-summary-strip lead-summary-strip" aria-label="Lead summary">
      <article>
        <span>Total Leads</span>
        <strong>{summary.total}</strong>
      </article>
      <article>
        <span>New</span>
        <strong className="lead-summary-blue">{summary.new}</strong>
      </article>
      <article>
        <span>Qualified</span>
        <strong className="lead-summary-orange">{summary.qualified}</strong>
      </article>
      <article>
        <span>Converted</span>
        <strong className="lead-summary-green">{summary.converted}</strong>
      </article>
      <article>
        <span>Lost</span>
        <strong className="lead-summary-red">{summary.lost}</strong>
      </article>
    </section>
  );
}

function PageHeader({ onAdd }) {
  return (
    <header className="page-panel-header sales-page-header" aria-label="Sales page header">
      <div className="lf-page-actions lf-page-actions--hero">
        <button className="lf-btn lf-btn-primary" onClick={onAdd}><PlusCircle size={17} />New Lead</button>
      </div>
    </header>
  );
}

function PageFilters({ filters, dateRange, activeFilterCount, updateFilter, setDateRange, resetFilters, owners }) {
  return (
    <section className="page-panel-filters lf-filter-bar" aria-label="Lead search and filters">
      <FilterSelect label="Status" value={filters.status} options={leadStatusOptions} onChange={(value) => updateFilter('status', value)} />
      <FilterSelect label="Owner" value={filters.owner} options={owners} onChange={(value) => updateFilter('owner', value)} />
      <DateRangeFilter value={filters.dateRange} range={dateRange} onPresetChange={(value) => updateFilter('dateRange', value)} onRangeChange={(nextRange) => { setDateRange(nextRange); updateFilter('dateRange', 'Custom Range'); }} />
      {activeFilterCount > 0 && (
        <button className="lf-clear-filters lf-clear-filters--icon" type="button" aria-label="Clear Filter" title="Clear Filter" onClick={resetFilters}><X size={16} /></button>
      )}
    </section>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return <SearchableSelect className="lf-select-field" label={label} value={value} options={options} onChange={onChange} />;
}

function SearchableSelect({ label, value, options, onChange, className = 'lf-field', showInlineLabel = true }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const visibleOptions = options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()));

  const choose = (option) => {
    onChange(option);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className={`${className} searchable`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <span>{label}</span>
      <button type="button" className="lf-combo-button" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{showInlineLabel ? `${label}: ${value}` : value}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="lf-combo-menu">
          <label className="lf-combo-search">
            <Search size={14} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}...`} autoFocus />
          </label>
          <div role="listbox">
            {visibleOptions.length > 0 ? visibleOptions.map((option) => (
              <button type="button" key={option} className={option === value ? 'selected' : ''} onClick={() => choose(option)}>{option}</button>
            )) : <p>No results</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function DateRangeFilter({ value, range, onPresetChange, onRangeChange }) {
  const [open, setOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const label = value === 'Custom Range' && (range.from || range.to) ? `${range.from || 'From'} to ${range.to || 'To'}` : value;
  return (
    <div className="lf-select-field searchable date-range-filter" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setRangeOpen(false); } }}>
      <span>Date range</span>
      <button type="button" className="lf-combo-button" onClick={() => setOpen((current) => !current)} aria-haspopup="dialog" aria-expanded={open}>
        <span>{label}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="lf-combo-menu lf-date-menu">
          <div className="lf-date-presets">
            {leadDateOptions.map((option) => (
              <button type="button" key={option} className={option === value ? 'selected' : ''} onClick={() => { onPresetChange(option); if (option === 'Custom Range') { setOpen(false); setRangeOpen(true); } else { setRangeOpen(false); setOpen(false); } }}>{option}</button>
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
            <button type="button" onClick={() => { onRangeChange({ from: '', to: '' }); onPresetChange('Any Time'); setOpen(false); setRangeOpen(false); }}>Clear</button>
            <button type="button" className="selected" onClick={() => { setOpen(false); setRangeOpen(false); }}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}

function renderLeadCell(lead, key, { onDetails, emailHidden, query, getOwnerName }) {
  if (!lead) return '-';
  if (key === 'customer') {
    return (
      <button className="lf-person-cell lf-person-cell--plain" onClick={(event) => { event.stopPropagation(); onDetails?.(lead); }}>
        <strong>{highlightText(lead.customer || 'Unnamed Lead', query)}</strong>
      </button>
    );
  }
  if (key === 'clientId') return <span className="link-cell">{highlightText(lead.clientId || lead.id || '-', query)}</span>;
  if (key === 'company') return highlightText(lead.company || '-', query);
  if (key === 'phone') return highlightText(lead.phone || '-', query);
  if (key === 'owner') return highlightText(getOwnerName ? getOwnerName(lead.owner) : (lead.owner || '-'), query);
  if (key === 'priority') return <PriorityBadge value={lead.priority} />;
  if (key === 'status') return <StatusBadge value={lead.status} />;
  if (key === 'createdDate') return formatDate(lead.createdDate);
  if (key === 'source') return highlightText(String(lead.source || '-').toUpperCase(), query);
  return highlightText(lead[key] || '-', query);
}

function highlightText(text, query) {
  const value = String(text ?? '');
  const term = String(query || '').trim();
  if (!term) return value || '-';
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = value.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, index) => part.toLowerCase() === term.toLowerCase()
        ? <mark key={`${part}-${index}`} className="search-highlight">{part}</mark>
        : part)}
    </>
  );
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function StatusBadge({ value }) {
  const safeVal = value || 'New';
  return <span className={`lf-badge status-${slug(safeVal)}`}>{safeVal}</span>;
}

function PriorityBadge({ value }) {
  const safeVal = value || 'Medium';
  return <span className={`lf-badge priority-${slug(safeVal)}`}>{safeVal}</span>;
}

function Avatar({ name, small }) {
  const initials = (name || '').split(' ').map((part) => part[0]).join('').slice(0, 2);
  return <span className={`lf-avatar${small ? ' small' : ''}`}>{initials || 'LD'}</span>;
}

function ExportMenu({ runExport, selectedCount }) {
  const scopes = ['visible records', selectedCount ? 'selected records' : 'all filtered records', 'all filtered records'];
  return (
    <div className="lf-export-menu" role="menu">
      {scopes.map((scope, index) => (
        <div key={`${scope}-${index}`}>
          <strong>Export {scope}</strong>
          {['CSV', 'Excel', 'PDF'].map((format) => <button key={format} onClick={() => runExport(scope, format)}>{format}</button>)}
        </div>
      ))}
    </div>
  );
}

function ColumnSelector({ draftColumns, toggleColumn, setDraftColumns, onClose, onApply }) {
  return (
    <ModalShell title="Customize Columns" onClose={onClose}>
      <div className="lf-column-list">
        {leadColumns.map((column) => (
          <label key={column.key} className={column.locked ? 'disabled' : ''}>
            <input type="checkbox" checked={draftColumns.includes(column.key) || column.locked} disabled={column.locked} onChange={() => toggleColumn(column.key)} />
            {column.label}{column.locked && <small>Required</small>}
          </label>
        ))}
      </div>
      <div className="lf-modal-actions">
        <button onClick={() => setDraftColumns(defaultLeadColumns)}>Reset to Default</button>
        <button className="primary" onClick={onApply}>Apply Columns</button>
      </div>
    </ModalShell>
  );
}

function AddLeadModal({ form, setForm, errors, saving, editing, onClose, onDraft, onSubmit, availableUsers, pipelinesList, currentUser }) {
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const fullName = `${form.firstName} ${form.lastName}`.trim();
  const setFullName = (value) => {
    const [firstName = '', ...rest] = value.trimStart().split(/\s+/);
    setForm((current) => ({ ...current, firstName, lastName: rest.join(' ') }));
  };

  const hasAssignAll = currentUser?.user_type === 'ADMIN' || 
                       currentUser?.is_staff || 
                       currentUser?.is_superuser || 
                       currentUser?.role === 'Administrator' || 
                       currentUser?.role === 'Salesperson Manager';

  const displayUsers = hasAssignAll 
    ? availableUsers 
    : (availableUsers.some(u => String(u.id) === String(currentUser?.id)) 
        ? availableUsers.filter(u => String(u.id) === String(currentUser?.id))
        : [{ id: currentUser?.id, full_name: currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser?.username }]);

  return (
    <section className="lead-form-page">
      <div className="lead-form-page-card">
        <header className="lead-form-page-head">
          <div>
            <h2>{editing ? 'Edit Lead' : 'Add Lead'}</h2>
            <p>{editing ? 'Update lead details and save changes.' : 'Create a new lead record.'}</p>
          </div>
          <button type="button" className="lead-form-back" aria-label="Back" title="Back" onClick={onClose}><ArrowLeft size={22} /></button>
        </header>
        <form className="lf-lead-form lead-information-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
          <section className="lead-info-column lead-person-box">
            <h3>Person Information</h3>
            <TextInput label="Full Name" value={fullName} error={errors.firstName || errors.lastName || errors.full_name} onChange={setFullName} required />
            <TextInput label="Date" type="date" value={form.createdDate} onChange={(value) => setField('createdDate', value)} />
            <TextInput label="Phone Number" value={form.phone} error={errors.phone} onChange={(value) => setField('phone', value)} />
            <TextInput label="Email Address" value={form.email} error={errors.email} onChange={(value) => setField('email', value)} />
            <FormSelect label="Lead Source" value={form.source} options={leadSourceOptions.filter((item) => item !== 'All Sources')} onChange={(value) => setField('source', value)} />
            <label className="lf-field">
              <span>Assigned Salesperson</span>
              <select 
                value={form.owner} 
                onChange={(e) => setField('owner', e.target.value)}
                disabled={!hasAssignAll}
              >
                {hasAssignAll && <option value="">Unassigned</option>}
                {displayUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                ))}
              </select>
            </label>
            <label className="lf-field">
              <span>Pipeline</span>
              <select value={form.pipeline} onChange={(e) => setField('pipeline', e.target.value)}>
                <option value="">Select Pipeline</option>
                {pipelinesList.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <FormSelect label="Priority" value={form.priority} options={leadPriorityOptions.filter((item) => item !== 'All Priorities')} onChange={(value) => setField('priority', value)} />
            <FormSelect label="Status" value={form.status} options={leadStatusOptions.filter((item) => item !== 'All Statuses')} onChange={(value) => setField('status', value)} />
          </section>
          <section className="lead-info-column lead-company-box lead-company-form-grid">
            <h3>Company Information</h3>
            <TextInput label="Company Name" value={form.company} error={errors.company_name} onChange={(value) => setField('company', value)} required />
            <FormSelect label="Type" value={form.companyType} options={companyTypes} onChange={(value) => setField('companyType', value)} />
            <TextInput label="Employees" type="number" value={form.companyEmployees} onChange={(value) => setField('companyEmployees', value)} />
            <TextInput label="Annual Revenue" type="number" value={form.companyAnnualRevenue} onChange={(value) => setField('companyAnnualRevenue', value)} />
            <TextInput label="Industry" value={form.companyIndustry} onChange={(value) => setField('companyIndustry', value)} />
            <TextInput label="Phone" value={form.companyPhone} onChange={(value) => setField('companyPhone', value)} />
            <TextInput label="Email" type="email" value={form.companyEmail} onChange={(value) => setField('companyEmail', value)} />

            <label className="lf-field full"><span>Notes</span><textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} /></label>
          </section>
        </form>
        {errors.non_field_errors && <div className="lf-error-banner" style={{ color: '#ef4444', padding: '10px', fontSize: '13px' }}>{errors.non_field_errors}</div>}
        <div className="lf-modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={onSubmit} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Lead' : 'Save Lead'}</button>
        </div>
      </div>
    </section>
  );
}

function TextInput({ label, value, onChange, error, type = 'text', required, className = '' }) {
  return (
    <label className={`lf-field${className ? ` ${className}` : ''}`}>
      <span>{label}{required && <b>*</b>}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />
      {error && <small style={{ color: '#f87171' }}>{error}</small>}
    </label>
  );
}

function FormSelect({ label, value, options, onChange, className = '' }) {
  return <SearchableSelect className={`lf-field${className ? ` ${className}` : ''}`} label={label} value={value} options={options} onChange={onChange} showInlineLabel={false} />;
}

function LeadDetailsDrawer({ lead, onClose, onEdit, onConvert, onMarkLost, onToast, canEdit = true, getOwnerName }) {
  if (!lead) return null;

  const [activeTab, setActiveTab] = useState('overview');
  const [sessionNotes, setSessionNotes] = useState(() => {
    return lead.notes ? [{ id: 1, text: lead.notes, author: getOwnerName ? getOwnerName(lead.owner) : 'System', date: lead.createdDate || 'Initial' }] : [];
  });
  const [newNoteText, setNewNoteText] = useState('');

  const [sessionTasks, setSessionTasks] = useState(() => {
    const initial = Array.isArray(lead.tasks) ? [...lead.tasks] : [];
    if (lead.upcomingFollowUp) {
      initial.push({
        id: 'init-fu',
        title: `Upcoming Follow-up: ${lead.upcomingFollowUp}`,
        dueDate: lead.nextFollowUp || lead.createdDate || 'Soon',
        type: 'Follow-up',
        completed: false
      });
    }
    return initial;
  });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskType, setNewTaskType] = useState('Follow-up Call');

  const estimatedValue = Number(lead.estimatedValue || lead.companyAnnualRevenue || 0);

  // Avatar Initials
  const initials = useMemo(() => {
    const name = (lead.customer || 'Lead').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'LD';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [lead.customer]);

  // Clean Phone Number for WhatsApp & Tel links
  const rawPhone = String(lead.phone || '').trim();
  const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
  const waPhone = cleanPhone.replace(/^\+/, '');

  // Add Session Note
  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const noteObj = {
      id: Date.now(),
      text: newNoteText.trim(),
      author: getOwnerName ? getOwnerName(lead.owner) : 'Current Rep',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    setSessionNotes(prev => [noteObj, ...prev]);
    setNewNoteText('');
    onToast?.('Note added successfully.');
  };

  // Add Session Task
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const taskObj = {
      id: Date.now(),
      title: newTaskTitle.trim(),
      dueDate: newTaskDate || 'No due date',
      type: newTaskType,
      completed: false
    };
    setSessionTasks(prev => [taskObj, ...prev]);
    setNewTaskTitle('');
    setNewTaskDate('');
    onToast?.('Task scheduled.');
  };

  const toggleTaskCompletion = (taskId) => {
    setSessionTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  // Dynamic Timeline Events
  const timelineEvents = useMemo(() => {
    if (Array.isArray(lead.activities) && lead.activities.length > 0) {
      return lead.activities;
    }
    
    const events = [];
    if (lead.createdDate) {
      events.push({
        id: 'evt-created',
        title: 'Lead Ingested & Created',
        description: `Lead created via ${lead.source || 'Ingestion'} and assigned to ${getOwnerName ? getOwnerName(lead.owner) : 'Salesperson'}.`,
        date: formatDate(lead.createdDate),
        type: 'CREATED',
        icon: PlusCircle
      });
    }

    if (lead.lastContactDate) {
      events.push({
        id: 'evt-contacted',
        title: 'Contact Attempt Recorded',
        description: `Logged ${lead.contactAttempts || 1} contact attempt(s).`,
        date: formatDate(lead.lastContactDate),
        type: 'CONTACT',
        icon: Phone
      });
    }

    if (lead.updatedAt && lead.updatedAt !== lead.createdDate) {
      events.push({
        id: 'evt-updated',
        title: 'Lead Record Updated',
        description: `Status updated to ${lead.status || 'Active'}.`,
        date: formatDate(lead.updatedAt),
        type: 'UPDATE',
        icon: Edit3
      });
    }

    if (lead.is_converted) {
      events.push({
        id: 'evt-converted',
        title: 'Lead Converted to Deal',
        description: `Successfully converted into Company, Contact, and Opportunity.${lead.convertedAt ? ` Converted on ${formatDate(lead.convertedAt)}.` : ''}`,
        date: lead.convertedAt ? formatDate(lead.convertedAt) : 'Converted',
        type: 'CONVERTED',
        icon: Check
      });
    }

    if (lead.lostReason) {
      events.push({
        id: 'evt-lost',
        title: 'Lead Marked as Lost',
        description: `Reason: ${lead.lostReason}.${lead.lostNotes ? ` Notes: ${lead.lostNotes}` : ''}`,
        date: 'Lost',
        type: 'LOST',
        icon: X
      });
    }

    return events;
  }, [lead, getOwnerName]);

  const ownerDisplayName = getOwnerName ? getOwnerName(lead.owner) : (lead.owner || 'Unassigned');

  // Status Badge Class mapping
  const getStatusBadgeStyle = (statusStr) => {
    const s = String(statusStr || '').toUpperCase();
    if (s.includes('CONVERT')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('LOST')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s.includes('CONTACT') || s.includes('FOLLOW')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('QUALIF') || s.includes('DEMO')) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  const getPriorityBadgeStyle = (prioStr) => {
    const p = String(prioStr || '').toUpperCase();
    if (p === 'HIGH' || p === 'URGENT') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (p === 'MEDIUM') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <section className="payment-record-detail lead-record-detail lead-details-redesign" aria-label="Lead details">
      {/* ── HEADER HERO ── */}
      <header className="lead-drawer-hero">
        <div className="lead-hero-left">
          <button type="button" className="lead-hero-back-btn" aria-label="Back" title="Back" onClick={onClose}>
            <ArrowLeft size={20} />
          </button>
          
          <div className="lead-avatar-circle">
            <span>{initials}</span>
          </div>

          <div className="lead-hero-title-block">
            <div className="lead-hero-title-row">
              <h2>{lead.customer || 'Lead Detail'}</h2>
              <span className={`lead-status-pill ${getStatusBadgeStyle(lead.status)}`}>
                {lead.status || 'New'}
              </span>
              <span className={`lead-priority-pill ${getPriorityBadgeStyle(lead.priority)}`}>
                {lead.priority || 'Medium'} Priority
              </span>
              <span className="lead-code-pill">
                {lead.clientId || lead.id}
              </span>
            </div>
            
            <p className="lead-hero-subtitle">
              {lead.company ? (
                <>
                  <Building2 size={14} className="inline-icon mr-1" />
                  <strong>{lead.company}</strong>
                  <span className="mx-2">•</span>
                </>
              ) : null}
              {lead.source ? `Source: ${lead.source}` : 'Lead Record'}
              {lead.industry ? ` • ${lead.industry}` : ''}
            </p>
          </div>
        </div>

        <div className="lead-record-actions">
          {canEdit && !lead.is_converted && (
            <button type="button" className="payment-record-edit" onClick={onEdit}>
              <Edit3 size={15} /> Edit
            </button>
          )}
          {canEdit && !lead.is_converted && (
            <button type="button" className="lead-record-convert" onClick={onConvert}>
              <Check size={15} /> Convert
            </button>
          )}
          {canEdit && !lead.is_converted && (
            <button type="button" className="lead-record-lost" onClick={onMarkLost}>
              <X size={15} /> Mark Lost
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
          href={lead.email ? `mailto:${lead.email}` : undefined}
          className={`lead-comm-btn ${lead.email ? 'active' : 'disabled'}`}
          title={lead.email ? `Email ${lead.email}` : 'No email address available'}
          onClick={(e) => !lead.email && e.preventDefault()}
        >
          <Mail size={14} /> Email
        </a>

        <a
          href={waPhone ? `https://wa.me/${waPhone}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={`lead-comm-btn whatsapp ${waPhone ? 'active' : 'disabled'}`}
          title={waPhone ? `WhatsApp ${rawPhone}` : 'No phone number available'}
          onClick={(e) => !waPhone && e.preventDefault()}
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
          <User size={15} /> Overview
        </button>

        <button
          type="button"
          className={`lead-tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          <Activity size={15} /> Activity Timeline
          {timelineEvents.length > 0 && <span className="tab-count-badge">{timelineEvents.length}</span>}
        </button>

        <button
          type="button"
          className={`lead-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <CheckSquare size={15} /> Tasks & Follow-ups
          {sessionTasks.length > 0 && <span className="tab-count-badge">{sessionTasks.length}</span>}
        </button>

        <button
          type="button"
          className={`lead-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <FileText size={15} /> Notes
          {sessionNotes.length > 0 && <span className="tab-count-badge">{sessionNotes.length}</span>}
        </button>
      </nav>

      {/* ── TAB CONTENT CONTAINERS ── */}
      <div className="lead-tab-content-container">

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="lead-tab-panel overview-panel">
            {/* Metric Summary Strip */}
            <section className="payment-record-summary lead-redesign-summary" aria-label="Lead summary">
              <div>
                <span>Estimated Value</span>
                <strong>{estimatedValue ? `$${estimatedValue.toLocaleString()}` : '-'}</strong>
              </div>
              <div>
                <span>Contact Attempts</span>
                <strong>{lead.contactAttempts || 0}</strong>
              </div>
              <div>
                <span>Last Contact</span>
                <strong>{formatDate(lead.lastContactDate)}</strong>
              </div>
              <div>
                <span>Created Date</span>
                <strong>{formatDate(lead.createdDate)}</strong>
              </div>
            </section>

            <div className="lead-overview-cards-grid">
              {/* Person Information Card (Premium Redesign) */}
              <section className="lead-card-box payment-parameters-card">
                <header className="lead-card-box-head">
                  <User size={16} className="text-indigo-600" />
                  <h3>Person Information</h3>
                </header>
                <div className="payment-param-grid">
                  <div className="payment-param-item">
                    <div className="payment-param-icon bg-indigo-50 text-indigo-600">
                      <User size={15} />
                    </div>
                    <div className="payment-param-text">
                      <span className="payment-param-label">Full Name</span>
                      <strong className="payment-param-value">{lead.customer || '-'}</strong>
                    </div>
                  </div>

                  <div className="payment-param-item">
                    <div className="payment-param-icon bg-emerald-50 text-emerald-600">
                      <Phone size={15} />
                    </div>
                    <div className="payment-param-text">
                      <span className="payment-param-label">Phone Number</span>
                      <strong className="payment-param-value font-mono">{lead.phone || '-'}</strong>
                    </div>
                  </div>

                  <div className="payment-param-item">
                    <div className="payment-param-icon bg-sky-50 text-sky-600">
                      <Mail size={15} />
                    </div>
                    <div className="payment-param-text">
                      <span className="payment-param-label">Email Address</span>
                      <strong className="payment-param-value text-sky-700">{lead.email || '-'}</strong>
                    </div>
                  </div>

                  <div className="payment-param-item">
                    <div className="payment-param-icon bg-amber-50 text-amber-600">
                      <Target size={15} />
                    </div>
                    <div className="payment-param-text">
                      <span className="payment-param-label">Lead Source</span>
                      <strong className="payment-param-value">{lead.source || '-'}</strong>
                    </div>
                  </div>

                  <div className="payment-param-item">
                    <div className="payment-param-icon bg-purple-50 text-purple-600">
                      <User size={15} />
                    </div>
                    <div className="payment-param-text">
                      <span className="payment-param-label">Assigned Rep</span>
                      <strong className="payment-param-value">{ownerDisplayName}</strong>
                    </div>
                  </div>

                  <div className="payment-param-item">
                    <div className="payment-param-icon bg-rose-50 text-rose-600">
                      <Sparkles size={15} />
                    </div>
                    <div className="payment-param-text">
                      <span className="payment-param-label">Priority Level</span>
                      <strong className="payment-param-value">{lead.priority || '-'}</strong>
                    </div>
                  </div>

                  <div className="payment-param-item full-span">
                    <div className="payment-param-icon bg-blue-50 text-blue-600">
                      <Activity size={15} />
                    </div>
                    <div className="payment-param-text">
                      <span className="payment-param-label">Lifecycle Status</span>
                      <strong className="payment-param-value">{lead.status || '-'}</strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* Company & Financial Details Card (Premium Redesign) */}
              <section className="lead-card-box payment-parameters-card">
                <header className="lead-card-box-head">
                  <Building2 size={16} className="text-purple-600" />
                  <h3>Company & Financial Details</h3>
                </header>
                <div className="payment-param-grid">
                  <div className="payment-param-item">
                    <div className="payment-param-icon bg-purple-50 text-purple-600">
                      <Building2 size={15} />
                    </div>
                    <div className="payment-param-text">
                      <span className="payment-param-label">Company Name</span>
                      <strong className="payment-param-value">{lead.company || '-'}</strong>
                    </div>
                  </div>

                  <div className="payment-param-item">
                    <div className="payment-param-icon bg-sky-50 text-sky-600">
                      <Globe size={15} />
                    </div>
                    <div className="payment-param-text">
                      <span className="payment-param-label">Website</span>
                      <div className="payment-param-value">
                        {lead.website ? (
                          <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="lead-link text-xs font-semibold">
                            {lead.website} <ExternalLink size={11} className="inline-icon" />
                          </a>
                        ) : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="payment-param-item">
                    <div className="payment-param-icon bg-slate-100 text-slate-600">
                      <Briefcase size={15} />
                    </div>
                    <div className="payment-param-text">
                      <span className="payment-param-label">Industry</span>
                      <strong className="payment-param-value">{lead.industry || '-'}</strong>
                    </div>
                  </div>

                  <div className="payment-param-item">
                    <div className="payment-param-icon bg-indigo-50 text-indigo-600">
                      <Users size={15} />
                    </div>
                    <div className="payment-param-text">
                      <span className="payment-param-label">Employee Count</span>
                      <strong className="payment-param-value">{lead.companyEmployees ? lead.companyEmployees.toLocaleString() : '-'}</strong>
                    </div>
                  </div>

                  <div className="payment-param-item">
                    <div className="payment-param-icon bg-emerald-50 text-emerald-600">
                      <DollarSign size={15} />
                    </div>
                    <div className="payment-param-text">
                      <span className="payment-param-label">Annual Revenue</span>
                      <strong className="payment-param-value text-emerald-700">{lead.companyAnnualRevenue ? `$${lead.companyAnnualRevenue.toLocaleString()}` : '-'}</strong>
                    </div>
                  </div>

                  <div className="payment-param-item">
                    <div className="payment-param-icon bg-blue-50 text-blue-600">
                      <Building2 size={15} />
                    </div>
                    <div className="payment-param-text">
                      <span className="payment-param-label">Organization</span>
                      <strong className="payment-param-value">{lead.organization || '-'}</strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* Converted / Lost Info Card (If Applicable) */}
              {(lead.is_converted || lead.lostReason) && (
                <section className="lead-card-box full-width">
                  <header className="lead-card-box-head">
                    <Sparkles size={16} /> <h3>Lifecycle State Information</h3>
                  </header>
                  <dl className="lead-details-dl">
                    {lead.is_converted && (
                      <>
                        <div><dt>Conversion Status</dt><dd><span className="text-emerald-600 font-bold">Converted</span></dd></div>
                        <div><dt>Converted Date</dt><dd>{formatDate(lead.convertedAt)}</dd></div>
                      </>
                    )}
                    {lead.lostReason && (
                      <>
                        <div><dt>Lost Reason</dt><dd><span className="text-rose-600 font-bold">{lead.lostReason}</span></dd></div>
                        <div><dt>Lost Notes</dt><dd>{lead.lostNotes || '-'}</dd></div>
                      </>
                    )}
                  </dl>
                </section>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITY TIMELINE */}
        {activeTab === 'activities' && (
          <div className="lead-tab-panel activities-panel">
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
                          <h4>{evt.title || evt.action || 'Activity Event'}</h4>
                          <span className="lead-timeline-date">{evt.date || 'Recent'}</span>
                        </header>
                        <p className="lead-timeline-desc">{evt.description || evt.notes || 'Activity recorded on this lead.'}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="lead-empty-state">
                <Clock size={36} />
                <h4>No Recorded Activity Timeline</h4>
                <p>Activity history will automatically update as status, contact attempts, and notes change.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TASKS & FOLLOW-UPS */}
        {activeTab === 'tasks' && (
          <div className="lead-tab-panel tasks-panel">
            {/* Quick Task Scheduler */}
            <form onSubmit={handleAddTask} className="lead-task-composer">
              <h4>Schedule Follow-up or Task</h4>
              <div className="lead-task-inputs-row">
                <input
                  type="text"
                  placeholder="Task title (e.g., Call to discuss pricing)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="lead-task-title-input"
                  required
                />
                <input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="lead-task-date-input"
                />
                <select
                  value={newTaskType}
                  onChange={(e) => setNewTaskType(e.target.value)}
                  className="lead-task-type-select"
                >
                  <option value="Follow-up Call">Follow-up Call</option>
                  <option value="Email Response">Email Response</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Demo">Demo</option>
                </select>
                <button type="submit" className="lead-add-task-btn">
                  <Plus size={15} /> Schedule
                </button>
              </div>
            </form>

            {/* Task List */}
            {sessionTasks.length > 0 ? (
              <ul className="lead-tasks-list">
                {sessionTasks.map((t) => (
                  <li key={t.id} className={`lead-task-card ${t.completed ? 'completed' : ''}`}>
                    <label className="lead-task-checkbox-label">
                      <input
                        type="checkbox"
                        checked={Boolean(t.completed)}
                        onChange={() => toggleTaskCompletion(t.id)}
                      />
                      <span className="lead-task-title">{t.title}</span>
                    </label>
                    <div className="lead-task-meta">
                      <span className="lead-task-type-tag">{t.type || 'Task'}</span>
                      <span className="lead-task-date-tag">
                        <Calendar size={13} /> {t.dueDate || 'Soon'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="lead-empty-state">
                <CheckSquare size={36} />
                <h4>No Pending Tasks Scheduled</h4>
                <p>Use the scheduler above to assign follow-up calls or meetings for this lead.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: NOTES */}
        {activeTab === 'notes' && (
          <div className="lead-tab-panel notes-panel">
            {/* Inline Note Composer */}
            <form onSubmit={handleAddNote} className="lead-note-composer">
              <h4>Add Sales Note</h4>
              <textarea
                placeholder="Write a note or call summary for this lead..."
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
            {sessionNotes.length > 0 ? (
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
            ) : (
              <div className="lead-empty-state">
                <MessageSquare size={36} />
                <h4>No Notes Available</h4>
                <p>Type a note above to record rep feedback or call logs.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}

function ConfirmDelete({ lead, onCancel, onConfirm }) {
  return (
    <ModalShell title="Delete this lead?" subtitle={`Delete ${lead.customer}? This action cannot be undone.`} onClose={onCancel}>
      <div className="lf-modal-actions">
        <button onClick={onCancel}>Cancel</button>
        <button className="danger" onClick={onConfirm}>Delete Lead</button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, subtitle, onClose, children, wide, className = '' }) {
  return (
    <div className="lf-modal-backdrop" role="presentation">
      <section className={`lf-modal${wide ? ' wide' : ''}${className ? ` ${className}` : ''}`} role="dialog" aria-modal="true" aria-labelledby="lf-modal-title">
        <div className="lf-modal-head">
          <div><h2 id="lf-modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button aria-label="Close modal" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function LostReasonModal({ onCancel, onConfirm }) {
  const [reason, setReason] = useState('OTHER');
  const [notes, setNotes] = useState('');

  const choices = [
    { value: 'BUDGET_TOO_HIGH', label: 'Budget Too High' },
    { value: 'NOT_INTERESTED', label: 'Not Interested' },
    { value: 'COMPETITOR_CHOSEN', label: 'Competitor Chosen' },
    { value: 'NO_RESPONSE', label: 'No Response' },
    { value: 'WRONG_CONTACT', label: 'Wrong Contact' },
    { value: 'PROJECT_POSTPONED', label: 'Project Postponed' },
    { value: 'DUPLICATE_LEAD', label: 'Duplicate Lead' },
    { value: 'OTHER', label: 'Other' }
  ];

  return (
    <ModalShell title="Mark Lead as Lost" subtitle="Please select a reason and add notes." onClose={onCancel}>
      <form onSubmit={(e) => { e.preventDefault(); onConfirm(reason, notes); }} className="lf-lead-form" style={{ display: 'block', padding: '10px 0' }}>
        <label className="lf-field" style={{ marginBottom: '15px' }}>
          <span>Reason *</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} required>
            {choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="lf-field">
          <span>Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add any details..." />
        </label>
        <div className="lf-modal-actions" style={{ marginTop: '20px' }}>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="danger">Confirm Lost</button>
        </div>
      </form>
    </ModalShell>
  );
}

function validateLeadForm(form) {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = 'First name is required.';
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!form.email.trim() && !form.phone.trim()) errors.email = 'Email or phone is required.';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.';
  if (form.phone && !/^[+()\d\s-]{7,}$/.test(form.phone)) errors.phone = 'Enter a valid phone number.';
  return errors;
}

function compareLeads(a, b, key, direction) {
  const left = key === 'priority' ? priorityRank[a[key]] : key === 'status' ? statusRank[a[key]] : a[key];
  const right = key === 'priority' ? priorityRank[b[key]] : key === 'status' ? statusRank[b[key]] : b[key];
  const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left || '').localeCompare(String(right || ''));
  return direction === 'asc' ? result : -result;
}

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
  } catch (e) {
    return value;
  }
}
