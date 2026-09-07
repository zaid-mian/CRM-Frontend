import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  PlusCircle,
  Printer,
  Trash2,
  Edit3,
  CreditCard,
  Briefcase,
  DollarSign,
  Building2,
  User,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Hash,
  Send,
} from 'lucide-react';
import { Actions, DetailBlock, DetailGrid, Empty, IconButton, Modal, PanelActions, SearchableSelect, Table } from '../components/ui';
import { emptyPayment, paymentMethods, paymentStatuses } from '../data/crmData';
import { formatCurrency } from '../utils/format';
import { authRequest, apiGet } from '../App';
import { paymentBackendToUi, normalizeLabel } from '../utils/adapters';

const paymentDateRangeOptions = ['All', 'Today', 'Last 7 Days', 'This Month'];
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export default function PaymentsPage({
  payments,
  setPayments,
  setMessage,
  globalSearch = '',
  canCreate = true,
  canEdit = true,
  canDelete = true
}) {
  const [filters, setFilters] = useState({ status: 'All', method: 'All', company: 'All', salesperson: 'All', dateRange: 'All', from: '', to: '' });
  const [drawer, setDrawer] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyPayment);
  const [loading, setLoading] = useState(true);
  const [opportunitiesList, setOpportunitiesList] = useState([]);
  
  // New state for recording instalment modal
  const [instalmentModalOpen, setInstalmentModalOpen] = useState(false);
  const [instalmentForm, setInstalmentForm] = useState({
    amount_received: '',
    payment_method: 'Cash',
    transaction_reference: '',
    payment_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const fetchPayments = async () => {
    try {
      setLoading(true);
      let allItems = [];
      let url = '/api/payments/?page_size=100';
      while (url) {
        const path = url.includes('/api/payments/') ? url.substring(url.indexOf('/api/payments/')) : url;
        const res = await apiGet(path);
        if (res.success && res.data) {
          allItems = [...allItems, ...(res.data.results || [])];
          url = res.data.pagination?.next || null;
        } else {
          break;
        }
      }
      setPayments(allItems.map(paymentBackendToUi));
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Failed to fetch payments.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const res = await apiGet('/api/opportunities/?page_size=100');
      if (res.success && res.data?.results) {
        setOpportunitiesList(res.data.results);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchOpportunities();
  }, []);

  const rows = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return payments
      .filter((payment) => {
        if (!q) return true;
        return [payment.invoice, payment.company, payment.opportunity, payment.customer, payment.salesperson, payment.method, payment.status]
          .some((val) => String(val || '').toLowerCase().includes(q));
      })
      .filter((payment) => filters.status === 'All' || payment.status === filters.status)
      .filter((payment) => filters.method === 'All' || payment.method === filters.method)
      .filter((payment) => filters.company === 'All' || payment.company === filters.company)
      .filter((payment) => filters.salesperson === 'All' || payment.salesperson === filters.salesperson)
      .filter((payment) => !filters.from || payment.date >= filters.from)
      .filter((payment) => !filters.to || payment.date <= filters.to);
  }, [payments, filters, globalSearch]);

  const paymentSummary = useMemo(() => ({
    total: payments.length,
    paid: payments.filter((payment) => payment.status === 'Paid').length,
    partial: payments.filter((payment) => payment.status === 'Partially Paid').length,
    unpaid: payments.filter((payment) => payment.status === 'Unpaid').length,
  }), [payments]);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const updateDateRange = (dateRange) => setFilters((current) => ({ ...current, ...buildPaymentDateRange(dateRange) }));

  const openRecord = () => {
    setDrawer('record');
    setSelected(null);
    setForm({
      company: '',
      companyId: '',
      opportunity: '',
      opportunityId: '',
      invoice: '',
      amount: '',
      paid: '',
      method: 'Cash',
      reference: '',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setMessage('');
  };

  const openView = async (payment) => {
    try {
      const res = await apiGet(`/api/payments/${payment.backendId || payment.id}/`);
      if (res.success && res.data) {
        const detailed = paymentBackendToUi(res.data);
        detailed.transactions = res.data.transactions || [];
        detailed.payment_history = res.data.payment_history || [];
        setSelected(detailed);
        setDrawer('view');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to retrieve detailed payment record.');
    }
  };

  const openEdit = (payment) => {
    setDrawer('edit');
    setForm({
      backendId: payment.backendId || payment.id,
      amount: String(payment.amount),
      notes: payment.notes || '',
    });
    setMessage('');
  };

  const save = async (event) => {
    event.preventDefault();
    if (drawer === 'record') {
      if (!form.opportunityId || !String(form.amount).trim() || !String(form.paid).trim() || !form.method.trim() || !form.date.trim()) {
        setMessage('Opportunity, Total Amount, Amount Received, Payment Method, and Payment Date are required.');
        return;
      }
      try {
        const res = await authRequest('/api/payments/', {
          method: 'POST',
          body: JSON.stringify({
            company: Number(form.companyId),
            opportunity: Number(form.opportunityId),
            total_amount: Number(form.amount),
            amount_received: Number(form.paid),
            payment_method: form.method.toUpperCase().replace(/\s+/g, '_'),
            transaction_reference: form.reference || '',
            payment_date: form.date,
            notes: form.notes || '',
          })
        });
        if (res.success) {
          fetchPayments();
          setDrawer(null);
          setMessage('Payment recorded successfully.');
        }
      } catch (err) {
        setMessage(err.message || 'Failed to record payment.');
      }
    } else if (drawer === 'edit') {
      try {
        const res = await authRequest(`/api/payments/${form.backendId}/`, {
          method: 'PUT',
          body: JSON.stringify({
            total_amount: Number(form.amount),
            notes: form.notes || '',
          })
        });
        if (res.success) {
          fetchPayments();
          setDrawer(null);
          setMessage('Payment updated successfully.');
        }
      } catch (err) {
        setMessage(err.message || 'Failed to update payment.');
      }
    }
  };

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

  const downloadPaymentDocument = async (payment, docType) => {
    try {
      const backendId = payment.backendId || payment.id;
      const csrfToken = getCookie('csrftoken');
      const res = await fetch(`${API_BASE_URL}/api/payments/${backendId}/${docType}/`, {
        credentials: 'include',
        headers: {
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to download ${docType} (HTTP ${res.status}).`);
      }

      const disposition = res.headers.get('Content-Disposition') || '';
      let filename = `${docType === 'invoice' ? 'Invoice' : 'Receipt'}_${payment.invoice || backendId}`;
      const match = disposition.match(/filename=["']?([^"';]+)["']?/);
      if (match && match[1]) {
        filename = match[1];
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setMessage(err.message || `Failed to download ${docType}.`);
    }
  };

  const downloadInvoice = (payment) => downloadPaymentDocument(payment, 'invoice');

  const printReceipt = (payment) => downloadPaymentDocument(payment, 'receipt');

  const deletePayment = async (payment) => {
    if (!window.confirm(`Are you sure you want to delete payment invoice ${payment.invoice}?`)) return;
    try {
      const res = await authRequest(`/api/payments/${payment.backendId || payment.id}/`, {
        method: 'DELETE'
      });
      if (res.success) {
        fetchPayments();
        setDrawer(null);
        setMessage('Payment deleted successfully.');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to delete payment.');
    }
  };

  const openRecordInstalment = () => {
    setInstalmentForm({
      amount_received: '',
      payment_method: 'Cash',
      transaction_reference: '',
      payment_date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setInstalmentModalOpen(true);
  };

  const saveInstalment = async (event) => {
    event.preventDefault();
    if (!instalmentForm.amount_received || !instalmentForm.payment_date) {
      setMessage('Amount received and Payment date are required.');
      return;
    }
    try {
      const res = await authRequest('/api/payments/', {
        method: 'POST',
        body: JSON.stringify({
          payment_id: selected.backendId,
          amount_received: Number(instalmentForm.amount_received),
          payment_method: instalmentForm.payment_method.toUpperCase().replace(/\s+/g, '_'),
          transaction_reference: instalmentForm.transaction_reference || '',
          payment_date: instalmentForm.payment_date,
          notes: instalmentForm.notes || '',
        })
      });
      if (res.success) {
        setInstalmentModalOpen(false);
        openView(selected); // refresh detail view
        fetchPayments(); // refresh list
        setMessage('Transaction instalment recorded successfully.');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to record instalment.');
    }
  };

  if (loading && payments.length === 0) {
    return <div className="text-slate-400 p-8 text-center font-semibold animate-pulse">Loading payments workspace from server...</div>;
  }

  if (drawer === 'record') {
    return (
      <PaymentFormPage
        title="Record Payment"
        description="Create a new payment record."
        form={form}
        setForm={setForm}
        opportunitiesList={opportunitiesList}
        onSubmit={save}
        onCancel={() => setDrawer(null)}
        submitLabel="Save Payment"
      />
    );
  }

  if (drawer === 'view' && selected) {
    return (
      <PaymentDetailPage
        payment={selected}
        onBack={() => setDrawer(null)}
        onEdit={() => openEdit(selected)}
        onDelete={() => deletePayment(selected)}
        onRecordInstalment={openRecordInstalment}
        canEdit={canEdit}
        canDelete={canDelete}
        downloadInvoice={downloadInvoice}
        printReceipt={printReceipt}
        instalmentModalOpen={instalmentModalOpen}
        instalmentForm={instalmentForm}
        setInstalmentForm={setInstalmentForm}
        saveInstalment={saveInstalment}
        setInstalmentModalOpen={setInstalmentModalOpen}
      />
    );
  }

  return (
    <section className="page salesforce-leads salesforce-payments">
      <div className="sf-list-panel">
        <section className="payment-merged-panel" aria-label="Payment summary and filters">
          <div className="crm-summary-strip payment-summary-strip">
            <article>
              <span>Total Payments</span>
              <strong>{paymentSummary.total}</strong>
            </article>
            <article>
              <span>Paid</span>
              <strong className="payment-summary-blue">{paymentSummary.paid}</strong>
            </article>
            <article>
              <span>Partially Paid</span>
              <strong className="payment-summary-green">{paymentSummary.partial}</strong>
            </article>
            <article>
              <span>Unpaid</span>
              <strong className="payment-summary-cyan">{paymentSummary.unpaid}</strong>
            </article>
          </div>

          <div className="payment-filter-row">
            <SearchableSelect className="payment-inline-filter payment-status-filter" label="Status" value={filters.status} options={paymentStatuses} onChange={(status) => updateFilter('status', status)} placeholder="Search status" />
            <SearchableSelect className="payment-inline-filter payment-method-filter" label="Method" value={filters.method} options={paymentMethods} onChange={(method) => updateFilter('method', method)} placeholder="Search method" />
            <SearchableSelect className="payment-inline-filter payment-date-filter" label="Date range" value={filters.dateRange} options={paymentDateRangeOptions} onChange={updateDateRange} placeholder="Search date range" />
            {canCreate && <button className="payment-record-btn" type="button" onClick={openRecord}><PlusCircle size={17} />New Payment</button>}
          </div>
        </section>
        <Table
          columns={[['serialNo', 'SR#'], ['invoice', 'Invoice No'], ['date', 'Date'], ['company', 'Company'], ['opportunity', 'Opportunity'], ['amount', 'Amount'], ['paid', 'Paid'], ['balance', 'Balance'], ['status', 'Status']]}
          rows={rows.map((payment, index) => ({ ...payment, serialNo: index + 1, amount: formatCurrency(payment.amount), paid: formatCurrency(payment.paid), balance: formatCurrency(payment.balance) }))}
          onRowClick={(payment) => openView(payments.find((item) => item.id === payment.id) || payment)}
          renderCell={(payment, key, value) => {
            if (key === 'status') {
              return <span className={`pill ${String(value).replace(/\s+/g, '-').toLowerCase()}`}>{value}</span>;
            }
            if (key === 'serialNo') return value;
            return value || '-';
          }}
          actions={(payment) => {
            const original = payments.find((item) => item.id === payment.id) || payment;
            return (
              <Actions>
                <IconButton label="Download Invoice" onClick={() => downloadInvoice(original)}><Download size={15} /></IconButton>
                <IconButton label="Print Receipt" onClick={() => printReceipt(original)}><Printer size={15} /></IconButton>
              </Actions>
            );
          }}
          empty={<Empty title="No Payment Records Found" action="Payments will appear after opportunity is won" onAction={() => setMessage('No Payment Records Found - Payments will appear after opportunity is won.')} />}
        />
      </div>
      {drawer === 'edit' && (
        <Modal title="Edit Payment" onClose={() => setDrawer(null)}>
          <PaymentEditForm form={form} setForm={setForm} onSubmit={save} onCancel={() => setDrawer(null)} submitLabel="Save Changes" isEdit />
        </Modal>
      )}
    </section>
  );
}

function buildPaymentDateRange(dateRange) {
  const today = new Date();
  const formatDate = (date) => date.toISOString().slice(0, 10);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  if (dateRange === 'Today') {
    const value = formatDate(today);
    return { dateRange, from: value, to: value };
  }

  if (dateRange === 'Last 7 Days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { dateRange, from: formatDate(start), to: formatDate(today) };
  }

  if (dateRange === 'This Month') {
    return { dateRange, from: formatDate(startOfMonth), to: formatDate(today) };
  }

  return { dateRange: 'All', from: '', to: '' };
}

function PaymentFormPage({ title, description, form, setForm, opportunitiesList, onSubmit, onCancel, submitLabel }) {
  return (
    <div className="lf-page leads-page payment-form-page">
      <section className="lead-form-page contact-form-page">
        <div className="lead-form-page-card">
          <header className="lead-form-page-head">
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <button type="button" className="lead-form-back" aria-label="Back" title="Back" onClick={onCancel}><ArrowLeft size={22} /></button>
          </header>
          <PaymentEditForm form={form} setForm={setForm} opportunitiesList={opportunitiesList} onSubmit={onSubmit} onCancel={onCancel} submitLabel={submitLabel} />
        </div>
      </section>
    </div>
  );
}

function PaymentDetailPage({
  payment,
  onBack,
  onEdit,
  onDelete,
  onRecordInstalment,
  canEdit = true,
  canDelete = true,
  downloadInvoice,
  printReceipt,
  instalmentModalOpen,
  instalmentForm,
  setInstalmentForm,
  saveInstalment,
  setInstalmentModalOpen,
}) {
  if (!payment) return null;

  // Status Badge styling helper
  const getStatusBadgeStyle = () => {
    const s = String(payment.status || '').toLowerCase();
    if (s.includes('paid') && !s.includes('partially')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('partially') || s.includes('partial')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const totalVal = Number(payment.amount || 0);
  const paidVal = Number(payment.paid || 0);
  const balanceVal = Number(payment.balance || 0);

  return (
    <div className="lf-page leads-page payment-detail-page">
      <section className="payment-record-detail lead-details-redesign" aria-label="Payment details">
        {/* ── HERO HEADER ── */}
        <header className="lead-drawer-hero">
          <div className="lead-hero-left">
            <button type="button" className="lead-hero-back-btn" aria-label="Back" title="Back" onClick={onBack}>
              <ArrowLeft size={20} />
            </button>

            <div className="lead-avatar-circle payment-avatar-gradient">
              <CreditCard size={22} />
            </div>

            <div className="lead-hero-title-block">
              <div className="lead-hero-title-row">
                <h2>Invoice {payment.invoice || `PAY-${payment.id}`}</h2>
                <span className={`lead-status-pill ${getStatusBadgeStyle()}`}>
                  {payment.status || 'Unpaid'}
                </span>
                <span className="lead-code-pill">
                  {payment.company ? payment.company : 'Corporate Account'}
                </span>
              </div>

              <p className="lead-hero-subtitle">
                {payment.opportunity ? (
                  <>
                    <Briefcase size={14} className="inline-icon mr-1" />
                    <strong>Deal: {payment.opportunity}</strong>
                    <span className="mx-2">•</span>
                  </>
                ) : null}
                Assigned Rep: {payment.salesperson || payment.ownerName || 'Unassigned'}
              </p>
            </div>
          </div>

          <div className="lead-record-actions flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="payment-record-edit bg-emerald-600 text-white hover:bg-emerald-700 border-none px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5"
              onClick={() => onRecordInstalment && onRecordInstalment()}
            >
              <PlusCircle size={14} /> Record Instalment
            </button>

            <button
              type="button"
              className="button secondary sm text-xs flex items-center gap-1.5"
              onClick={() => downloadInvoice && downloadInvoice(payment)}
            >
              <Download size={14} /> Invoice PDF
            </button>

            <button
              type="button"
              className="button secondary sm text-xs flex items-center gap-1.5"
              onClick={() => printReceipt && printReceipt(payment)}
            >
              <Printer size={14} /> Receipt PDF
            </button>

            {canEdit && (
              <button type="button" className="payment-record-edit" onClick={onEdit}>
                <Edit3 size={14} /> Edit Invoice
              </button>
            )}

            {canDelete && (
              <button type="button" className="lead-record-lost" onClick={onDelete}>
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </header>

        {/* ── FINANCIAL SUMMARY METRICS ── */}
        <section className="payment-record-summary lead-redesign-summary" aria-label="Payment summary metrics">
          <div>
            <span>Total Invoice Value</span>
            <strong className="text-slate-900">${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div>
            <span>Amount Received (Paid)</span>
            <strong className="text-emerald-600">${paidVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div>
            <span>Remaining Balance</span>
            <strong className={balanceVal > 0 ? 'text-amber-600' : 'text-slate-700'}>
              ${balanceVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
          <div>
            <span>Invoice Status</span>
            <strong className="text-indigo-600">{payment.status || 'Unpaid'}</strong>
          </div>
        </section>

        {/* ── DETAILED INFORMATION CARDS ── */}
        <div className="lead-overview-cards-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* Card 1: Invoice & Account Parameters (Premium Redesign) */}
          <section className="lead-card-box payment-parameters-card">
            <header className="lead-card-box-head">
              <FileText size={16} className="text-emerald-600" />
              <h3>Invoice & Account Parameters</h3>
            </header>

            <div className="payment-param-grid">
              {/* Row 1: Invoice Number & Date */}
              <div className="payment-param-item">
                <div className="payment-param-icon bg-emerald-50 text-emerald-600">
                  <Hash size={15} />
                </div>
                <div className="payment-param-text">
                  <span className="payment-param-label">Invoice Number</span>
                  <strong className="payment-param-value text-emerald-700 font-mono">
                    {payment.invoice || `PAY-${payment.id}`}
                  </strong>
                </div>
              </div>

              <div className="payment-param-item">
                <div className="payment-param-icon bg-slate-100 text-slate-600">
                  <Calendar size={15} />
                </div>
                <div className="payment-param-text">
                  <span className="payment-param-label">Invoice Date</span>
                  <strong className="payment-param-value">
                    {payment.date || '-'}
                  </strong>
                </div>
              </div>

              {/* Row 2: Company & Opportunity */}
              <div className="payment-param-item">
                <div className="payment-param-icon bg-indigo-50 text-indigo-600">
                  <Building2 size={15} />
                </div>
                <div className="payment-param-text">
                  <span className="payment-param-label">Company Account</span>
                  <strong className="payment-param-value">
                    {payment.company || '-'}
                  </strong>
                </div>
              </div>

              <div className="payment-param-item">
                <div className="payment-param-icon bg-amber-50 text-amber-600">
                  <Briefcase size={15} />
                </div>
                <div className="payment-param-text">
                  <span className="payment-param-label">Related Opportunity</span>
                  <strong className="payment-param-value">
                    {payment.opportunity || '-'}
                  </strong>
                </div>
              </div>

              {/* Row 3: Primary Contact & Salesperson */}
              <div className="payment-param-item">
                <div className="payment-param-icon bg-purple-50 text-purple-600">
                  <User size={15} />
                </div>
                <div className="payment-param-text">
                  <span className="payment-param-label">Primary Contact</span>
                  <strong className="payment-param-value">
                    {payment.customer || '-'}
                  </strong>
                </div>
              </div>

              <div className="payment-param-item">
                <div className="payment-param-icon bg-blue-50 text-blue-600">
                  <User size={15} />
                </div>
                <div className="payment-param-text">
                  <span className="payment-param-label">Assigned Salesperson</span>
                  <strong className="payment-param-value">
                    {payment.salesperson || payment.ownerName || '-'}
                  </strong>
                </div>
              </div>

              {/* Row 4: Method & Transaction Reference */}
              <div className="payment-param-item">
                <div className="payment-param-icon bg-cyan-50 text-cyan-600">
                  <CreditCard size={15} />
                </div>
                <div className="payment-param-text">
                  <span className="payment-param-label">Payment Method</span>
                  <span className="lead-code-pill font-semibold">
                    {payment.method || 'Cash'}
                  </span>
                </div>
              </div>

              <div className="payment-param-item">
                <div className="payment-param-icon bg-slate-100 text-slate-600">
                  <Hash size={15} />
                </div>
                <div className="payment-param-text">
                  <span className="payment-param-label">Transaction Reference</span>
                  <strong className="payment-param-value font-mono text-slate-700">
                    {payment.reference || '-'}
                  </strong>
                </div>
              </div>

              {/* Organization */}
              {payment.organization ? (
                <div className="payment-param-item full-span">
                  <div className="payment-param-icon bg-slate-100 text-slate-600">
                    <Building2 size={15} />
                  </div>
                  <div className="payment-param-text">
                    <span className="payment-param-label">Organization</span>
                    <strong className="payment-param-value">
                      {payment.organization}
                    </strong>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* Card 2: Transactions & Instalment Ledger */}
          <section className="lead-card-box">
            <header className="lead-card-box-head">
              <CreditCard size={16} /> <h3>Transactions & Instalment Ledger</h3>
            </header>
            {payment.transactions && payment.transactions.length > 0 ? (
              <div className="contact-related-table-wrap">
                <table className="contact-related-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payment.transactions.map((txn) => (
                      <tr key={txn.id}>
                        <td>{txn.payment_date || '-'}</td>
                        <td><strong className="text-emerald-600">${Number(txn.amount || 0).toLocaleString()}</strong></td>
                        <td><span className="lead-code-pill">{normalizeLabel(txn.payment_method) || 'Cash'}</span></td>
                        <td><span className="font-mono text-xs text-indigo-600">{txn.transaction_reference || '-'}</span></td>
                        <td>{txn.recorded_by_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="lead-empty-state" style={{ padding: '24px' }}>
                <CreditCard size={32} />
                <h4>No Transactions Recorded</h4>
                <p>Click "Record Instalment" above to log payment transactions for this invoice.</p>
              </div>
            )}
          </section>

          {/* Card 3: Notes / Instructions (if notes exist) */}
          {payment.notes && (
            <section className="lead-card-box full-width">
              <header className="lead-card-box-head">
                <FileText size={16} /> <h3>Invoice Notes & Terms</h3>
              </header>
              <p className="text-sm text-slate-700 leading-relaxed margin-0">{payment.notes}</p>
            </section>
          )}

          {/* Card 4: Audit & Activity History Log (if history exists) */}
          {payment.payment_history && payment.payment_history.length > 0 && (
            <section className="lead-card-box full-width">
              <header className="lead-card-box-head">
                <Clock size={16} /> <h3>Audit & Activity Log</h3>
              </header>
              <ul className="lead-timeline-tree" style={{ padding: '8px 0 0 0' }}>
                {payment.payment_history.map((log, index) => (
                  <li key={index} className="lead-timeline-item">
                    <div className="lead-timeline-node">
                      <Clock size={14} />
                    </div>
                    <div className="lead-timeline-card">
                      <header className="lead-timeline-card-head">
                        <h4>{log.action}</h4>
                        <span className="lead-timeline-date">{new Date(log.created_at).toLocaleString()}</span>
                      </header>
                      <p className="lead-timeline-desc">
                        {log.description} {log.user_name ? `(Recorded by ${log.user_name})` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </section>

      {/* Instalment Recording Modal */}
      {instalmentModalOpen && (
        <Modal title="Record Instalment Transaction" onClose={() => setInstalmentModalOpen(false)}>
          <form className="form-grid" onSubmit={saveInstalment}>
            <label className="field">
              <span>Amount Received ($)*</span>
              <input type="number" step="0.01" value={instalmentForm.amount_received} onChange={(e) => setInstalmentForm({ ...instalmentForm, amount_received: e.target.value })} required />
            </label>
            <label className="field">
              <span>Payment Method*</span>
              <select value={instalmentForm.payment_method} onChange={(e) => setInstalmentForm({ ...instalmentForm, payment_method: e.target.value })}>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </label>
            <label className="field">
              <span>Transaction Reference</span>
              <input value={instalmentForm.transaction_reference} onChange={(e) => setInstalmentForm({ ...instalmentForm, transaction_reference: e.target.value })} placeholder="e.g. TXN-98214" />
            </label>
            <label className="field">
              <span>Payment Date*</span>
              <input type="date" value={instalmentForm.payment_date} onChange={(e) => setInstalmentForm({ ...instalmentForm, payment_date: e.target.value })} required />
            </label>
            <label className="field wide">
              <span>Notes</span>
              <textarea rows="3" value={instalmentForm.notes} onChange={(e) => setInstalmentForm({ ...instalmentForm, notes: e.target.value })} placeholder="Transaction details..." />
            </label>
            <PanelActions wide>
              <button type="button" className="button secondary" onClick={() => setInstalmentModalOpen(false)}>Cancel</button>
              <button type="submit" className="button primary">Record Transaction</button>
            </PanelActions>
          </form>
        </Modal>
      )}
    </div>
  );
}

function PaymentEditForm({ form, setForm, opportunitiesList = [], onSubmit, onCancel, submitLabel, isEdit = false }) {
  const wonOpps = opportunitiesList.filter(o => o.stage === 'WON' || o.won);

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      {isEdit ? (
        <>
          <label className="field">
            <span>Total Amount*</span>
            <input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          </label>
          <label className="field wide">
            <span>Notes</span>
            <textarea rows="4" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
        </>
      ) : (
        <>
          <label className="field">
            <span>Opportunity*</span>
            <select
              value={form.opportunityId || ''}
              onChange={(e) => {
                const oppId = Number(e.target.value);
                const opp = opportunitiesList.find((o) => o.id === oppId);
                setForm({
                  ...form,
                  opportunityId: oppId,
                  opportunity: opp ? opp.name : '',
                  companyId: opp ? opp.company : '',
                  company: opp ? opp.company_name : '',
                  amount: opp ? String(opp.amount) : '',
                });
              }}
            >
              <option value="">Select Won Opportunity</option>
              {wonOpps.map((opp) => (
                <option key={opp.id} value={opp.id}>
                  {opp.name} (${Number(opp.amount).toLocaleString()})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Company</span>
            <input value={form.company} readOnly />
          </label>
          <label className="field">
            <span>Total Amount*</span>
            <input value={form.amount} readOnly />
          </label>
          <label className="field">
            <span>Amount Received*</span>
            <input value={form.paid} onChange={(event) => setForm({ ...form, paid: event.target.value })} />
          </label>
          <label className="field">
            <span>Payment Method*</span>
            <select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Cheque">Cheque</option>
            </select>
          </label>
          <label className="field">
            <span>Transaction Reference</span>
            <input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} />
          </label>
          <label className="field">
            <span>Payment Date*</span>
            <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </label>
          <label className="field wide">
            <span>Notes</span>
            <textarea rows="4" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
        </>
      )}
      <PanelActions wide>
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="button primary">{submitLabel}</button>
      </PanelActions>
    </form>
  );
}
