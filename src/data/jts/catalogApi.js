const delay = (value) => new Promise((resolve) => window.setTimeout(() => resolve(value), 220));

const products = [
    {
        id: 'prod_101',
        name: 'Sales CRM',
        slug: 'sales-crm',
        description: 'Customer pipeline and lead management workspace.',
        image: '',
        is_active: true,
        display_order: 1,
        created_at: '2026-08-01T09:15:00Z',
        updated_at: '2026-08-11T12:20:00Z',
        updated_by: 'Usman',
        can_delete: false,
    },
    {
        id: 'prod_102',
        name: 'Support CRM',
        slug: 'support-crm',
        description: 'Ticketing and support operations catalog product.',
        image: '',
        is_active: false,
        display_order: 2,
        created_at: '2026-08-03T10:30:00Z',
        updated_at: '2026-08-09T15:45:00Z',
        updated_by: 'Catalog Manager',
        can_delete: true,
    },
];

const services = [
    { id: 'svc_201', name: 'CRM Implementation' },
    { id: 'svc_202', name: 'Premium Support' },
];

const modules = [
    {
        id: 'mod_301',
        product: 'prod_101',
        name: 'Lead Management',
        code: 'LEAD_MANAGEMENT',
        description: 'Lead capture, assignment, and activity tracking.',
        is_active: true,
        display_order: 1,
        created_at: '2026-08-02T11:00:00Z',
        updated_at: '2026-08-11T09:25:00Z',
        updated_by: 'Usman',
        can_delete: false,
    },
    {
        id: 'mod_302',
        product: 'prod_101',
        name: 'Pipeline Tracking',
        code: 'PIPELINE_TRACKING',
        description: 'Pipeline stage tracking and deal movement.',
        is_active: true,
        display_order: 2,
        created_at: '2026-08-02T11:30:00Z',
        updated_at: '2026-08-10T14:10:00Z',
        updated_by: 'Catalog Manager',
        can_delete: true,
    },
];

const pricingPlans = [
    {
        id: 'plan_401',
        product: 'prod_101',
        service: null,
        name: 'Starter',
        price: 29,
        currency: 'USD',
        billing_cycle: 'monthly',
        is_active: true,
        display_order: 1,
        created_at: '2026-08-04T12:00:00Z',
        updated_at: '2026-08-12T08:15:00Z',
        updated_by: 'Usman',
        can_delete: false,
        plan_modules: [
            { id: 'pm_1', module: 'mod_301', is_enabled: true, limit_value: '2,000 leads' },
        ],
        discounts: [
            {
                id: 'disc_1',
                name: 'Launch Offer',
                discount_type: 'percentage',
                value: 10,
                is_active: true,
                start_date: '2026-08-01',
                end_date: '2026-08-31',
            },
        ],
    },
    {
        id: 'plan_402',
        product: null,
        service: 'svc_201',
        name: 'Implementation Basic',
        price: 499,
        currency: 'USD',
        billing_cycle: 'one-time',
        is_active: true,
        display_order: 2,
        created_at: '2026-08-05T13:20:00Z',
        updated_at: '2026-08-10T16:35:00Z',
        updated_by: 'Catalog Manager',
        can_delete: true,
        plan_modules: [],
        discounts: [],
    },
];

const options = {
    currencies: ['USD', 'PKR'],
    billing_cycles: [
        { value: 'monthly', label: 'Monthly' },
        { value: 'yearly', label: 'Yearly' },
        { value: 'one-time', label: 'One-time' },
    ],
    discount_types: [
        { value: 'percentage', label: 'Percentage' },
        { value: 'fixed_amount', label: 'Fixed Amount' },
    ],
};

export async function fetchCatalogBootstrap() {
    return delay({
        products,
        services,
        modules,
        pricingPlans,
        options,
        capabilities: {
            supportsDiscounts: true,
        },
    });
}
