export async function fetchUserDashboard() {
    return new Promise((resolve) => {
        window.setTimeout(() => {
            resolve({
                user: {
                    name: 'Zaid',
                    organization: 'JTS Corp',
                    email: 'zaid@jts.com',
                    phone: '+1 234 567 890',
                },
                subscriptions: [
                    {
                        id: 'sub-1',
                        product: 'Sales CRM',
                        hasCrm: true,
                        pricingPlan: 'Professional',
                        status: 'Active',
                        startDate: 'Jan 15, 2024',
                        renewalDate: 'Jan 15, 2025',
                    },
                    {
                        id: 'sub-2',
                        product: 'Marketing Automation',
                        hasCrm: false,
                        pricingPlan: 'Basic',
                        status: 'Active',
                        startDate: 'Mar 01, 2024',
                        renewalDate: 'Mar 01, 2025',
                    },
                ],
            });
        }, 180);
    });
}
