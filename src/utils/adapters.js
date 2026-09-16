/**
 * Centralized Data Adapters for AdaptCRM
 *
 * Maps Django REST API backend models to/from the frontend UI schemas.
 * Ensures consistent field names, type safety, and clean form-to-payload transformations.
 */

// Helper to normalize uppercase choices into capitalized labels (e.g. "PARTIALLY_PAID" -> "Partially Paid")
export function normalizeLabel(value) {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

// Helper to slice ISO datetimes to YYYY-MM-DD format
export function toDateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export function mapStageNameToBackendStage(stageName) {
  if (!stageName) return 'QUALIFICATION';
  const upper = stageName.toUpperCase();
  if (upper.includes('WON')) return 'CLOSED_WON';
  if (upper.includes('LOST')) return 'CLOSED_LOST';
  if (upper === 'CONFIRM' || upper === 'QUALIFICATION') return 'QUALIFICATION';
  if (upper === 'DISCOVERY') return 'DISCOVERY';
  if (upper === 'PROPOSAL') return 'PROPOSAL';
  if (upper === 'NEGOTIATION') return 'NEGOTIATION';
  return upper.replace(/\s+/g, '_');
}

/* ============================================================================
 * 1. USER & PROFILE ADAPTERS
 * ============================================================================ */

export function userBackendToUi(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    is_staff: Boolean(user.is_staff),
    is_superuser: Boolean(user.is_superuser),
    user_type: user.user_type || 'USER', // 'ADMIN' or 'USER'
    role: user.role || null,
    permissions: user.permissions || {},
    profile: user.profile || null,
  };
}

/* ============================================================================
 * 2. LEAD ADAPTERS
 * ============================================================================ */

export function leadBackendToUi(lead) {
  if (!lead) return null;
  const leadId = lead.lead_code || `LD-${lead.id}`;
  return {
    id: leadId,
    backendId: lead.id,
    clientId: leadId,
    createdDate: toDateOnly(lead.created_at),
    date: toDateOnly(lead.created_at),
    customer: lead.full_name || 'Unnamed Lead',
    company: lead.company_name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    website: lead.website || '',
    industry: lead.industry || '',
    companyEmployees: lead.employee_count !== null && lead.employee_count !== undefined ? Number(lead.employee_count) : '',
    companyAnnualRevenue: lead.annual_revenue !== null && lead.annual_revenue !== undefined ? Number(lead.annual_revenue) : '',
    source: normalizeLabel(lead.source) || 'Website',
    owner: lead.assigned_salesperson || '',
    priority: normalizeLabel(lead.priority) || 'Medium',
    status: normalizeLabel(lead.status) || 'New',
    leadValue: Number(lead.annual_revenue || 0),
    estimatedValue: Number(lead.annual_revenue || 0),
    lastActivity: lead.updated_at ? `Updated ${toDateOnly(lead.updated_at)}` : 'Loaded from backend',
    upcomingFollowUp: '',
    nextFollowUp: '',
    notes: lead.notes || '',
    pipeline: lead.pipeline || '',
    pipeline_stage: lead.pipeline_stage || '',
    is_converted: Boolean(lead.is_converted),
    contactAttempts: lead.contact_attempts !== null && lead.contact_attempts !== undefined ? Number(lead.contact_attempts) : 0,
    lastContactDate: lead.last_contact_date || '',
    convertedAt: lead.converted_at ? toDateOnly(lead.converted_at) : '',
    lostReason: lead.lost_reason ? normalizeLabel(lead.lost_reason) : '',
    lostNotes: lead.lost_notes || '',
    activities: Array.isArray(lead.activities) ? lead.activities : [],
    tasks: Array.isArray(lead.tasks) ? lead.tasks : [],
    organization: lead.organization || '',
    updatedAt: toDateOnly(lead.updated_at),
  };
}

export function leadUiToBackend(ui) {
  if (!ui) return {};
  return {
    full_name: (ui.customer || '').trim(),
    phone: (ui.phone || '').trim(),
    email: (ui.email || '').trim() || null,
    company_name: (ui.company || '').trim(),
    website: (ui.website || '').trim() || '',
    industry: (ui.industry || '').trim() || '',
    employee_count: ui.companyEmployees ? Number(ui.companyEmployees) : null,
    annual_revenue: ui.companyAnnualRevenue ? Number(ui.companyAnnualRevenue) : null,
    source: ui.source ? ui.source.toUpperCase().replace(/\s+/g, '_') : 'WEBSITE',
    priority: ui.priority ? ui.priority.toUpperCase().replace(/\s+/g, '_') : 'MEDIUM',
    notes: ui.notes || '',
    pipeline: ui.pipeline ? Number(ui.pipeline) : null,
    assigned_salesperson: ui.owner ? Number(ui.owner) : null,
    last_contact_date: ui.lastContactDate || null,
    contact_attempts: ui.contactAttempts ? Number(ui.contactAttempts) : 0,
  };
}

