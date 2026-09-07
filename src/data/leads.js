export const leadStatusOptions = ['All Statuses', 'New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Converted', 'Lost'];
export const leadOwnerOptions = ['All Owners', 'Ali Raza', 'Sarah Khan', 'Ahmed Malik', 'Emma Wilson'];
export const leadPriorityOptions = ['All Priorities', 'Low', 'Medium', 'High', 'Urgent'];
export const leadSourceOptions = ['All Sources', 'Website', 'Referral', 'LinkedIn', 'Facebook Ads', 'Google Ads', 'Email Campaign', 'Direct', 'Other'];
export const leadDateOptions = ['Any Time', 'Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom Range'];

export const leadColumns = [
  { key: 'clientId', label: 'Client ID', sortable: true },
  { key: 'createdDate', label: 'Created Date', sortable: true },
  { key: 'customer', label: 'Contact', sortable: true, locked: true },
  { key: 'company', label: 'Company', sortable: true },
  { key: 'jobTitle', label: 'Designation', sortable: true },
  { key: 'phone', label: 'Phone Number' },
  { key: 'email', label: 'Email' },
  { key: 'source', label: 'Source' },
  { key: 'owner', label: 'Owner', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'lastActivity', label: 'Last Activity', sortable: true },
];

export const defaultLeadColumns = ['customer', 'company', 'jobTitle', 'phone', 'email', 'owner', 'status'];

export const mockLeads = [];
