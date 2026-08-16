const approvalRequests = [
    {
        id: 1,
        companyLogo: 'SV',
        companyName: 'Skyline Ventures',
        ownerName: 'Zainab Ahmed',
        email: 'zainab@skyline.com',
        status: 'Pending',
        createdAt: '2026-08-08',
        phoneNumber: '+92 301 2222222',
        country: 'Pakistan',
        address: 'Blue Area, Islamabad',
        cnic: '61101-1234567-1',
    },
    {
        id: 2,
        companyLogo: 'AS',
        companyName: 'Apex Software Lab',
        ownerName: 'Bilal Malik',
        email: 'bilal@apexlab.io',
        status: 'Pending',
        createdAt: '2026-08-09',
        phoneNumber: '+92 321 5555555',
        country: 'Pakistan',
        address: 'Shahrah-e-Faisal, Karachi',
        cnic: '42101-7654321-2',
    },
];

const delay = (value) => new Promise((resolve) => window.setTimeout(() => resolve(value), 180));

export async function fetchApprovalRequests() {
    return delay(approvalRequests);
}
