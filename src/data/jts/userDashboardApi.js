const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export async function fetchUserDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/me/`, {
            credentials: 'include'
        });
        const resData = await response.json();
        if (resData.success && resData.data) {
            const userData = resData.data;
            const profile = userData.profile || {};
            const org = profile.organization || {};
            
            return {
                user: {
                    name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
                    organization: org.name || '',
                    email: userData.email,
                    phone: profile.phone_number || '',
                },
                subscriptions: userData.subscriptions || [],
            };
        }
        throw new Error(resData.message || 'Failed to fetch dashboard data.');
    } catch (err) {
        console.error('fetchUserDashboard error:', err);
        throw err;
    }
}
