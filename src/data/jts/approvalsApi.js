const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export async function fetchApprovalRequests() {
    const response = await fetch(`${API_BASE_URL}/api/admin/registrations/`, {
        credentials: 'include'
    });
    const data = await response.json();
    if (data.success && data.data) {
        return data.data.map(item => ({
            id: item.id,
            companyLogo: item.organization_name ? item.organization_name.substring(0, 2).toUpperCase() : 'CO',
            companyName: item.organization_name || '',
            ownerName: item.owner_name || '',
            email: item.owner_email || '',
            status: item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Pending',
            createdAt: item.submitted_at || '',
            phoneNumber: item.owner_profile?.phone_number || '',
            country: item.owner_profile?.country || '',
            address: item.owner_profile?.address || '',
            cnic: item.owner_profile?.cnic || ''
        }));
    }
    throw new Error(data.message || 'Failed to fetch registrations.');
}
