/**
 * Billing & Subscription System API Client
 * Connects frontend React components to Django REST API endpoints under /api/v1/billing/
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

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

export function formatBillingApiErrorMessage(payload) {
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
      } else if (typeof value === 'object' && value !== null) {
        messages.push(`${label}${JSON.stringify(value)}`);
      }
    });
    if (messages.length > 0) {
      return messages.join(' | ');
    }
  }

  return payload.message || payload.detail || 'Request failed.';
}

export async function billingRequest(path, options = {}) {
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

  if (response.status === 204) {
    return { success: true };
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok || payload.success === false) {
    const detailMsg = formatBillingApiErrorMessage(payload);
    const error = new Error(detailMsg);
    error.status = response.status;
    error.data = payload.errors || payload.data || payload;
    throw error;
  }

  return payload;
}

/* ============================================================================
 * CUSTOMER MANAGEMENT API (/api/v1/billing/customers/)
 * ============================================================================ */

/**
 * Fetch billing customers with optional search and external reference filtering
 * @param {Object} params - { search: string, external_reference_id: string }
 * @returns {Promise<Array>} Array of customer objects
 */
export async function fetchBillingCustomers(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search.trim());
  if (params.external_reference_id) query.append('external_reference_id', params.external_reference_id.trim());

  const qs = query.toString() ? `?${query.toString()}` : '';
  const data = await billingRequest(`/api/v1/billing/customers/${qs}`);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/**
 * Fetch a single billing customer by ID
 * @param {number|string} id - Customer primary key
 * @returns {Promise<Object>} Customer object
 */
export async function fetchBillingCustomer(id) {
  return billingRequest(`/api/v1/billing/customers/${id}/`);
}

/**
 * Create a new billing customer
 * @param {Object} customerData - Customer payload
 * @returns {Promise<Object>} Created customer object
 */
export async function createBillingCustomer(customerData) {
  return billingRequest('/api/v1/billing/customers/', {
    method: 'POST',
    body: JSON.stringify(customerData),
  });
}

/**
 * Update an existing billing customer (customer_number is immutable on backend)
 * @param {number|string} id - Customer primary key
 * @param {Object} customerData - Updated fields
 * @returns {Promise<Object>} Updated customer object
 */
export async function updateBillingCustomer(id, customerData) {
  return billingRequest(`/api/v1/billing/customers/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(customerData),
  });
}

/**
 * Soft-delete / deactivate a billing customer (sets is_active = False)
 * @param {number|string} id - Customer primary key
 * @returns {Promise<{success: boolean}>}
 */
export async function deactivateBillingCustomer(id) {
  return billingRequest(`/api/v1/billing/customers/${id}/`, {
    method: 'DELETE',
  });
}

/**
 * Reactivate a previously deactivated billing customer (sets is_active = True)
 * @param {number|string} id - Customer primary key
 * @returns {Promise<Object>} Updated customer object
 */
export async function reactivateBillingCustomer(id) {
  return billingRequest(`/api/v1/billing/customers/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: true }),
  });
}

/* ============================================================================
 * SUBSCRIPTION MANAGEMENT API (/api/v1/billing/subscriptions/)
 * ============================================================================ */

/**
 * Fetch subscriptions with optional filters
 * @param {Object} params - { search: string, status: string, customer: string, collection_method: string }
 * @returns {Promise<Array>} Array of subscription objects
 */
export async function fetchSubscriptions(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search.trim());
  if (params.status) query.append('status', params.status.trim());
  if (params.customer) query.append('customer', String(params.customer).trim());
  if (params.collection_method) query.append('collection_method', params.collection_method.trim());

  const qs = query.toString() ? `?${query.toString()}` : '';
  const data = await billingRequest(`/api/v1/billing/subscriptions/${qs}`);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/**
 * Fetch a single subscription detail by ID
 * @param {number|string} id - Subscription primary key
 * @returns {Promise<Object>} Subscription detail object with nested customer_details
 */
export async function fetchSubscription(id) {
  return billingRequest(`/api/v1/billing/subscriptions/${id}/`);
}

/**
 * Create a new subscription header
 * @param {Object} subscriptionData - Subscription payload
 * @returns {Promise<Object>} Created subscription object
 */
export async function createSubscription(subscriptionData) {
  return billingRequest('/api/v1/billing/subscriptions/', {
    method: 'POST',
    body: JSON.stringify(subscriptionData),
  });
}

/**
 * Update permitted header fields of a subscription
 * @param {number|string} id - Subscription primary key
 * @param {Object} subscriptionData - Fields to update
 * @returns {Promise<Object>} Updated subscription object
 */
