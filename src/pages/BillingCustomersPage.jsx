import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  Edit3,
  Globe,
  Hash,
  Mail,
  MapPin,
  Phone,
  Plus,
  PlusCircle,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
  User,
  UserCheck,
  UserX,
  X,
  AlertTriangle,
  FileText,
  DollarSign
} from 'lucide-react';
import {
  fetchBillingCustomers,
  fetchBillingCustomer,
  createBillingCustomer,
  updateBillingCustomer,
  deactivateBillingCustomer,
  reactivateBillingCustomer
} from '../utils/billingApi';
import {
  billingCustomerBackendToUi,
  billingCustomerUiToPayload
} from '../utils/adapters';

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'PKR', 'CAD', 'AUD', 'JPY', 'CNY', 'CHF', 'INR'];

const emptyCustomerForm = {
  id: null,
  customerNumber: '',
  name: '',
  email: '',
  phone: '',
  billingAddressLine1: '',
  billingAddressLine2: '',
  billingCity: '',
  billingState: '',
  billingPostalCode: '',
  billingCountry: '',
  currency: 'USD',
  taxId: '',
  taxExempt: false,
  defaultPaymentMethodId: '',
  externalReferenceId: '',
  isActive: true,
};

export default function BillingCustomersPage({
  currentUser,
  setMessage,
  globalSearch = '',
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [extRefFilter, setExtRefFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | ACTIVE | INACTIVE
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  
  // Drawer & Modal State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [formData, setFormData] = useState(emptyCustomerForm);
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Deactivate confirm modal
  const [deactivateConfirmTarget, setDeactivateConfirmTarget] = useState(null);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await fetchBillingCustomers({
        search: searchQuery,
        external_reference_id: extRefFilter,
      });
      const uiCustomers = data.map(billingCustomerBackendToUi);
      setCustomers(uiCustomers);
    } catch (err) {
      console.error('Failed to load customers:', err);
      if (setMessage) {
        setMessage(err.message || 'Failed to load billing customers.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [searchQuery, extRefFilter]);

  // Client-side filtering for status and currency + global search
  const filteredCustomers = useMemo(() => {
    const q = (globalSearch || '').trim().toLowerCase();
    return customers.filter((cust) => {
      // Status filter
      if (statusFilter === 'ACTIVE' && !cust.isActive) return false;
      if (statusFilter === 'INACTIVE' && cust.isActive) return false;

      // Currency filter
      if (currencyFilter !== 'ALL' && cust.currency !== currencyFilter) return false;

      // Global search term filter
      if (q) {
        const matches = [
          cust.customerNumber,
          cust.name,
          cust.email,
          cust.phone,
          cust.currency,
          cust.taxId,
          cust.externalReferenceId,
        ].some((val) => String(val || '').toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [customers, statusFilter, currencyFilter, globalSearch]);

  // KPI Summary calculations
  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.isActive).length;
    const inactive = total - active;
    const uniqueCurrencies = new Set(customers.map((c) => c.currency).filter(Boolean)).size;
    return { total, active, inactive, uniqueCurrencies };
  }, [customers]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      ...emptyCustomerForm,
      currency: 'USD',
      isActive: true,
      taxExempt: false,
    });
    setFormErrors({});
    setModalMode('create');
  };

  // Open Edit Modal
  const handleOpenEdit = (cust) => {
    setFormData({
      id: cust.id,
      customerNumber: cust.customerNumber,
      name: cust.name,
      email: cust.email,
      phone: cust.phone,
      billingAddressLine1: cust.billingAddressLine1,
      billingAddressLine2: cust.billingAddressLine2,
      billingCity: cust.billingCity,
      billingState: cust.billingState,
      billingPostalCode: cust.billingPostalCode,
      billingCountry: cust.billingCountry,
      currency: cust.currency || 'USD',
      taxId: cust.taxId,
      taxExempt: cust.taxExempt,
      defaultPaymentMethodId: cust.defaultPaymentMethodId,
      externalReferenceId: cust.externalReferenceId,
      isActive: cust.isActive,
    });
    setFormErrors({});
    setModalMode('edit');
  };

  // Open Detail Drawer
  const handleOpenDetail = (cust) => {
    setSelectedCustomer(cust);
    setDetailDrawerOpen(true);
  };

  // Validate form client-side before submission
  const validateForm = () => {
    const errors = {};
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Customer name is required.';
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address.';
      }
    }

    if (formData.defaultPaymentMethodId && formData.defaultPaymentMethodId.trim()) {
      const digits = formData.defaultPaymentMethodId.trim().replace(/[\s-]/g, '');
      if (/^\d{15,16}$/.test(digits)) {
        errors.defaultPaymentMethodId = 'Raw credit card numbers are prohibited. Supply a safe gateway payment token (e.g. pm_card_tok).';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Create or Update submission
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      const payload = billingCustomerUiToPayload(formData);

      if (modalMode === 'create') {
        const created = await createBillingCustomer(payload);
        const uiCreated = billingCustomerBackendToUi(created);
        setCustomers((prev) => [uiCreated, ...prev]);
        if (setMessage) setMessage(`Customer ${uiCreated.customerNumber || uiCreated.name} created successfully.`);
      } else if (modalMode === 'edit') {
        // Customer number is immutable on edit
        delete payload.customer_number;
        const updated = await updateBillingCustomer(formData.id, payload);
        const uiUpdated = billingCustomerBackendToUi(updated);
        setCustomers((prev) => prev.map((c) => (c.id === uiUpdated.id ? uiUpdated : c)));
        if (selectedCustomer && selectedCustomer.id === uiUpdated.id) {
          setSelectedCustomer(uiUpdated);
        }
        if (setMessage) setMessage(`Customer ${uiUpdated.customerNumber} updated successfully.`);
      }

      setModalMode(null);
    } catch (err) {
      console.error('Save customer failed:', err);
      if (err.data && typeof err.data === 'object') {
        setFormErrors(err.data);
      }
      if (setMessage) {
        setMessage(err.message || 'Failed to save billing customer.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Deactivate Customer (Soft Delete)
  const handleConfirmDeactivate = async () => {
    if (!deactivateConfirmTarget) return;
    try {
      await deactivateBillingCustomer(deactivateConfirmTarget.id);
      setCustomers((prev) =>
        prev.map((c) => (c.id === deactivateConfirmTarget.id ? { ...c, isActive: false, status: 'Inactive' } : c))
      );
      if (selectedCustomer && selectedCustomer.id === deactivateConfirmTarget.id) {
        setSelectedCustomer((prev) => ({ ...prev, isActive: false, status: 'Inactive' }));
      }
      if (setMessage) setMessage(`Customer ${deactivateConfirmTarget.customerNumber} deactivated.`);
      setDeactivateConfirmTarget(null);
    } catch (err) {
      console.error('Deactivate failed:', err);
      if (setMessage) setMessage(err.message || 'Failed to deactivate customer.');
    }
  };

  // Reactivate Customer
  const handleReactivate = async (cust) => {
    try {
      const updated = await reactivateBillingCustomer(cust.id);
      const uiUpdated = billingCustomerBackendToUi(updated);
      setCustomers((prev) => prev.map((c) => (c.id === uiUpdated.id ? uiUpdated : c)));
      if (selectedCustomer && selectedCustomer.id === uiUpdated.id) {
        setSelectedCustomer(uiUpdated);
      }
      if (setMessage) setMessage(`Customer ${uiUpdated.customerNumber} reactivated successfully.`);
    } catch (err) {
      console.error('Reactivation failed:', err);
      if (setMessage) setMessage(err.message || 'Failed to reactivate customer.');
    }
  };

  return (
    <div className="portal-page portal-page--embedded user-dashboard dashboard-v2" style={{ padding: '24px 32px' }}>
      
      {/* ── Page Header ── */}
      <header className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={26} style={{ color: 'var(--color-primary)' }} />
            Billing Customers
          </h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '13px', marginTop: '4px' }}>
            Manage billing accounts, currencies, addresses, tax profiles, and payment tokens.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="button secondary"
            onClick={loadCustomers}
            title="Refresh list"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          {canCreate && (
            <button
              type="button"
              className="button primary"
              onClick={handleOpenCreate}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              New Customer
            </button>
          )}
        </div>
      </header>

      {/* ── Metrics / KPI Cards ── */}
      <section className="dashboard-v2-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div className="metric-card" style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-muted)', letterSpacing: '0.5px' }}>
            Total Customers
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-secondary)', marginTop: '4px' }}>
            {stats.total}
          </div>
        </div>

        <div className="metric-card" style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.5px' }}>
            Active Accounts
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
            {stats.active}
          </div>
        </div>

        <div className="metric-card" style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#dc2626', letterSpacing: '0.5px' }}>
            Inactive Accounts
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>
            {stats.inactive}
          </div>
        </div>

        <div className="metric-card" style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-primary)', letterSpacing: '0.5px' }}>
            Currencies
          </span>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-primary)', marginTop: '4px' }}>
            {stats.uniqueCurrencies || 1}
          </div>
        </div>
      </section>

      {/* ── Search & Filter Controls ── */}
      <section style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        {/* Search Input */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, email, customer #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
          />
        </div>

        {/* External Reference Filter */}
        <div style={{ flex: '1 1 200px', position: 'relative' }}>
          <Tag size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
          <input
            type="text"
            placeholder="Filter by External Ref ID..."
            value={extRefFilter}
            onChange={(e) => setExtRefFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-muted)' }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px', background: '#fff' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        {/* Currency Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-muted)' }}>Currency:</label>
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px', background: '#fff' }}
          >
            <option value="ALL">All Currencies</option>
            {CURRENCY_OPTIONS.map((cur) => (
              <option key={cur} value={cur}>{cur}</option>
            ))}
          </select>
        </div>

        {(searchQuery || extRefFilter || statusFilter !== 'ALL' || currencyFilter !== 'ALL') && (
          <button
            type="button"
            className="button secondary sm"
            onClick={() => {
              setSearchQuery('');
              setExtRefFilter('');
              setStatusFilter('ALL');
              setCurrencyFilter('ALL');
            }}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            Clear Filters
          </button>
        )}
      </section>

      {/* ── Customers Table / Content ── */}
      <section style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="animate-spin" style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: 'var(--color-primary)', borderRadius: '50%', marginBottom: '12px' }} />
            <p style={{ color: 'var(--color-muted)', fontSize: '13px' }}>Loading billing customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <UserX size={44} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '6px' }}>
              No Billing Customers Found
            </h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '13px', maxWidth: '400px', margin: '0 auto 16px' }}>
              {searchQuery || extRefFilter || statusFilter !== 'ALL' || currencyFilter !== 'ALL'
                ? 'Try adjusting your search criteria or clear your active filters.'
                : 'Get started by creating your first billing customer profile.'}
            </p>
            {canCreate && !searchQuery && !extRefFilter && (
              <button type="button" className="button primary sm" onClick={handleOpenCreate}>
                <Plus size={14} /> Create First Customer
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-muted)', letterSpacing: '0.5px' }}>Customer #</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-muted)', letterSpacing: '0.5px' }}>Name / Company</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-muted)', letterSpacing: '0.5px' }}>Contact Info</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-muted)', letterSpacing: '0.5px' }}>Currency</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-muted)', letterSpacing: '0.5px' }}>Tax Profile</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-muted)', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-muted)', letterSpacing: '0.5px' }}>Created</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-muted)', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust) => (
                  <tr
                    key={cust.id}
                    onClick={() => handleOpenDetail(cust)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-50"
                  >
                    {/* Customer # */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '13px', color: 'var(--color-primary)', background: '#eff6ff', padding: '3px 8px', borderRadius: '4px' }}>
                        {cust.customerNumber}
                      </span>
                    </td>

                    {/* Name */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--color-secondary)' }}>
                        {cust.name}
                      </div>
                      {cust.externalReferenceId && (
                        <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Tag size={10} /> Ext: {cust.externalReferenceId}
                        </div>
                      )}
                    </td>

                    {/* Contact Info */}
                    <td style={{ padding: '14px 16px' }}>
                      {cust.email && (
                        <div style={{ fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Mail size={12} style={{ color: 'var(--color-muted)' }} /> {cust.email}
                        </div>
                      )}
                      {cust.phone && (
                        <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Phone size={11} style={{ color: 'var(--color-muted)' }} /> {cust.phone}
                        </div>
                      )}
                      {!cust.email && !cust.phone && <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>}
                    </td>

                    {/* Currency */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px' }}>
                        {cust.currency}
                      </span>
                    </td>

                    {/* Tax Profile */}
                    <td style={{ padding: '14px 16px' }}>
                      {cust.taxExempt ? (
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#0891b2', background: '#ecfeff', padding: '2px 6px', borderRadius: '4px' }}>
                          Tax Exempt
                        </span>
                      ) : cust.taxId ? (
                        <span style={{ fontSize: '11px', color: '#475569' }}>
                          ID: {cust.taxId}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Standard</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      {cust.isActive ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: '#16a34a', background: '#dcfce7', padding: '3px 8px', borderRadius: '12px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                          Active
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '12px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--color-muted)' }}>
                      {cust.createdAt || '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        {canEdit && (
                          <button
                            type="button"
                            className="icon-button"
                            title="Edit Customer"
                            onClick={() => handleOpenEdit(cust)}
                            style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#fff', cursor: 'pointer' }}
                          >
                            <Edit3 size={14} style={{ color: '#475569' }} />
                          </button>
                        )}

                        {cust.isActive ? (
                          canDelete && (
                            <button
                              type="button"
                              className="icon-button"
                              title="Deactivate Customer"
                              onClick={() => setDeactivateConfirmTarget(cust)}
                              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #fee2e2', background: '#fff', cursor: 'pointer' }}
                            >
                              <Power size={14} style={{ color: '#dc2626' }} />
                            </button>
                          )
                        ) : (
                          canEdit && (
                            <button
                              type="button"
                              className="icon-button"
                              title="Reactivate Customer"
                              onClick={() => handleReactivate(cust)}
                              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #dcfce7', background: '#fff', cursor: 'pointer' }}
                            >
                              <UserCheck size={14} style={{ color: '#16a34a' }} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Customer Detail Drawer ── */}
      {/* ── Customer Detail Drawer ── */}
      {detailDrawerOpen && selectedCustomer && (() => {
        const activeCustomer = customers.find((c) => c.id === selectedCustomer.id) || selectedCustomer;
        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              pointerEvents: 'auto',
              padding: '20px',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setDetailDrawerOpen(false);
              }
            }}
            role="presentation"
          >
            {/* Centered Modal Panel */}
            <aside
              style={{
                position: 'relative',
                zIndex: 1001,
                width: '680px',
                maxWidth: '96vw',
                maxHeight: '90vh',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                pointerEvents: 'auto',
                overflow: 'hidden',
              }}
            >
              {/* Drawer Header */}
              <header className="panel-head" style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', flexShrink: 0 }}>
                <div>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                    {activeCustomer.customerNumber}
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-secondary)', marginTop: '6px' }}>
                    {activeCustomer.name}
                  </h3>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setDetailDrawerOpen(false)}
                  style={{ cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </header>

              {/* Drawer Body */}
              <div style={{ padding: '24px', flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Status Banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: activeCustomer.isActive ? '#f0fdf4' : '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${activeCustomer.isActive ? '#bbf7d0' : '#e2e8f0'}` }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: activeCustomer.isActive ? '#15803d' : '#64748b' }}>
                    Account Status: {activeCustomer.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  {activeCustomer.taxExempt && (
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#0891b2', background: '#ecfeff', padding: '2px 8px', borderRadius: '12px' }}>
                      Tax Exempt
                    </span>
                  )}
                </div>

                {/* General Details */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '10px', letterSpacing: '0.5px' }}>
                    Contact & Profile
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>Email Address</span>
                      <strong style={{ fontSize: '13px', color: '#1e293b' }}>{activeCustomer.email || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>Phone Number</span>
                      <strong style={{ fontSize: '13px', color: '#1e293b' }}>{activeCustomer.phone || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>Currency</span>
                      <strong style={{ fontSize: '13px', color: '#1e293b' }}>{activeCustomer.currency || 'USD'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>Tax / VAT ID</span>
                      <strong style={{ fontSize: '13px', color: '#1e293b' }}>{activeCustomer.taxId || 'None'}</strong>
                    </div>
                  </div>
                </div>

                {/* Billing Address */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '10px', letterSpacing: '0.5px' }}>
                    Billing Address
                  </h4>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                    {activeCustomer.billingAddressLine1 ? (
                      <>
                        <div>{activeCustomer.billingAddressLine1}</div>
                        {activeCustomer.billingAddressLine2 && <div>{activeCustomer.billingAddressLine2}</div>}
                        <div>
                          {[activeCustomer.billingCity, activeCustomer.billingState, activeCustomer.billingPostalCode].filter(Boolean).join(', ')}
                        </div>
                        {activeCustomer.billingCountry && <div style={{ fontWeight: '600' }}>{activeCustomer.billingCountry}</div>}
                      </>
                    ) : (
                      <span style={{ color: 'var(--color-muted)' }}>No billing address recorded.</span>
                    )}
                  </div>
                </div>

                {/* Payment & Integration Identity */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '10px', letterSpacing: '0.5px' }}>
                    Payment & Identity
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>Default Payment Token</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: activeCustomer.defaultPaymentMethodId ? '#0f172a' : '#94a3b8' }}>
                        {activeCustomer.defaultPaymentMethodId || 'None attached'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>External Reference ID</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: activeCustomer.externalReferenceId ? '#0f172a' : '#94a3b8' }}>
                        {activeCustomer.externalReferenceId || 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timestamps & Audit */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '10px', letterSpacing: '0.5px' }}>
                    Audit & Timestamps
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', color: 'var(--color-muted)' }}>
                    <div>Created: <strong style={{ color: '#334155' }}>{activeCustomer.createdAt || '—'}</strong></div>
                    <div>Updated: <strong style={{ color: '#334155' }}>{activeCustomer.updatedAt || '—'}</strong></div>
                    {activeCustomer.createdBy && (
                      <div style={{ gridColumn: 'span 2' }}>
                        Created By User ID: <strong style={{ color: '#334155' }}>{activeCustomer.createdBy}</strong>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Drawer Footer Actions */}
              <footer style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', gap: '12px', flexShrink: 0, pointerEvents: 'auto' }}>
                {canEdit && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      setDetailDrawerOpen(false);
                      handleOpenEdit(activeCustomer);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', pointerEvents: 'auto' }}
                  >
                    <Edit3 size={14} /> Edit Customer
                  </button>
                )}

                {activeCustomer.isActive ? (
                  canDelete && (
                    <button
                      type="button"
                      className="button danger"
                      onClick={() => {
                        setDetailDrawerOpen(false);
                        setDeactivateConfirmTarget(activeCustomer);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', pointerEvents: 'auto' }}
                    >
                      <Power size={14} /> Deactivate
                    </button>
                  )
                ) : (
                  canEdit && (
                    <button
                      type="button"
                      className="button success"
                      onClick={() => handleReactivate(activeCustomer)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', pointerEvents: 'auto' }}
                    >
                      <UserCheck size={14} /> Reactivate
                    </button>
                  )
                )}
              </footer>
            </aside>
          </div>
        );
      })()}

      {/* ── Create / Edit Customer Modal ── */}
      {modalMode && (
        <div
          className="modal-bg"
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(2px)',
            pointerEvents: 'auto',
            padding: '20px',
          }}
        >
          <div
            className="modal"
            style={{
              maxWidth: '640px',
              width: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              pointerEvents: 'auto',
              padding: 0,
            }}
          >
            <div className="panel-head" style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-secondary)' }}>
                {modalMode === 'create' ? 'Create Billing Customer' : `Edit Customer (${formData.customerNumber})`}
              </h3>
              <button
                type="button"
                className="icon-button"
                onClick={() => setModalMode(null)}
                style={{ cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} style={{ padding: '24px' }}>
              
              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                {/* Customer Number (Immutable on edit) */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    Customer Number {modalMode === 'create' ? '(Optional - Auto-generated if blank)' : '(Immutable)'}
                  </label>
                  <input
                    type="text"
                    placeholder={modalMode === 'create' ? 'Leave blank for auto-generated (e.g. CUST-00001)' : ''}
                    value={formData.customerNumber}
                    disabled={modalMode === 'edit'}
                    onChange={(e) => setFormData({ ...formData, customerNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      background: modalMode === 'edit' ? '#f1f5f9' : '#fff',
                      cursor: modalMode === 'edit' ? 'not-allowed' : 'text',
                    }}
                  />
                  {formErrors.customer_number && (
                    <span style={{ color: '#dc2626', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                      {formErrors.customer_number}
                    </span>
                  )}
                </div>

                {/* Customer Legal / Display Name */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation or Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.name ? '1px solid #dc2626' : '1px solid var(--color-border)', fontSize: '13px' }}
                  />
                  {formErrors.name && (
                    <span style={{ color: '#dc2626', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                      {formErrors.name}
                    </span>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    Billing Email
                  </label>
                  <input
                    type="email"
                    placeholder="billing@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.email ? '1px solid #dc2626' : '1px solid var(--color-border)', fontSize: '13px' }}
                  />
                  {formErrors.email && (
                    <span style={{ color: '#dc2626', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                      {formErrors.email}
                    </span>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    Billing Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                  />
                </div>

                {/* Currency */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    Currency Code
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px', background: '#fff' }}
                  >
                    {CURRENCY_OPTIONS.map((cur) => (
                      <option key={cur} value={cur}>{cur}</option>
                    ))}
                  </select>
                </div>

                {/* Tax ID */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    Tax ID / VAT Registration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. US-EIN-998877"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                  />
                </div>

                {/* Tax Exempt Checkbox */}
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                  <input
                    type="checkbox"
                    id="tax-exempt-toggle"
                    checked={formData.taxExempt}
                    onChange={(e) => setFormData({ ...formData, taxExempt: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="tax-exempt-toggle" style={{ fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                    Customer is Tax Exempt (No tax calculated on invoices)
                  </label>
                </div>

                {/* Address Line 1 */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    Billing Address Line 1
                  </label>
                  <input
                    type="text"
                    placeholder="123 Business Way, Suite 400"
                    value={formData.billingAddressLine1}
                    onChange={(e) => setFormData({ ...formData, billingAddressLine1: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                  />
                </div>

                {/* Address Line 2 */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    Billing Address Line 2
                  </label>
                  <input
                    type="text"
                    placeholder="Building B"
                    value={formData.billingAddressLine2}
                    onChange={(e) => setFormData({ ...formData, billingAddressLine2: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                  />
                </div>

                {/* City */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="New York"
                    value={formData.billingCity}
                    onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                  />
                </div>

                {/* State / Region */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    State / Province
                  </label>
                  <input
                    type="text"
                    placeholder="NY"
                    value={formData.billingState}
                    onChange={(e) => setFormData({ ...formData, billingState: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                  />
                </div>

                {/* Postal Code */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    Postal / Zip Code
                  </label>
                  <input
                    type="text"
                    placeholder="10001"
                    value={formData.billingPostalCode}
                    onChange={(e) => setFormData({ ...formData, billingPostalCode: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                  />
                </div>

                {/* Country */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    Country
                  </label>
                  <input
                    type="text"
                    placeholder="United States"
                    value={formData.billingCountry}
                    onChange={(e) => setFormData({ ...formData, billingCountry: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                  />
                </div>

                {/* Default Payment Method ID */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    Default Payment Method Token Reference (Safe Token)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. pm_card_visa_tok_12345"
                    value={formData.defaultPaymentMethodId}
                    onChange={(e) => setFormData({ ...formData, defaultPaymentMethodId: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.defaultPaymentMethodId ? '1px solid #dc2626' : '1px solid var(--color-border)', fontSize: '13px', fontFamily: 'monospace' }}
                  />
                  {formErrors.defaultPaymentMethodId && (
                    <span style={{ color: '#dc2626', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                      {formErrors.defaultPaymentMethodId}
                    </span>
                  )}
                </div>

                {/* External Reference ID */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-secondary)', marginBottom: '4px' }}>
                    External System Reference ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EXT-SYS-99882"
                    value={formData.externalReferenceId}
                    onChange={(e) => setFormData({ ...formData, externalReferenceId: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px', fontFamily: 'monospace' }}
                  />
                </div>

              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setModalMode(null)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={isSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Save Customer
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── Deactivation Confirmation Dialog ── */}
      {deactivateConfirmTarget && (
        <div
          className="modal-bg"
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(2px)',
            pointerEvents: 'auto',
            padding: '20px',
          }}
        >
          <div
            className="modal"
            style={{
              maxWidth: '420px',
              width: '90vw',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              pointerEvents: 'auto',
              overflow: 'hidden',
              padding: 0,
            }}
          >
            <div className="panel-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={18} /> Deactivate Customer
              </h3>
              <button
                type="button"
                className="icon-button"
                onClick={() => setDeactivateConfirmTarget(null)}
                style={{ cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', marginBottom: '16px' }}>
                Are you sure you want to deactivate customer{' '}
                <strong>{deactivateConfirmTarget.name}</strong> ({deactivateConfirmTarget.customerNumber})?
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                This performs a soft deactivation setting the account status to inactive. Existing subscriptions and records will remain intact.
              </p>
            </div>
            <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setDeactivateConfirmTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button danger"
                onClick={handleConfirmDeactivate}
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
