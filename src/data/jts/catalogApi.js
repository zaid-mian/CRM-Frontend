const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export const options = {
    currencies: ['USD', 'PKR'],
    billing_cycles: [
        { value: 'monthly', label: 'Monthly' },
        { value: 'yearly', label: 'Yearly' },
        { value: 'one_time', label: 'One-time' },
    ],
    discount_types: [
        { value: 'percentage', label: 'Percentage' },
        { value: 'fixed', label: 'Fixed Amount' },
    ],
};

export async function fetchCatalogBootstrap() {
    const urls = [
        `${API_BASE_URL}/api/admin/products/`,
        `${API_BASE_URL}/api/services/`,
        `${API_BASE_URL}/api/admin/modules/`,
        `${API_BASE_URL}/api/admin/pricing-plans/`,
        `${API_BASE_URL}/api/admin/plan-modules/`,
        `${API_BASE_URL}/api/admin/discounts/`,
    ];

    const responses = await Promise.all(
        urls.map((url) =>
            fetch(url, { credentials: 'include' }).then((res) => {
                if (!res.ok) {
                    throw new Error(`Failed to load data from: ${url}`);
                }
                return res.json();
            })
        )
    );

    const products = responses[0].data || [];
    const services = responses[1].data || [];
    const modules = responses[2].data || [];
    const rawPricingPlans = responses[3].data || [];
    const planModules = responses[4].data || [];
    const discounts = responses[5].data || [];

    // Map children plan modules and discounts back onto plan records as expected by CatalogAdmin UI.
    const pricingPlans = rawPricingPlans.map((plan) => {
        return {
            ...plan,
            plan_modules: planModules.filter((pm) => pm.plan === plan.id),
            discounts: discounts.filter((d) => d.pricing_plan === plan.id),
        };
    });

    return {
        products,
        services,
        modules,
        pricingPlans,
        options,
        capabilities: {
            supportsDiscounts: true,
        },
    };
}