/* ============================================================================
 * 3. CONTACT ADAPTERS
 * ============================================================================ */

export function contactBackendToUi(contact) {
  if (!contact) return null;
  const contactId = contact.contact_code || `CT-${contact.id}`;
  return {
    id: contactId,
    backendId: contact.id,
    clientId: contactId,
    date: toDateOnly(contact.created_at),
    contact: contact.full_name || 'Unnamed Contact',
    company: contact.company_name || '',
    designation: contact.designation || '',
    phone: contact.phone_number || contact.phone || '',
    email: contact.email || '',
    whatsapp: contact.whatsapp || '',
    address: contact.address || '',
    city: contact.city || '',
    country: contact.country || '',
    owner: contact.assigned_salesperson || '',
    ownerName: contact.assigned_salesperson_name || '',
    status: normalizeLabel(contact.status) || 'Active',
    notes: contact.notes || '',
    related_opportunities: contact.related_opportunities || [],
    activities: contact.activities || [],
    related_tasks: contact.related_tasks || [],
    organization: contact.organization || '',
    updatedAt: toDateOnly(contact.updated_at),
  };
}

export function contactUiToBackend(ui) {
  if (!ui) return {};
  return {
    full_name: (ui.contact || '').trim(),
    company_name: (ui.company || '').trim(),
    designation: (ui.designation || '').trim() || '',
    phone_number: (ui.phone || '').trim(),
    email: (ui.email || '').trim() || null,
    whatsapp: (ui.whatsapp || '').trim() || '',
    address: (ui.address || '').trim() || '',
    city: (ui.city || '').trim() || '',
    country: (ui.country || '').trim() || '',
    assigned_salesperson: ui.owner ? Number(ui.owner) : null,
    status: ui.status ? (String(ui.status).toLowerCase() === 'inactive' ? 'Inactive' : 'Active') : 'Active',
    notes: ui.notes || '',
  };
}

/* ============================================================================
 * 4. COMPANY ADAPTERS
 * ============================================================================ */

export function companyBackendToUi(company) {
  if (!company) return null;
  const companyId = company.company_code || `CO-${company.id}`;
  return {
    id: companyId,
    backendId: company.id,
    clientId: companyId,
    date: toDateOnly(company.created_at),
    name: company.name || 'Unnamed Company',
    contact: company.name || 'Unnamed Company',
    company: company.name || 'Unnamed Company',
    designation: company.industry || '',
    type: normalizeLabel(company.type) || 'Prospect',
    rating: normalizeLabel(company.rating) || 'None',
    industry: company.industry || '',
    phone: company.phone || '',
    email: company.email || '',
    website: company.website || '',
    annualRevenue: company.annual_revenue !== null && company.annual_revenue !== undefined ? Number(company.annual_revenue) : '',
    employees: company.employee_count !== null && company.employee_count !== undefined ? Number(company.employee_count) : '',
    owner: company.assigned_salesperson || '',
    ownerName: company.assigned_salesperson_name || '',
    leadSource: normalizeLabel(company.lead_source) || 'Website',
    description: company.description || '',
    address: company.billing_address || '',
    billing_address: company.billing_address || '',
    shipping_address: company.shipping_address || '',
    summary: company.summary || { total_contacts: 0, open_opportunities: 0, won_opportunities: 0, total_revenue: 0 },
    contacts: company.contacts || [],
    opportunities: company.opportunities || [],
    organization: company.organization || '',
    updatedAt: toDateOnly(company.updated_at),
  };
}

