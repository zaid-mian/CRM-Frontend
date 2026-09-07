import React, { useMemo, useState, useEffect } from 'react';
import { Edit3, Search, ShieldCheck, X, PlusCircle } from 'lucide-react';
import { authRequest, apiGet } from '../App';

export default function UsersPage({ setMessage }) {
  const [usersList, setUsersList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role_id: ''
  });
  const [submittingEmployee, setSubmittingEmployee] = useState(false);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployeeForm.email.trim() || !newEmployeeForm.password.trim()) {
      setMessage?.('Email and Password are required.');
      return;
    }
    try {
      setSubmittingEmployee(true);
      const res = await authRequest('/api/admin/users/', {
        method: 'POST',
        body: JSON.stringify({
          email: newEmployeeForm.email.trim(),
          password: newEmployeeForm.password,
          first_name: newEmployeeForm.first_name.trim(),
          last_name: newEmployeeForm.last_name.trim(),
          role_id: newEmployeeForm.role_id ? Number(newEmployeeForm.role_id) : null
        })
      });
      if (res.success) {
        setMessage?.('Employee created successfully.');
        setAddEmployeeOpen(false);
        setNewEmployeeForm({ email: '', first_name: '', last_name: '', password: '', role_id: '' });
        fetchUsersAndRoles();
      } else {
        setMessage?.(res.message || 'Failed to create employee.');
      }
    } catch (err) {
      console.error(err);
      setMessage?.(err.message || 'Failed to create employee.');
    } finally {
      setSubmittingEmployee(false);
    }
  };

  const fetchUsersAndRoles = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        apiGet('/api/admin/users/'),
        apiGet('/api/roles/'),
      ]);

      if (usersRes.success && Array.isArray(usersRes.data)) {
        setUsersList(usersRes.data);
      }
      if (rolesRes.success && Array.isArray(rolesRes.data)) {
        setRolesList(rolesRes.data);
      }
    } catch (err) {
      console.error(err);
      setMessage?.(err.message || 'Failed to fetch users and roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const handleEditRole = (user) => {
    setEditingUser(user);
    setSelectedRoleId(user.role_id || '');
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    try {
      setSaving(true);
      const res = await authRequest('/api/admin/users/', {
        method: 'PATCH',
        body: JSON.stringify({
          user_id: editingUser.id,
          role_id: selectedRoleId || null,
        }),
      });

      if (res.success) {
        setMessage?.('User role updated successfully.');
        setEditingUser(null);
        fetchUsersAndRoles();
      } else {
        setMessage?.(res.message || 'Failed to update user role.');
      }
    } catch (err) {
      console.error(err);
      setMessage?.(err.message || 'Failed to update user role.');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return usersList.filter((user) => {
      const matchesStatus = statusFilter === 'All' || user.status === statusFilter;
      const matchesSearch = !search || 
        (user.full_name || '').toLowerCase().includes(search) ||
        (user.email || '').toLowerCase().includes(search) ||
        (user.role || '').toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [usersList, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: usersList.length,
      active: usersList.filter((u) => u.status === 'Active').length,
      inactive: usersList.filter((u) => u.status === 'Inactive').length,
    };
  }, [usersList]);

  if (loading && usersList.length === 0) {
    return <div className="text-slate-400 p-8 text-center font-semibold animate-pulse">Loading organization users...</div>;
  }

  return (
    <div className="lf-page leads-page users-page">
      <section className="lf-table-card sales-table-card">
        
        {/* TOP SUMMARY STRIP */}
        <section className="crm-summary-strip contact-summary-strip" aria-label="User summary">
          <article>
            <span>Total Users</span>
            <strong>{summary.total}</strong>
          </article>
          <article>
            <span>Active</span>
            <strong className="contact-summary-blue">{summary.active}</strong>
          </article>
          <article>
            <span>Inactive / Pending</span>
            <strong className="contact-summary-red">{summary.inactive}</strong>
          </article>
        </section>

        {/* FILTERS */}
        <section className="page-panel-filters lf-filter-bar" aria-label="User filters">
          <label className="role-search-field" style={{ flex: 1, maxWidth: '300px' }}>
            <Search size={15} />
            <input
              type="search"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>

          <label className="lf-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Pending">Pending</option>
            </select>
          </label>

          <button
            type="button"
            className="lf-btn lf-btn-primary"
            onClick={() => setAddEmployeeOpen(true)}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <PlusCircle size={16} />
            Add Employee
          </button>
        </section>

        {/* USERS TABLE */}
        <div className="lf-table-scroll" style={{ marginTop: '16px' }}>
          <table className="lf-leads-table">
            <thead>
              <tr>
                <th className="lf-sr-col">#</th>
                <th>User ID</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>CRM Role</th>
                <th>Status</th>
                <th>Join Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td className="lf-sr-col">{index + 1}</td>
                    <td>{user.id}</td>
                    <td><strong>{user.full_name}</strong></td>
                    <td>{user.email || '-'}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={14} className="text-slate-400" />
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`lf-badge contact-status contact-status--${String(user.status || '').toLowerCase()}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>{user.created_at ? user.created_at.slice(0, 10) : '-'}</td>
                    <td className="lf-actions-cell">
                      <div className="inline-row-actions">
                        <button
                          type="button"
                          className="inline-action inline-action--edit"
                          aria-label={`Change role for ${user.full_name}`}
                          title="Assign Role"
                          onClick={() => handleEditRole(user)}
                        >
                          <Edit3 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="payment-empty-table text-center py-8">
                    No users found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* EDIT ROLE MODAL */}
      {editingUser && (
        <div className="lf-modal-backdrop" role="presentation">
          <section className="lf-modal" role="dialog" aria-modal="true" aria-labelledby="edit-role-title" style={{ maxWidth: '400px' }}>
            <div className="lf-modal-head">
              <div>
                <h2 id="edit-role-title">Assign CRM Role</h2>
                <p>Select role for {editingUser.full_name}</p>
              </div>
              <button aria-label="Close modal" onClick={() => setEditingUser(null)}><X size={18} /></button>
            </div>
            <div className="lf-modal-body" style={{ padding: '16px' }}>
              <label className="lf-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Select Role:</span>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">No Role (Default User)</option>
                  {rolesList.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="lf-modal-actions" style={{ padding: '12px 16px', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setEditingUser(null)} disabled={saving}>Cancel</button>
              <button type="button" className="primary" onClick={handleSaveRole} disabled={saving}>
                {saving ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      {addEmployeeOpen && (
        <div className="lf-modal-backdrop" role="presentation">
          <section className="lf-modal" role="dialog" aria-modal="true" aria-labelledby="add-employee-title" style={{ maxWidth: '450px' }}>
            <div className="lf-modal-head">
              <div>
                <h2 id="add-employee-title">Add New Employee</h2>
                <p>Create a user account in your organization</p>
              </div>
              <button aria-label="Close modal" onClick={() => setAddEmployeeOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="lf-modal-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label className="lf-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>Email Address *</span>
                  <input
                    type="email"
                    required
                    value={newEmployeeForm.email}
                    onChange={(e) => setNewEmployeeForm(curr => ({ ...curr, email: e.target.value }))}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label className="lf-field" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>First Name</span>
                    <input
                      type="text"
                      value={newEmployeeForm.first_name}
                      onChange={(e) => setNewEmployeeForm(curr => ({ ...curr, first_name: e.target.value }))}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </label>
                  <label className="lf-field" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Last Name</span>
                    <input
                      type="text"
                      value={newEmployeeForm.last_name}
                      onChange={(e) => setNewEmployeeForm(curr => ({ ...curr, last_name: e.target.value }))}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </label>
                </div>
                <label className="lf-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>Password *</span>
                  <input
                    type="password"
                    required
                    value={newEmployeeForm.password}
                    onChange={(e) => setNewEmployeeForm(curr => ({ ...curr, password: e.target.value }))}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </label>
                <label className="lf-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>CRM Role</span>
                  <select
                    value={newEmployeeForm.role_id}
                    onChange={(e) => setNewEmployeeForm(curr => ({ ...curr, role_id: e.target.value }))}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">No Role (Default User)</option>
                    {rolesList.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="lf-modal-actions" style={{ padding: '12px 16px', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setAddEmployeeOpen(false)} disabled={submittingEmployee}>Cancel</button>
                <button type="submit" className="primary" disabled={submittingEmployee}>
                  {submittingEmployee ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
