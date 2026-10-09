import { useEffect, useState } from 'react'
import { api } from '../../api.js'

const emptyForm = { name: '', email: '', password: '', type: 'Staff', branch: '', chapel: '', status: 'Active' }
const branches = ['Argao', 'Bogo','Car-Car', 'Corduva', 'Danao', 'Junquera', 'Lapu-Lapu', 'Lilioan', 'Mandaue', 'Maracas']
const chapels = Array.from({ length: 10 }, (_, index) => `Chapel ${index + 1}`)
const PAGE_SIZE = 5

function StaffAccounts() {
  const [accounts, setAccounts] = useState([])
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  useEffect(() => {
    const refresh = () => api('/api/accounts').then(setAccounts).catch((requestError) => setError(requestError.message))
    refresh()
    const interval = window.setInterval(refresh, 10000)
    return () => window.clearInterval(interval)
  }, [])
  const filteredAccounts = accounts.filter((account) => [account.name, account.email, account.type, account.branch, account.chapel, account.chapelName, account.status].some((value) => String(value || '').toLowerCase().includes(search.trim().toLowerCase())))
  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / PAGE_SIZE))
  const page = Math.min(currentPage, totalPages)
  const visibleAccounts = filteredAccounts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const updateForm = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'branch' && value !== current.branch ? { chapel: '' } : {}),
    }))
    setFormError('')
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setFormError('')
  }

  const openNewForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setFormError('')
    setShowForm(true)
  }

  const saveAccount = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = { ...form, chapelName: form.chapel }
      const saved = await (editingId
        ? api(`/api/accounts/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : api('/api/accounts', { method: 'POST', body: JSON.stringify(payload) }))
      setAccounts((items) => editingId ? items.map((account) => account.id === editingId ? saved : account) : [...items, saved])
      setError('')
      setForm(emptyForm)
      setEditingId(null)
      setShowForm(false)
      if (!editingId) setCurrentPage(Math.ceil((accounts.length + 1) / PAGE_SIZE))
      setFeedback({
        title: editingId ? 'Account updated' : 'Account created',
        message: `${saved.name}'s account is now saved to the database.`,
      })
    } catch (requestError) {
      setFormError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const editAccount = (account) => {
    setForm({ name: account.name, email: account.email, password: '', type: account.type, branch: account.branch || account.chapel, chapel: account.chapel || account.chapelName || '', status: account.status })
    setFormError('')
    setEditingId(account.id)
    setShowForm(true)
  }

  const deleteAccount = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    setError('')
    try {
      await api(`/api/accounts/${deleteTarget.id}`, { method: 'DELETE' })
      const remaining = accounts.filter((item) => item.id !== deleteTarget.id)
      setAccounts(remaining)
      setCurrentPage((current) => Math.min(current, Math.max(1, Math.ceil(remaining.length / PAGE_SIZE))))
      setDeleteTarget(null)
      setFeedback({
        title: 'Account deleted',
        message: `${deleteTarget.name}'s account was removed successfully.`,
      })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="admin-panel accounts-panel">
      <div className="panel-heading">
        <div><p className="admin-kicker">Access management</p><h2>Staff &amp; chapel accounts</h2></div>
        <button type="button" onClick={openNewForm}>+ Add account</button>
      </div>
      {error && <p className="login-notice login-error" role="alert">{error}</p>}

      <div className="accounts-table-wrap">
        <div className="accounts-table-toolbar"><input className="request-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1) }} placeholder="Search name, email, account type, or branch..." /><span>{filteredAccounts.length} matching account{filteredAccounts.length === 1 ? '' : 's'}</span></div>
        <table className="accounts-table">
          <thead><tr><th>Account</th><th>Type</th><th>Chapel access</th><th>Status</th><th aria-label="Actions" /></tr></thead>
          <tbody>{visibleAccounts.map((account) => <tr key={account.id}><td><strong>{account.name}</strong><small>{account.email}</small></td><td><span className={`account-type ${account.type.toLowerCase()}`}>{account.type}</span></td><td>{account.type === 'Chapel' && account.chapelName ? `${account.chapelName} · ${account.branch || account.chapel}` : (account.branch || account.chapel)}</td><td><span className={`account-status ${account.status.toLowerCase()}`}>{account.status}</span></td><td><div className="account-actions-menu"><button type="button" onClick={() => editAccount(account)}>Edit</button><button className="delete-account" type="button" onClick={() => setDeleteTarget(account)}>Delete</button></div></td></tr>)}</tbody>
        </table>
      </div>
      <div className="accounts-table-footer">
        <p className="accounts-count">{filteredAccounts.length} account{filteredAccounts.length === 1 ? '' : 's'} total · Showing {filteredAccounts.length ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, filteredAccounts.length)}</p>
        {totalPages > 1 && <div className="pagination" aria-label="Account pages"><button type="button" disabled={page === 1} onClick={() => setCurrentPage((current) => current - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setCurrentPage((current) => current + 1)}>Next</button></div>}
      </div>

      {showForm && (
        <div className="notification-overlay" role="presentation" onClick={closeForm}>
          <section className="notification-modal account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={closeForm} aria-label="Close account form" disabled={saving}>×</button>
            <p className="admin-kicker">Access management</p>
            <h2 id="account-modal-title">{editingId ? 'Edit account' : 'Add account'}</h2>
            <p className="account-modal-subtitle">{editingId ? 'Update access details for this account.' : 'Create a secure account for a staff member or chapel tablet.'}</p>
            {formError && <p className="account-form-error" role="alert">{formError}</p>}
            <form onSubmit={saveAccount}>
              <div className="account-form-grid">
                <label><span>Full name</span><input name="name" value={form.name} onChange={updateForm} required placeholder="e.g. Chapel Staff" /></label>
                <label><span>Email address</span><input name="email" type="email" value={form.email} onChange={updateForm} required placeholder="name@cosmocare.com" /></label>
                <label><span>{editingId ? 'New password' : 'Temporary password'}</span><input name="password" type="password" value={form.password} onChange={updateForm} required={!editingId} minLength="8" placeholder={editingId ? 'Leave blank to keep current password' : 'At least 8 characters'} /></label>
                <label><span>Account type</span><select name="type" value={form.type} onChange={updateForm}><option>Staff</option><option>Chapel</option><option>Admin</option></select></label>
                <label><span>Branch access</span><select name="branch" value={form.branch} onChange={updateForm} required><option value="">Select a branch</option>{branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
                {form.branch && <label><span>Chapel room</span><select name="chapel" value={form.chapel} onChange={updateForm} required={form.type === 'Chapel'}><option value="">Select a chapel room</option>{chapels.map((chapel) => <option key={chapel} value={chapel}>{chapel}</option>)}</select></label>}
                <label><span>Status</span><select name="status" value={form.status} onChange={updateForm}><option>Active</option><option>Inactive</option></select></label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeForm} disabled={saving}>Cancel</button>
                <button className="save-services-button" type="submit" disabled={saving}>{saving ? 'Saving...' : (editingId ? 'Save changes' : 'Create account')}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="notification-overlay" role="presentation" onClick={() => deletingId || setDeleteTarget(null)}>
          <section className="notification-modal account-action-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onClick={(event) => event.stopPropagation()}>
            <div className="account-action-icon account-action-icon-danger">!</div>
            <p className="admin-kicker">Access management</p>
            <h2 id="delete-account-title">Delete account?</h2>
            <p>This will permanently remove <strong>{deleteTarget.name}</strong> and their access to CosmoCare.</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingId)}>Cancel</button>
              <button className="delete-confirm-button" type="button" onClick={deleteAccount} disabled={Boolean(deletingId)}>{deletingId ? 'Deleting...' : 'Delete account'}</button>
            </div>
          </section>
        </div>
      )}

      {feedback && (
        <div className="notification-overlay" role="presentation" onClick={() => setFeedback(null)}>
          <section className="notification-modal account-action-modal" role="dialog" aria-modal="true" aria-labelledby="account-success-title" onClick={(event) => event.stopPropagation()}>
            <div className="account-action-icon account-action-icon-success">✓</div>
            <p className="admin-kicker">Access management</p>
            <h2 id="account-success-title">{feedback.title}</h2>
            <p>{feedback.message}</p>
            <div className="modal-actions">
              <button className="save-services-button" type="button" onClick={() => setFeedback(null)}>Done</button>
            </div>
            </section>
        </div>
      )}
    </section>
  )
}

export default StaffAccounts