export function companyUiToBackend(ui) {
  if (!ui) return {};
  return {
    name: (ui.name || '').trim(),
    email: (ui.email || '').trim() || null,
    phone: (ui.phone || '').trim() || '',
    website: (ui.website || '').trim() || '',
    type: ui.type ? ui.type.toUpperCase() : 'PROSPECT',
    rating: ui.rating ? ui.rating.toUpperCase() : 'NONE',
    industry: ui.industry ? ui.industry.toUpperCase() : 'OTHER',
    annual_revenue: ui.annualRevenue ? Number(ui.annualRevenue) : null,
    employee_count: ui.employees ? Number(ui.employees) : null,
    lead_source: ui.leadSource ? ui.leadSource.toUpperCase().replace(/\s+/g, '_') : 'WEBSITE',
    description: ui.description || '',
    billing_address: ui.billing_address || ui.address || '',
    shipping_address: ui.shipping_address || ui.billing_address || ui.address || '',
    assigned_salesperson: ui.owner ? Number(ui.owner) : null,
  };
}

/* ============================================================================
 * 5. OPPORTUNITY ADAPTERS
 * ============================================================================ */

export function opportunityBackendToUi(opportunity) {
  if (!opportunity) return null;
  const oppId = opportunity.opportunity_code || `OP-${opportunity.id}`;
  return {
    id: oppId,
    backendId: opportunity.id,
    name: opportunity.name || 'Unnamed Opportunity',
    company: opportunity.company_name || '',
    companyId: opportunity.company || null,
    contact: '',
    value: Number(opportunity.amount || 0),
    amount: Number(opportunity.amount || 0),
    probability: opportunity.probability !== null && opportunity.probability !== undefined ? Number(opportunity.probability) : 0,
    expectedRevenue: opportunity.expected_revenue !== null && opportunity.expected_revenue !== undefined ? Number(opportunity.expected_revenue) : 0,
    priority: normalizeLabel(opportunity.priority) || 'Medium',
    closeDate: toDateOnly(opportunity.expected_close_date),
    createdDate: toDateOnly(opportunity.created_at),
    date: toDateOnly(opportunity.created_at),
    updatedAt: toDateOnly(opportunity.updated_at),
    owner: opportunity.assigned_salesperson || '',
    ownerName: opportunity.assigned_salesperson_name || '',
    stage: normalizeLabel(opportunity.stage) || 'New',
    product: opportunity.product || 'CRM Suite',
    notes: opportunity.description || '',
    leadSource: normalizeLabel(opportunity.lead_source) || 'Lead Conversion',
    lostReason: opportunity.lost_reason || '',
    pipeline: opportunity.pipeline || '',
    pipeline_stage: opportunity.pipeline_stage || '',
    won: Boolean(opportunity.won),
    closed: Boolean(opportunity.closed),
    custom_values: opportunity.custom_values || {},
    organization: opportunity.organization || '',
  };
}

export function opportunityUiToBackend(ui) {
  if (!ui) return {};
  return {
    name: (ui.name || '').trim(),
    amount: ui.value ? Number(ui.value) : 0,
    expected_close_date: ui.closeDate || null,
    pipeline: ui.pipeline ? Number(ui.pipeline) : null,
    pipeline_stage: ui.pipeline_stage ? Number(ui.pipeline_stage) : null,
    assigned_salesperson: ui.owner ? Number(ui.owner) : null,
    stage: ui.stage ? mapStageNameToBackendStage(ui.stage) : 'QUALIFICATION',
    custom_values: ui.custom_values || {},
  };
}

/* ============================================================================
 * 6. PIPELINE CARD ADAPTERS
 * ============================================================================ */

export function pipelineCardBackendToUi(card) {
  if (!card) return null;
  return {
    id: card.id,
    entity_type: card.entity_type || 'lead',
    name: card.name || '',
    company_name: card.company_name || '',
    phone: card.phone || '',
    email: card.email || '',
    assigned_salesperson_id: card.assigned_salesperson_id || null,
    assigned_salesperson_name: card.assigned_salesperson_name || 'Unassigned',
    stage: normalizeLabel(card.stage) || 'New',
    amount: card.amount !== null && card.amount !== undefined ? Number(card.amount) : null,
    expected_close_date: toDateOnly(card.expected_close_date),
    probability: card.probability || null,
    notes: card.notes || '',
    company_id: card.company_id || null,
    primary_contact_id: card.primary_contact_id || null,
    pipeline_stage_id: card.pipeline_stage_id || null,
  };
}

/* ============================================================================
 * 7. PAYMENT ADAPTERS
 * ============================================================================ */

