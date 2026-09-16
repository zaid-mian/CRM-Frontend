import React, { useEffect, useState, useMemo } from 'react';
import {
  CreditCard,
  PlusCircle,
  Search,
  CheckCircle,
  Clock,
  DollarSign,
  User,
  Calendar,
  FileText,
  X,
  AlertCircle,
  ArrowRight,
  Layers,
} from 'lucide-react';
import {
  fetchPayments,
  recordPayment,
  allocatePayment,
  fetchBillingCustomers,
  fetchInvoices,
} from '../utils/billingApi';
import { PaymentMethodDrawer } from '../components/PaymentMethodDrawer';


export default function BillingPaymentsPage({ currentUser, setMessage }) {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null);
  const [attachMethodCustomer, setAttachMethodCustomer] = useState(null);


  // Record Payment Modal State
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordStep, setRecordStep] = useState(1); // 1: Payment Info, 2: Allocation
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [gatewayTxId, setGatewayTxId] = useState('');
  const [notes, setNotes] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Allocations mapping: invoiceId -> amount (string)
  const [allocationsInput, setAllocationsInput] = useState({});

  // Allocate Existing Payment Modal State
  const [allocateModalPayment, setAllocateModalPayment] = useState(null);
  const [allocatingExisting, setAllocatingExisting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsData, customersData, invoicesData] = await Promise.all([
        fetchPayments(),
        fetchBillingCustomers(),
        fetchInvoices(),
      ]);
      setPayments(paymentsData);
      setCustomers(customersData);
      setInvoices(invoicesData);
    } catch (err) {
      setMessage(`Error loading payments: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (p.payment_number && p.payment_number.toLowerCase().includes(searchLower)) ||
        (p.customer_name && p.customer_name.toLowerCase().includes(searchLower)) ||
        (p.gateway_transaction_id && p.gateway_transaction_id.toLowerCase().includes(searchLower));

      const matchesCustomer = !customerFilter || String(p.customer) === String(customerFilter);

      return matchesSearch && matchesCustomer;
    });
  }, [payments, searchTerm, customerFilter]);

  // KPI Calculations
  const kpis = useMemo(() => {
    let totalReceived = 0;
    let totalAllocated = 0;
    let totalUnallocated = 0;

    payments.forEach((p) => {
      totalReceived += parseFloat(p.amount || 0);
      totalUnallocated += parseFloat(p.unallocated_amount || 0);
      totalAllocated += parseFloat(p.allocated_amount || 0);
    });

    return {
      received: totalReceived.toFixed(2),
      allocated: totalAllocated.toFixed(2),
      unallocated: totalUnallocated.toFixed(2),
    };
  }, [payments]);

  // Available outstanding invoices for selected customer
  const customerOutstandingInvoices = useMemo(() => {
    if (!selectedCustomerId) return [];
    return invoices.filter(
      (inv) =>
        String(inv.customer) === String(selectedCustomerId) &&
        (inv.status === 'POSTED' || inv.status === 'PARTIALLY_PAID') &&
        parseFloat(inv.balance) > 0
    );
  }, [invoices, selectedCustomerId]);

  // Record Modal Step 2 Live Calculations
  const recordAllocationsSummary = useMemo(() => {
    const totalPayment = parseFloat(paymentAmount || 0);
    let totalAllocated = 0;

    Object.entries(allocationsInput).forEach(([invId, amtStr]) => {
      const amt = parseFloat(amtStr || 0);
      if (!isNaN(amt) && amt > 0) {
        totalAllocated += amt;
      }
    });

    const remainingUnallocated = Math.max(0, totalPayment - totalAllocated);

    return {
      totalPayment: totalPayment.toFixed(2),
      totalAllocated: totalAllocated.toFixed(2),
      remainingUnallocated: remainingUnallocated.toFixed(2),
    };
  }, [paymentAmount, allocationsInput]);

  const handleOpenRecordModal = () => {
    setSelectedCustomerId(customers[0]?.id ? String(customers[0].id) : '');
    setPaymentAmount('');
    setPaymentMethod('BANK_TRANSFER');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setGatewayTxId('');
    setNotes('');
    setAllocationsInput({});
    setRecordStep(1);
    setShowRecordModal(true);
  };

  const handleNextStep = () => {
    if (!selectedCustomerId) {
      setMessage('Please select a customer.');
      return;
    }
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setMessage('Please enter a valid payment amount greater than zero.');
      return;
    }
    setRecordStep(2);
  };

  const handleAllocationInputChange = (invId, val, maxBalance) => {
    const numVal = parseFloat(val);
    if (val !== '' && !isNaN(numVal) && numVal > parseFloat(maxBalance)) {
      setMessage(`Allocation cannot exceed invoice remaining balance ($${maxBalance}).`);
      return;
    }
    setAllocationsInput((prev) => ({
      ...prev,
      [invId]: val,
    }));
  };

  const handleSavePaymentWithAllocations = async () => {
    setSavingPayment(true);
    try {
      // 1. Record Payment receipt
      const createdPay = await recordPayment({
        customer: parseInt(selectedCustomerId, 10),
        amount: parseFloat(paymentAmount).toFixed(2),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        gateway_transaction_id: gatewayTxId,
        notes: notes,
      });

      // 2. Build allocation payload
      const validAllocations = [];
      Object.entries(allocationsInput).forEach(([invId, amtStr]) => {
        const amt = parseFloat(amtStr || 0);
        if (!isNaN(amt) && amt > 0) {
          validAllocations.push({
            invoice_id: parseInt(invId, 10),
            amount: amt.toFixed(2),
          });
        }
      });

      if (validAllocations.length > 0) {
        await allocatePayment(createdPay.id, { allocations: validAllocations });
      }

      setMessage(`Payment ${createdPay.payment_number} recorded and settled successfully.`);
      setShowRecordModal(false);
      loadData();
    } catch (err) {
      setMessage(`Error recording payment: ${err.message}`);
    } finally {
      setSavingPayment(false);
    }
  };

  // Open Allocate Modal for Existing Payment
  const handleOpenAllocateModal = (payment) => {
    setAllocateModalPayment(payment);
    setSelectedCustomerId(String(payment.customer));
    setAllocationsInput({});
  };

  const handleSaveAllocateExisting = async () => {
    if (!allocateModalPayment) return;
    setAllocatingExisting(true);
    try {
      const validAllocations = [];
      Object.entries(allocationsInput).forEach(([invId, amtStr]) => {
        const amt = parseFloat(amtStr || 0);
        if (!isNaN(amt) && amt > 0) {
          validAllocations.push({
            invoice_id: parseInt(invId, 10),
            amount: amt.toFixed(2),
          });
        }
      });

      if (validAllocations.length === 0) {
        setMessage('Please specify an allocation amount for at least one invoice.');
        setAllocatingExisting(false);
        return;
      }

      await allocatePayment(allocateModalPayment.id, { allocations: validAllocations });
      setMessage(`Allocated funds for payment ${allocateModalPayment.payment_number} successfully.`);
      setAllocateModalPayment(null);
      loadData();
    } catch (err) {
      setMessage(`Error allocating payment: ${err.message}`);
    } finally {
      setAllocatingExisting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Payments & Allocation Ledger
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Record payment receipts, manage unallocated customer credit, and settle multi-invoice ledgers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setAttachMethodCustomer(customers[0] || null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '6px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <CreditCard size={18} /> Attach Payment Method
          </button>
          <button
            type="button"
            onClick={handleOpenRecordModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <PlusCircle size={18} /> Record Payment
          </button>
        </div>
      </div>


      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={{ padding: '20px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Total Payments Received</span>
            <DollarSign size={20} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '8px' }}>
            ${kpis.received}
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Total Invoice Settlements</span>
            <CheckCircle size={20} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#16a34a', marginTop: '8px' }}>
            ${kpis.allocated}
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Unallocated Customer Credit</span>
            <Clock size={20} style={{ color: '#d97706' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#d97706', marginTop: '8px' }}>
            ${kpis.unallocated}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '16px', backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search payment #, customer, reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '36px',
              paddingRight: '12px',
              paddingTop: '8px',
              paddingBottom: '8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
            }}
          />
        </div>

        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
            backgroundColor: '#ffffff',
            minWidth: '200px',
          }}
        >
          <option value="">All Customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Payments Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading payments...</div>
        ) : filteredPayments.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Payment #</th>
                <th style={{ padding: '12px 16px' }}>Customer</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Method</th>
                <th style={{ padding: '12px 16px' }}>Reference</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Allocated</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Unallocated Credit</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((pay) => {
                const unalloc = parseFloat(pay.unallocated_amount || 0);
                const hasCredit = unalloc > 0;

                return (
                  <tr key={pay.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1e293b' }}>
                      {pay.payment_number}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155' }}>
                      {pay.customer_name || `Customer #${pay.customer}`}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>
                      {pay.payment_date}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b', textTransform: 'capitalize' }}>
                      {(pay.payment_method || 'BANK_TRANSFER').replace('_', ' ')}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>
                      {pay.gateway_transaction_id || '-'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                      ${pay.amount}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>
                      ${pay.allocated_amount}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: hasCredit ? '#d97706' : '#64748b', fontWeight: '700' }}>
                      ${pay.unallocated_amount}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedPaymentDetail(pay)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Details
                        </button>
                        {hasCredit && (
                          <button
                            type="button"
                            onClick={() => handleOpenAllocateModal(pay)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            Allocate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <CreditCard size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#334155' }}>No Payments Found</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Click "Record Payment" to record a new payment receipt and settle outstanding customer invoices.
            </div>
          </div>
        )}
      </div>

      {/* Payment Detail Modal */}
      {selectedPaymentDetail && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '600px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Payment {selectedPaymentDetail.payment_number}
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Recorded on {selectedPaymentDetail.payment_date}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedPaymentDetail(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '20px 0' }}>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Customer</div>
                <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedPaymentDetail.customer_name}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Payment Method</div>
                <div style={{ fontWeight: '600', color: '#1e293b', textTransform: 'capitalize' }}>{(selectedPaymentDetail.payment_method || '').replace('_', ' ')}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Total Amount</div>
                <div style={{ fontWeight: '800', color: '#0f172a' }}>${selectedPaymentDetail.amount} {selectedPaymentDetail.currency}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Unallocated Credit</div>
                <div style={{ fontWeight: '800', color: '#d97706' }}>${selectedPaymentDetail.unallocated_amount} {selectedPaymentDetail.currency}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
              Allocations History
            </h4>
            {selectedPaymentDetail.allocations && selectedPaymentDetail.allocations.length > 0 ? (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '0', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', width: '40%' }}>Invoice #</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', width: '30%' }}>Amount Settled</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', width: '30%' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPaymentDetail.allocations.map((alloc) => (
                      <tr key={alloc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '600', color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {alloc.invoice_number}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                          ${alloc.amount}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                          {new Date(alloc.allocated_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                No allocations applied yet. All funds remain as unallocated credit.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setSelectedPaymentDetail(null)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '650px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Record Payment Receipt
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  {recordStep === 1 ? 'Step 1: Enter payment collection details' : 'Step 2: Allocate funds to outstanding invoices'}
                </p>
              </div>
              <button type="button" onClick={() => setShowRecordModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {recordStep === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '20px 0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Customer *
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customer_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Payment Amount ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    >
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="CASH">Cash</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      External Reference #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. WIRE-998811"
                      value={gatewayTxId}
                      onChange={(e) => setGatewayTxId(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional remittance notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>
            ) : (
              /* Step 2: Multi-Invoice Allocation Table & Live Preview */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '20px 0' }}>
                {/* Summary Banner */}
                <div style={{ padding: '14px 16px', borderRadius: '6px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: '600' }}>PAYMENT SUMMARY</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#0c4a6e' }}>
                      ${recordAllocationsSummary.totalPayment}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>TOTAL ALLOCATED</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#15803d' }}>
                      ${recordAllocationsSummary.totalAllocated}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#b45309', fontWeight: '600' }}>REMAINING CREDIT</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>
                      ${recordAllocationsSummary.remainingUnallocated}
                    </div>
                  </div>
                </div>

                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Outstanding Invoices
                </h4>

                {customerOutstandingInvoices.length > 0 ? (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', maxHeight: '240px', overflowY: 'auto', overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '0', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', width: '35%' }}>Invoice #</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', width: '20%' }}>Total</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', width: '20%' }}>Balance</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', width: '25%' }}>Allocate ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerOutstandingInvoices.map((inv) => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', fontWeight: '600', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {inv.invoice_number}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                              ${inv.total_amount}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#2563eb' }}>
                              ${inv.balance}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={allocationsInput[inv.id] || ''}
                                onChange={(e) => handleAllocationInputChange(inv.id, e.target.value, inv.balance)}
                                style={{ width: '100%', maxWidth: '110px', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', textAlign: 'right', boxSizing: 'border-box' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    No outstanding POSTED or PARTIALLY_PAID invoices for this customer.
                    Full payment amount will be recorded as unallocated customer credit.
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              {recordStep === 2 ? (
                <button
                  type="button"
                  onClick={() => setRecordStep(1)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', cursor: 'pointer' }}
                >
                  Back
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                {recordStep === 1 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Next: Allocations →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSavePaymentWithAllocations}
                    disabled={savingPayment}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: '600', cursor: 'pointer', opacity: savingPayment ? 0.7 : 1 }}
                  >
                    {savingPayment ? 'Saving...' : 'Confirm & Record Payment'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Modal for Existing Payment */}
      {allocateModalPayment && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '600px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Allocate Payment Credit ({allocateModalPayment.payment_number})
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Available Credit: <strong>${allocateModalPayment.unallocated_amount}</strong>
                </p>
              </div>
              <button type="button" onClick={() => setAllocateModalPayment(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ margin: '20px 0' }}>
              {customerOutstandingInvoices.length > 0 ? (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', maxHeight: '240px', overflowY: 'auto', overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '0', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', width: '35%' }}>Invoice #</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', width: '20%' }}>Total</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', width: '20%' }}>Balance</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', width: '25%' }}>Allocate ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerOutstandingInvoices.map((inv) => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: '600', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inv.invoice_number}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                            ${inv.total_amount}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#2563eb' }}>
                            ${inv.balance}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={allocationsInput[inv.id] || ''}
                              onChange={(e) => handleAllocationInputChange(inv.id, e.target.value, inv.balance)}
                              style={{ width: '100%', maxWidth: '100px', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', textAlign: 'right', boxSizing: 'border-box' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '6px', color: '#64748b' }}>
                  No outstanding invoices found for this customer.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => setAllocateModalPayment(null)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAllocateExisting}
                disabled={allocatingExisting || customerOutstandingInvoices.length === 0}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '600', cursor: 'pointer', opacity: allocatingExisting ? 0.7 : 1 }}
              >
                {allocatingExisting ? 'Allocating...' : 'Apply Allocations'}
              </button>
            </div>
          </div>
        </div>
      )}

      {attachMethodCustomer && (

        <PaymentMethodDrawer
          customer={attachMethodCustomer}
          onClose={() => setAttachMethodCustomer(null)}
          onSuccess={(res) => {
            setMessage(`Stripe payment method attached successfully! (ID: ${res.payment_method_id})`);
            loadData();
          }}
        />
      )}
    </div>
  );
}

