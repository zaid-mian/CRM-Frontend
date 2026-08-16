import React, { useMemo, useState } from 'react';
import { ArrowLeft, Download, PlusCircle, Printer } from 'lucide-react';
import { Actions, DetailBlock, DetailGrid, Empty, IconButton, Modal, PanelActions, SearchableSelect, Table } from '../components/ui';
import { PaymentDrawer } from '../components/drawers';
import { emptyPayment, paymentMethods, paymentStatuses } from '../data/crmData';
import { formatCurrency, paymentToForm } from '../utils/format';

const paymentDateRangeOptions = ['All', 'Today', 'Last 7 Days', 'This Month'];

export default function PaymentsPage({ payments, setPayments, setMessage, canCreate = true, canEdit = true, canDelete = true }) {
  const [filters, setFilters] = useState({ status: 'All', method: 'All', company: 'All', salesperson: 'All', dateRange: 'All', from: '', to: '' });
  const [drawer, setDrawer] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyPayment);

  const rows = useMemo(() => payments
    .filter((payment) => filters.status === 'All' || payment.status === filters.status)
    .filter((payment) => filters.method === 'All' || payment.method === filters.method)
    .filter((payment) => filters.company === 'All' || payment.company === filters.company)
    .filter((payment) => filters.salesperson === 'All' || payment.salesperson === filters.salesperson)
    .filter((payment) => !filters.from || payment.date >= filters.from)
    .filter((payment) => !filters.to || payment.date <= filters.to), [payments, filters]);
  const paymentSummary = useMemo(() => ({
    total: payments.length,
    paid: payments.filter((payment) => payment.status === 'Paid').length,
    partial: payments.filter((payment) => payment.status === 'Partially Paid').length,
    unpaid: payments.filter((payment) => payment.status === 'Unpaid').length,
  }), [payments]);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const updateDateRange = (dateRange) => setFilters((current) => ({ ...current, ...buildPaymentDateRange(dateRange) }));
  const openRecord = () => { setDrawer('record'); setSelected(null); setForm({ ...emptyPayment, invoice: `INV-2026-${String(payments.length + 1).padStart(3, '0')}` }); setMessage(''); };
  const openView = (payment) => { setDrawer('view'); setSelected(payment); setForm(paymentToForm(payment)); setMessage(''); };
  const openEdit = (payment) => { setDrawer('edit'); setSelected(payment); setForm(paymentToForm(payment)); setMessage(''); };

  const save = (event) => {
    event.preventDefault();
    if (!form.company.trim() || !form.opportunity.trim() || !String(form.amount).trim() || !String(form.paid).trim() || !form.method.trim() || !form.date.trim()) {
      setMessage('Company, Opportunity, Total Amount, Amount Received, Payment Method, and Payment Date are required.');
      return;
    }
    const amount = Number(form.amount);
    const paid = Number(form.paid);
    if (paid > amount) {
      setMessage('Payment processing failed.');
      return;
    }
    const status = paid === 0 ? 'Unpaid' : paid < amount ? 'Partially Paid' : 'Paid';
    const payment = { ...form, amount, paid, balance: amount - paid, status, customer: 'Customer', salesperson: 'Ali Raza', id: selected?.id || `PAY-${4000 + payments.length + 1}` };
    if (drawer === 'edit' && selected) {
      setPayments((current) => current.map((item) => item.id === selected.id ? payment : item));
      setMessage('Payment updated successfully.');
    } else {
      setPayments((current) => [payment, ...current]);
      setMessage('Payment recorded successfully.');
    }
    setDrawer(null);
  };

  if (drawer === 'record') {
    return (
      <PaymentFormPage
        title="Record Payment"
        description="Create a new payment record."
        form={form}
        setForm={setForm}
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
      canEdit={canEdit}
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
              return <span className={`pill ${String(value).toLowerCase()}`}>{value}</span>;
            }
            if (key === 'serialNo') return value;
            return value || '-';
          }}
          actions={(payment) => {
            const original = payments.find((item) => item.id === payment.id) || payment;
            return (
              <Actions>
                <IconButton label="Download Invoice" onClick={() => setMessage('Invoice download requested.')}><Download size={15} /></IconButton>
                <IconButton label="Print Receipt" onClick={() => setMessage('Receipt print requested.')}><Printer size={15} /></IconButton>
              </Actions>
            );
          }}
          empty={<Empty title="No Payment Records Found" action="Payments will appear after opportunity is won" onAction={() => setMessage('No Payment Records Found - Payments will appear after opportunity is won.')} />}
        />
      </div>
      {drawer === 'edit' && (
        <Modal title="Edit Payment" onClose={() => setDrawer(null)}>
          <PaymentEditForm form={form} setForm={setForm} onSubmit={save} onCancel={() => setDrawer(null)} submitLabel="Save Changes" />
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

function PaymentFormPage({ title, description, form, setForm, onSubmit, onCancel, submitLabel }) {
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
          <PaymentEditForm form={form} setForm={setForm} onSubmit={onSubmit} onCancel={onCancel} submitLabel={submitLabel} />
        </div>
      </section>
    </div>
  );
}

function PaymentDetailPage({
  payment,
  onBack,
  onEdit,
  canEdit = true,
}) {
  return (
    <div className="lf-page leads-page payment-detail-page">
      <section className="payment-record-detail" aria-label="Payment details">
        <header className="payment-record-header">
          <button type="button" className="payment-record-back" aria-label="Back" title="Back" onClick={onBack}><ArrowLeft size={22} /></button>
          <div>
            <h2>{payment.invoice || 'Payment Details'}</h2>
            <p>{payment.company || '-'} / {payment.opportunity || '-'}</p>
          </div>
          {canEdit && <button className="payment-record-edit" type="button" onClick={onEdit}>Edit</button>}
        </header>

        <section className="payment-record-summary" aria-label="Payment summary">
          <div>
            <span>Total Amount</span>
            <strong>{formatCurrency(payment.amount)}</strong>
          </div>
          <div>
            <span>Paid</span>
            <strong>{formatCurrency(payment.paid)}</strong>
          </div>
          <div>
            <span>Remaining Balance</span>
            <strong>{formatCurrency(payment.balance)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{payment.status}</strong>
          </div>
        </section>

        <div className="payment-record-sections lead-primary-sections">
          <section className="payment-record-section">
            <h3>Payment Information</h3>
            <dl>
              <div><dt>Invoice</dt><dd>{payment.invoice || '-'}</dd></div>
              <div><dt>Total Amount</dt><dd>{formatCurrency(payment.amount)}</dd></div>
              <div><dt>Paid</dt><dd>{formatCurrency(payment.paid)}</dd></div>
              <div><dt>Remaining Balance</dt><dd>{formatCurrency(payment.balance)}</dd></div>
              <div><dt>Status</dt><dd>{payment.status || '-'}</dd></div>
              <div><dt>Date</dt><dd>{payment.date || '-'}</dd></div>
              <div><dt>Method</dt><dd>{payment.method || '-'}</dd></div>
              <div><dt>Reference</dt><dd>{payment.reference || 'Not recorded'}</dd></div>
              <div><dt>Company</dt><dd>{payment.company || '-'}</dd></div>
              <div><dt>Opportunity</dt><dd>{payment.opportunity || '-'}</dd></div>
              <div><dt>Customer</dt><dd>{payment.customer || '-'}</dd></div>
              <div><dt>Salesperson</dt><dd>{payment.salesperson || '-'}</dd></div>
            </dl>
          </section>
        </div>

        <section className="payment-record-section payment-record-history">
          <h3>Payment History</h3>
          <p>{payment.date}: {formatCurrency(payment.paid)} recorded through {payment.method}.</p>
        </section>
      </section>
    </div>
  );
}

function PaymentEditForm({ form, setForm, onSubmit, onCancel, submitLabel }) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label className="field">
        <span>Company*</span>
        <input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} />
      </label>
      <label className="field">
        <span>Opportunity*</span>
        <input value={form.opportunity} onChange={(event) => setForm({ ...form, opportunity: event.target.value })} />
      </label>
      <label className="field">
        <span>Invoice Number</span>
        <input value={form.invoice} onChange={(event) => setForm({ ...form, invoice: event.target.value })} />
      </label>
      <label className="field">
        <span>Total Amount*</span>
        <input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
      </label>
      <label className="field">
        <span>Amount Received*</span>
        <input value={form.paid} onChange={(event) => setForm({ ...form, paid: event.target.value })} />
      </label>
      <SearchableSelect label="Payment Method*" value={form.method} options={paymentMethods.filter((item) => item !== 'All')} onChange={(method) => setForm({ ...form, method })} placeholder="Search method" />
      <label className="field">
        <span>Transaction Reference</span>
        <input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} />
      </label>
      <label className="field">
        <span>Payment Date*</span>
        <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        <small>Format: yyyy-mm-dd</small>
      </label>
      <label className="field wide">
        <span>Notes</span>
        <textarea rows="4" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </label>
      <PanelActions wide>
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="button primary">{submitLabel}</button>
      </PanelActions>
    </form>
  );
}