export async function updateSubscription(id, subscriptionData) {
  return billingRequest(`/api/v1/billing/subscriptions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(subscriptionData),
  });
}

/* ============================================================================
 * SUBSCRIPTION ITEMS & CATALOG SELECTION API
 * ============================================================================ */

/**
 * Fetch available active catalog pricing plans
 * @returns {Promise<Array>} Array of available plan objects
 */
export async function fetchAvailablePlans() {
  const data = await billingRequest('/api/v1/billing/subscriptions/available-plans/');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

/**
 * Fetch available active catalog add-ons
 * @returns {Promise<Array>} Array of available add-on objects
 */
export async function fetchAvailableAddons() {
  const data = await billingRequest('/api/v1/billing/subscriptions/available-addons/');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

/**
 * Attach a new line item (Plan or Add-on) to a subscription
 * @param {number|string} subscriptionId - Parent subscription ID
 * @param {Object} itemData - Item payload { item_type, plan/addon, quantity, unit_price, etc. }
 * @returns {Promise<Object>} Created SubscriptionItem object
 */
export async function addSubscriptionItem(subscriptionId, itemData) {
  return billingRequest(`/api/v1/billing/subscriptions/${subscriptionId}/items/`, {
    method: 'POST',
    body: JSON.stringify(itemData),
  });
}

/**
 * Remove a line item from a subscription
 * @param {number|string} subscriptionId - Parent subscription ID
 * @param {number|string} itemId - Subscription item ID to remove
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteSubscriptionItem(subscriptionId, itemId) {
  return billingRequest(`/api/v1/billing/subscriptions/${subscriptionId}/items/${itemId}/`, {
    method: 'DELETE',
  });
}

/**
 * Execute a lifecycle state transition on a subscription
 * @param {number|string} id - Subscription primary key
 * @param {Object} transitionData - { to_status: string, reason?: string, metadata?: Object }
 * @returns {Promise<Object>} Updated subscription detail object
 */
export async function transitionSubscription(id, transitionData) {
  return billingRequest(`/api/v1/billing/subscriptions/${id}/transition/`, {
    method: 'POST',
    body: JSON.stringify(transitionData),
  });
}

/**
 * Cancel a subscription (IMMEDIATE or PERIOD_END)
 * @param {number|string} id - Subscription primary key
 * @param {Object} cancelData - { cancel_type: 'IMMEDIATE'|'PERIOD_END', reason: string }
 * @returns {Promise<Object>} Updated subscription detail object
 */
export async function cancelSubscription(id, cancelData) {
  return billingRequest(`/api/v1/billing/subscriptions/${id}/cancel/`, {
    method: 'POST',
    body: JSON.stringify(cancelData),
  });
}

/**
 * Pause a subscription immediately
 * @param {number|string} id - Subscription primary key
 * @param {Object} pauseData - { reason: string }
 * @returns {Promise<Object>} Updated subscription detail object
 */
export async function pauseSubscription(id, pauseData) {
  return billingRequest(`/api/v1/billing/subscriptions/${id}/pause/`, {
    method: 'POST',
    body: JSON.stringify(pauseData),
  });
}

/**
 * Resume a paused subscription immediately
 * @param {number|string} id - Subscription primary key
 * @returns {Promise<Object>} Updated subscription detail object
 */
export async function resumeSubscription(id) {
  return billingRequest(`/api/v1/billing/subscriptions/${id}/resume/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/**
 * Run scheduled subscription renewals (Admin / Manager)
 * @param {Object} data - { batch_size?: number }
 * @returns {Promise<Object>} Summary object { total_processed, renewed, skipped, cancelled, failed, errors }
 */
export async function runSubscriptionRenewals(data = {}) {
  return billingRequest('/api/v1/billing/subscriptions/run-renewals/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Fetch dunning logs history for a specific subscription
 * @param {number|string} subscriptionId - Subscription primary key
 * @returns {Promise<Array>} Array of DunningLog objects
 */
export async function fetchDunningHistory(subscriptionId) {
  const data = await billingRequest(`/api/v1/billing/subscriptions/${subscriptionId}/dunning-history/`);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

/**
 * Trigger administrative dunning retry processing (Admin / Manager)
 * @param {Object} data - Optional payload e.g. { force: boolean }
 * @returns {Promise<Object>} Results summary { processed, succeeded, failed, exhausted }
 */
export async function runDunningRetries(data = {}) {
  return billingRequest('/api/v1/billing/subscriptions/run-dunning/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Preview subscription amendment (Plan / Add-on change) with server proration calculation (Read-Only)
 * @param {number|string} subscriptionId - Subscription primary key
 * @param {Object} amendmentData - { new_plan_id?: number, add_ons?: Array, effective_date?: string }
 * @returns {Promise<Object>} Proration preview calculation result
 */
export async function previewSubscriptionAmendment(subscriptionId, amendmentData) {
  return billingRequest(`/api/v1/billing/subscriptions/${subscriptionId}/preview-amend/`, {
    method: 'POST',
    body: JSON.stringify(amendmentData),
  });
}

/**
 * Commit subscription amendment transactionally with server recalculation and audit logging
 * @param {number|string} subscriptionId - Subscription primary key
 * @param {Object} amendmentData - { new_plan_id?: number, add_ons?: Array, effective_date?: string, reason: string }
 * @returns {Promise<Object>} Committed amendment result with updated subscription and proration details
 */
export async function commitSubscriptionAmendment(subscriptionId, amendmentData) {
  return billingRequest(`/api/v1/billing/subscriptions/${subscriptionId}/amend/`, {
    method: 'POST',
    body: JSON.stringify(amendmentData),
  });
}


/* ============================================================================
 * INVOICE MANAGEMENT API (/api/v1/billing/invoices/)
 * ============================================================================ */

/**
 * Fetch invoices with optional search, status, customer, or subscription filtering
 * @param {Object} params - { search: string, status: string, customer: string, subscription: string }
 * @returns {Promise<Array>} Array of invoice objects
 */
export async function fetchInvoices(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search.trim());
  if (params.status) query.append('status', params.status.trim());
  if (params.customer) query.append('customer', String(params.customer).trim());
  if (params.subscription) query.append('subscription', String(params.subscription).trim());

  const qs = query.toString() ? `?${query.toString()}` : '';
  const data = await billingRequest(`/api/v1/billing/invoices/${qs}`);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/**
 * Fetch single invoice detail by ID
 * @param {number|string} id - Invoice primary key
 * @returns {Promise<Object>} Invoice detail object with nested lines and customer_details
 */
export async function fetchInvoice(id) {
  return billingRequest(`/api/v1/billing/invoices/${id}/`);
}

/**
 * Generate an invoice for a subscription (idempotent)
 * @param {Object} generateData - { subscription: number, billing_period_start?: string, issue_date?: string, due_date?: string }
 * @returns {Promise<Object>} Generated or existing Invoice detail object
 */
export async function generateInvoice(generateData) {
  return billingRequest('/api/v1/billing/invoices/', {
    method: 'POST',
    body: JSON.stringify(generateData),
  });
}

/**
 * Get direct download URL for an invoice PDF stream
 * @param {number|string} id - Invoice primary key
 * @returns {string} Absolute URL to download PDF
 */
export function getInvoicePdfUrl(id) {
  return `${API_BASE_URL}/api/v1/billing/invoices/${id}/pdf/`;
}

/* ============================================================================
 * PAYMENT & ALLOCATION MANAGEMENT API (/api/v1/billing/payments/)
 * ============================================================================ */

/**
 * Fetch payment records with optional search, status, customer, or subscription filtering
 * @param {Object} params - { search: string, status: string, customer: string, subscription: string }
 * @returns {Promise<Array>} Array of payment objects
 */
export async function fetchPayments(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search.trim());
  if (params.status) query.append('status', params.status.trim());
  if (params.customer) query.append('customer', String(params.customer).trim());
  if (params.subscription) query.append('subscription', String(params.subscription).trim());

  const qs = query.toString() ? `?${query.toString()}` : '';
  const data = await billingRequest(`/api/v1/billing/payments/${qs}`);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/**
 * Fetch a single payment detail by ID
 * @param {number|string} id - Payment primary key
 * @returns {Promise<Object>} Payment detail object with nested allocations
 */
export async function fetchPayment(id) {
  return billingRequest(`/api/v1/billing/payments/${id}/`);
}

/**
 * Record a new payment receipt
 * @param {Object} paymentData - { customer: number, amount: string, payment_method?: string, gateway_transaction_id?: string, notes?: string }
 * @returns {Promise<Object>} Created Payment object
 */
export async function recordPayment(paymentData) {
  return billingRequest('/api/v1/billing/payments/', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
}

/**
 * Apply payment allocations to one or more invoices
 * @param {number|string} paymentId - Payment primary key
 * @param {Object} allocationData - { allocations: [{ invoice_id: number, amount: string, notes?: string }] }
 * @returns {Promise<Object>} Updated Payment detail object
 */
export async function allocatePayment(paymentId, allocationData) {
  return billingRequest(`/api/v1/billing/payments/${paymentId}/allocate/`, {
    method: 'POST',
    body: JSON.stringify(allocationData),
  });
}

/**
 * Attach a Stripe PaymentMethod identifier (pm_...) safely to a BillingCustomer
 * @param {Object} data - { customer_id: number, payment_method_id: string, set_as_default?: boolean }
 * @returns {Promise<Object>} Response object containing status and customer_id
 */
export async function attachPaymentMethod(data) {
  return billingRequest('/api/v1/billing/payment-methods/attach/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/* ============================================================================
 * ADJUSTMENTS API: CREDIT NOTES & DEBIT NOTES (/api/v1/billing/credit-notes/, /debit-notes/)
 * ============================================================================ */

/**
 * Fetch credit notes with optional search, status, customer, subscription, or invoice filtering
 * @param {Object} params - { search: string, status: string, customer: string, subscription: string, invoice: string }
 * @returns {Promise<Array>} Array of CreditNote objects
 */
export async function fetchCreditNotes(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search.trim());
  if (params.status) query.append('status', params.status.trim());
  if (params.customer) query.append('customer', String(params.customer).trim());
  if (params.subscription) query.append('subscription', String(params.subscription).trim());
  if (params.invoice) query.append('invoice', String(params.invoice).trim());

  const qs = query.toString() ? `?${query.toString()}` : '';
  const data = await billingRequest(`/api/v1/billing/credit-notes/${qs}`);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/**
 * Fetch single credit note detail by ID
 * @param {number|string} id - Credit note primary key
 * @returns {Promise<Object>} Credit note detail object with nested allocations
 */
export async function fetchCreditNote(id) {
  return billingRequest(`/api/v1/billing/credit-notes/${id}/`);
}

/**
 * Issue a new Credit Note
 * @param {Object} creditNoteData - { customer: number, amount: string, reason?: string, invoice?: number, subtotal?: string, tax_total?: string }
 * @returns {Promise<Object>} Created CreditNote object
 */
export async function issueCreditNote(creditNoteData) {
  return billingRequest('/api/v1/billing/credit-notes/', {
    method: 'POST',
    body: JSON.stringify(creditNoteData),
  });
}

/**
 * Allocate a credit note balance to one or more invoices
 * @param {number|string} creditNoteId - Credit note primary key
 * @param {Object} allocationData - { allocations?: [{ invoice_id: number, amount: string }], invoice_id?: number, amount?: string }
 * @returns {Promise<Object>} Updated CreditNote detail object
 */
export async function allocateCreditNote(creditNoteId, allocationData) {
  return billingRequest(`/api/v1/billing/credit-notes/${creditNoteId}/allocate/`, {
    method: 'POST',
    body: JSON.stringify(allocationData),
  });
}

/**
 * Fetch total unapplied credit balance for a customer
 * @param {number|string} customerId - Customer primary key
 * @returns {Promise<Object>} { customer_id: number, unapplied_credit: string }
 */
export async function fetchCustomerUnappliedCredit(customerId) {
  return billingRequest(`/api/v1/billing/credit-notes/unapplied-credit/?customer_id=${customerId}`);
}

/**
 * Fetch debit notes with optional search, customer, subscription, or invoice filtering
 * @param {Object} params - { search: string, customer: string, subscription: string, invoice: string }
 * @returns {Promise<Array>} Array of DebitNote objects
 */
export async function fetchDebitNotes(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search.trim());
  if (params.customer) query.append('customer', String(params.customer).trim());
  if (params.subscription) query.append('subscription', String(params.subscription).trim());
  if (params.invoice) query.append('invoice', String(params.invoice).trim());

  const qs = query.toString() ? `?${query.toString()}` : '';
  const data = await billingRequest(`/api/v1/billing/debit-notes/${qs}`);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/**
 * Fetch single debit note detail by ID
 * @param {number|string} id - Debit note primary key
 * @returns {Promise<Object>} Debit note detail object
 */
export async function fetchDebitNote(id) {
  return billingRequest(`/api/v1/billing/debit-notes/${id}/`);
}

/**
 * Issue a new Debit Note
 * @param {Object} debitNoteData - { invoice: number, amount: string, reason?: string }
 * @returns {Promise<Object>} Created DebitNote object
 */
export async function issueDebitNote(debitNoteData) {
  return billingRequest('/api/v1/billing/debit-notes/', {
    method: 'POST',
    body: JSON.stringify(debitNoteData),
  });
}

/* ============================================================================
 * AUDIT TRAIL & ACTIVITY LOGS API (/api/v1/billing/audit/ & /subscriptions/<id>/audit-logs/)
 * ============================================================================ */

/**
 * Fetch unified chronological activity logs for a specific subscription
 * @param {number|string} subscriptionId - Subscription primary key
 * @param {Object} params - Optional filter params
 * @returns {Promise<Array>} Array of UnifiedAuditActivity objects
 */
export async function fetchSubscriptionAuditLogs(subscriptionId, params = {}) {
  const query = new URLSearchParams();
  if (params.category) query.append('category', params.category.trim());
  if (params.page) query.append('page', String(params.page));
  if (params.page_size) query.append('page_size', String(params.page_size));

  const qs = query.toString() ? `?${query.toString()}` : '';
  const data = await billingRequest(`/api/v1/billing/subscriptions/${subscriptionId}/audit-logs/${qs}`);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/**
 * Fetch tenant-wide unified billing activity feed
 * @param {Object} params - { subscription: string, action: string, actor_type: string, start_date: string, end_date: string, search: string, page: number, page_size: number }
 * @returns {Promise<Object|Array>} Unified activity feed list or paginated response
 */
export async function fetchBillingAuditFeed(params = {}) {
  const query = new URLSearchParams();
  if (params.subscription) query.append('subscription', String(params.subscription).trim());
  if (params.action) query.append('action', params.action.trim());
  if (params.actor_type) query.append('actor_type', params.actor_type.trim());
  if (params.start_date) query.append('start_date', params.start_date.trim());
  if (params.end_date) query.append('end_date', params.end_date.trim());
  if (params.search) query.append('search', params.search.trim());
  if (params.page) query.append('page', String(params.page));
  if (params.page_size) query.append('page_size', String(params.page_size));

  const qs = query.toString() ? `?${query.toString()}` : '';
  return billingRequest(`/api/v1/billing/audit/${qs}`);
}

/* ============================================================================
 * CRM ENTITLEMENT & CLOSED-WON INTEGRATION BRIDGE (/api/v1/billing/entitlements/, /api/v1/billing/integrations/crm/)
 * ============================================================================ */

/**
 * Check feature entitlements and limits for the authenticated tenant organization
 * @param {Object} params - { feature?: string, limit?: string }
 * @returns {Promise<Object>} Entitlement check result or full summary
 */
export async function checkEntitlements(params = {}) {
  const query = new URLSearchParams();
  if (params.feature) query.append('feature', params.feature.trim());
  if (params.limit) query.append('limit', params.limit.trim());

  const qs = query.toString() ? `?${query.toString()}` : '';
  return billingRequest(`/api/v1/billing/entitlements/check/${qs}`);
}

/**
 * Provision a Standalone Billing Customer and Subscription for a Closed-Won CRM Opportunity
 * @param {Object} payload - { opportunity_id, company_id, company_name, contact_email, plan_id, plan_quantity, billing_cycle, start_date, collection_method, payment_terms_days, add_ons }
 * @returns {Promise<Object>} Provisioned subscription and customer data
 */
export async function provisionWonOpportunity(payload) {
  return billingRequest('/api/v1/billing/integrations/crm/opportunity-won/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch catalog pricing plans for subscription creation & opportunity conversion
 * @returns {Promise<Array>} Array of active pricing plan objects
 */
export async function fetchPricingPlans() {
  try {
    const data = await billingRequest('/api/admin/pricing-plans/');
    let list = [];
    if (Array.isArray(data)) list = data;
    else if (Array.isArray(data?.results)) list = data.results;
    else if (Array.isArray(data?.data)) list = data.data;

    return list.filter(p => p && p.is_active !== false);
  } catch (err) {
    console.error('Failed to fetch pricing plans:', err);
    return [];
  }
}

/* ============================================================================
 * SAAS REVENUE ANALYTICS & DASHBOARD API (/api/v1/billing/analytics/)
 * ============================================================================ */

/**
 * Fetch executive billing & SaaS revenue analytics overview
 * @returns {Promise<Object>} Analytics overview object { live_mrr, live_arr, active_subscribers, arpu, ltv, churn_rate_pct, subscriber_breakdown, total_collected_revenue }
 */
export async function fetchBillingAnalyticsOverview() {
  return billingRequest('/api/v1/billing/analytics/overview/');
}

/**
 * Fetch monthly MRR movement buckets
 * @param {Object} params - { months?: number, end_date?: string }
 * @returns {Promise<Array>} Array of MRR movement objects
 */
export async function fetchBillingMrrMovement(params = {}) {
  const query = new URLSearchParams();
  if (params.months) query.append('months', String(params.months));
  if (params.end_date) query.append('end_date', params.end_date.trim());

  const qs = query.toString() ? `?${query.toString()}` : '';
  const data = await billingRequest(`/api/v1/billing/analytics/mrr-movement/${qs}`);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