export function paymentBackendToUi(payment) {
  if (!payment) return null;
  const payId = payment.invoice_number || `PAY-${payment.id}`;
  const latestTxn = Array.isArray(payment.transactions) && payment.transactions.length > 0 ? payment.transactions[0] : null;
  return {
    id: payId,
    backendId: payment.id,
    invoice: payment.invoice_number || payId,
    company: payment.company_name || '',
    companyId: payment.company || null,
    opportunity: payment.opportunity_name || '',
    opportunityId: payment.opportunity || null,
    customer: payment.customer_name || 'Primary Contact',
    salesperson: payment.assigned_salesperson_name || 'Unassigned',
    owner: payment.assigned_salesperson || '',
    ownerName: payment.assigned_salesperson_name || '',
    amount: Number(payment.total_amount || 0),
    paid: Number(payment.paid_amount || 0),
    balance: Number(payment.balance || 0),
    creditBalance: Number(payment.credit_balance || 0),
    currency: payment.currency || 'USD',
    status: payment.status_display || normalizeLabel(payment.status) || 'Unpaid',
    rawStatus: payment.status || 'UNPAID',
    date: toDateOnly(payment.payment_date),
    method: normalizeLabel(payment.payment_method || latestTxn?.payment_method) || 'Cash',
    reference: payment.transaction_reference || latestTxn?.transaction_reference || '',
    notes: payment.notes || '',
    transactions: payment.transactions || [],
    createdDate: toDateOnly(payment.created_at),
    updatedAt: toDateOnly(payment.updated_at),
    organization: payment.organization || '',
  };
}

export function paymentUiToBackend(ui) {
  if (!ui) return {};
  return {
    payment_id: ui.backendId || ui.payment_id || null,
    company: ui.companyId ? Number(ui.companyId) : null,
    opportunity: ui.opportunityId ? Number(ui.opportunityId) : null,
    total_amount: ui.amount ? Number(ui.amount) : 0,
    amount_received: ui.paid ? Number(ui.paid) : 0,
    payment_method: ui.method ? ui.method.toUpperCase().replace(/\s+/g, '_') : 'CASH',
    transaction_reference: ui.reference || '',
    payment_date: ui.date || null,
    notes: ui.notes || '',
  };
}


/* ============================================================================
 * 8. BILLING CUSTOMER ADAPTERS
 * ============================================================================ */

export function billingCustomerBackendToUi(cust) {
  if (!cust) return null;
  return {
    id: cust.id,
    customerNumber: cust.customer_number || `CUST-${cust.id}`,
    name: cust.name || '',
    email: cust.email || '',
    phone: cust.phone || '',
    billingAddressLine1: cust.billing_address_line1 || '',
    billingAddressLine2: cust.billing_address_line2 || '',
    billingCity: cust.billing_city || '',
    billingState: cust.billing_state || '',
    billingPostalCode: cust.billing_postal_code || '',
    billingCountry: cust.billing_country || '',
    currency: cust.currency || 'USD',
    taxId: cust.tax_id || '',
    taxExempt: Boolean(cust.tax_exempt),
    defaultPaymentMethodId: cust.default_payment_method_id || '',
    externalReferenceId: cust.external_reference_id || '',
    organization: cust.organization || null,
    isActive: Boolean(cust.is_active),
    status: cust.is_active ? 'Active' : 'Inactive',
    createdBy: cust.created_by || null,
    createdAt: toDateOnly(cust.created_at),
    updatedAt: toDateOnly(cust.updated_at),
    metadata: cust.metadata || {},
  };
}

export function billingCustomerUiToPayload(ui) {
  if (!ui) return {};
  const payload = {
    name: (ui.name || '').trim(),
    email: (ui.email || '').trim().toLowerCase(),
    phone: (ui.phone || '').trim(),
    billing_address_line1: (ui.billingAddressLine1 || '').trim(),
    billing_address_line2: (ui.billingAddressLine2 || '').trim(),
    billing_city: (ui.billingCity || '').trim(),
    billing_state: (ui.billingState || '').trim(),
    billing_postal_code: (ui.billingPostalCode || '').trim(),
    billing_country: (ui.billingCountry || '').trim(),
    currency: (ui.currency || 'USD').trim().toUpperCase(),
    tax_id: (ui.taxId || '').trim(),
    tax_exempt: Boolean(ui.taxExempt),
    default_payment_method_id: (ui.defaultPaymentMethodId || '').trim(),
    external_reference_id: (ui.externalReferenceId || '').trim(),
  };

  if (ui.customerNumber && ui.customerNumber.trim() && !ui.id) {
    payload.customer_number = ui.customerNumber.trim();
  }

  if (ui.isActive !== undefined) {
    payload.is_active = Boolean(ui.isActive);
  }

  return payload;
}