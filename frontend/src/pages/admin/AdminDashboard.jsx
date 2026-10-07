import { useEffect, useRef, useState } from 'react'
import logo from '../../assets/Logo.png'
import { api, API_URL } from '../../api.js'
import StaffAccounts from './StaffAccounts.jsx'
import Reports from './Reports.jsx'
import ActivityLogs from './ActivityLogs.jsx'
import AdminSettings from './AdminSettings.jsx'
import '../../App.css'

const TABLE_PAGE_SIZE = 5
const BRANCHES = ['All branches', 'Argao', 'Bogo', 'Car-Car', 'Corduva', 'Danao', 'Junquera', 'Lapu-Lapu', 'Lilioan', 'Mandaue', 'Maracas']

const navItems = [
  ['dashboard', 'Dashboard'],
  ['requests', 'Customer Requests'],
  ['accounts', 'Staff & Chapel Accounts'],
  ['services', 'Service Offers'],
  ['reports', 'Reports'],
]

function NavIcon({ name }) {
  const icons = {
    dashboard: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    requests: <><path d="M5 5h14v14H5z" /><path d="M8 9h8M8 13h5" /><path d="M8 3v4M16 3v4" /></>,
    accounts: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.4-3.7 3-6 7-6s6.6 2.3 7 6" /></>,
    reports: <><path d="M5 19V5M5 19h15" /><path d="m8 15 3-4 3 2 4-6" /></>,
    services: <><path d="M12 3 14.8 8.2 20.5 9l-4.1 4 1 5.7-5.4-2.7-5.4 2.7 1-5.7-4.1-4 5.7-.8L12 3Z" /><path d="M12 7.5v5M9.5 10h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.4A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2H15V5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V13H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    audit: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></>,
  }

  return <svg className="nav-svg" viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>
}

function AdminDashboard() {
  const [active, setActive] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = Boolean(sessionStorage.getItem('admin-session'))
  const [services, setServices] = useState([])
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', tone: 'violet', icon: 'other', enabled: true })
  const [editingService, setEditingService] = useState(null)
  const [serviceError, setServiceError] = useState('')
  const [serviceSaving, setServiceSaving] = useState(false)
  const [serviceFeedback, setServiceFeedback] = useState('')
  const [deletingService, setDeletingService] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [bellOpen, setBellOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [adminMessage, setAdminMessage] = useState('')
  const [messageBranch, setMessageBranch] = useState('All branches')
  const [messengerOpen, setMessengerOpen] = useState(false)
  const [requestPage, setRequestPage] = useState(1)
  const [requestItems, setRequestItems] = useState([])
  const [deletedRequestItems, setDeletedRequestItems] = useState([])
  const [requestSearch, setRequestSearch] = useState('')
  const [requestView, setRequestView] = useState('active')
  const [selectedRequestIds, setSelectedRequestIds] = useState([])
  const [deletingRequestIds, setDeletingRequestIds] = useState([])
  const [requestError, setRequestError] = useState('')
  const [requestBranch, setRequestBranch] = useState('All branches')
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const currentUser = JSON.parse(sessionStorage.getItem('cosmocare-user') || 'null')
  useEffect(() => {
    const refresh = () => {
      api('/api/requests').then((items) => setRequestItems(items.map((item) => ({ ...item, id: item._id })))).catch((error) => setRequestError(error.message))
      if (isAdmin) api('/api/requests?deleted=true').then((items) => setDeletedRequestItems(items.map((item) => ({ ...item, id: item._id })))).catch((error) => setRequestError(error.message))
      api('/api/notifications').then(setNotifications).catch(() => {})
    }
    refresh()
    api('/api/services').then(setServices).catch((requestError) => setServiceError(requestError.message))
    const stream = new EventSource(`${API_URL}/api/requests/stream?token=${encodeURIComponent(sessionStorage.getItem('cosmocare-token') || '')}`)
    stream.addEventListener('request-created', refresh)
    stream.addEventListener('request-updated', refresh)
    stream.addEventListener('request-deleted', refresh)
    stream.addEventListener('notification-created', refresh)
    return () => stream.close()
  }, [isAdmin])
  const [servicePage, setServicePage] = useState(1)
  const adminNotifications = notifications.filter((item) => item.recipient === 'admin')
  const pendingRequests = requestItems.filter((item) => item.status === 'Pending').length
  const completedRequests = requestItems.filter((item) => item.status === 'Completed').length
  const activeChapels = new Set(requestItems.map((item) => item.chapel).filter(Boolean)).size
  const displayedRequestItems = requestView === 'deleted' ? deletedRequestItems : requestItems
  const requestRows = displayedRequestItems.filter((item) => {
    const query = requestSearch.trim().toLowerCase()
    const matchesBranch = requestBranch === 'All branches' || item.chapel === requestBranch
    return matchesBranch && (!query || [item.request, item.requestedBy, item.chapel, item.location, item.details, item.id].some((value) => String(value || '').toLowerCase().includes(query)))
  })
  const requestPages = Math.max(1, Math.ceil(requestRows.length / TABLE_PAGE_SIZE))
  const visibleRequests = requestRows.slice((requestPage - 1) * TABLE_PAGE_SIZE, requestPage * TABLE_PAGE_SIZE)
  const allVisibleRequestsSelected = visibleRequests.length > 0 && visibleRequests.every((item) => selectedRequestIds.includes(item.id))
  const toggleRequestSelection = (id) => setSelectedRequestIds((ids) => ids.includes(id) ? ids.filter((selectedId) => selectedId !== id) : [...ids, id])
  const toggleSelectAllRequests = () => {
    const visibleIds = visibleRequests.map((item) => item.id)
    setSelectedRequestIds((ids) => allVisibleRequestsSelected ? ids.filter((id) => !visibleIds.includes(id)) : [...new Set([...ids, ...visibleIds])])
  }
  const confirmDeleteRequests = () => {
    if (selectedRequestIds.length > 0) setDeletingRequestIds(selectedRequestIds)
  }
  const deleteRequests = async () => {
    try {
      setRequestError('')
      await Promise.all(deletingRequestIds.map((id) => api(`/api/requests/${id}`, { method: 'DELETE' })))
      setSelectedRequestIds([])
      setDeletingRequestIds([])
      api('/api/requests').then((items) => setRequestItems(items.map((item) => ({ ...item, id: item._id }))))
      api('/api/requests?deleted=true').then((items) => setDeletedRequestItems(items.map((item) => ({ ...item, id: item._id }))))
    } catch (error) {
      setRequestError(error.message)
      setDeletingRequestIds([])
    }
  }
  const updateRequest = (id, changes) => {
    api(`/api/requests/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }).then((updated) => {
      setRequestItems((items) => items.map((item) => item.id === id ? { ...item, ...updated, id: updated._id } : item))
    }).catch(() => {})
  }
  const servicePages = Math.max(1, Math.ceil(services.length / TABLE_PAGE_SIZE))
  const visibleServices = services.slice((servicePage - 1) * TABLE_PAGE_SIZE, servicePage * TABLE_PAGE_SIZE)
  const openNotification = (item) => {
    api(`/api/notifications/${item._id}/read`, { method: 'PATCH' }).then((updated) => {
      setNotifications((items) => items.map((notification) => notification._id === updated._id ? updated : notification))
    }).catch(() => {})
    setSelectedNotification(item)
    setBellOpen(false)
  }

  const openServiceForm = (service = null) => {
    const nextService = service || { id: null, name: '', description: '', tone: 'violet', icon: 'other', enabled: true }
    setEditingService(nextService)
    setServiceForm({ ...nextService })
    setServiceError('')
  }

  const saveService = async (event) => {
    event.preventDefault()
    setServiceSaving(true)
    setServiceError('')
    try {
      const isEditing = Boolean(editingService?.id)
      const saved = await api(isEditing ? `/api/services/${editingService.id}` : '/api/services', {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(serviceForm),
      })
      setServices((items) => isEditing ? items.map((item) => item.id === editingService.id ? saved : item) : [...items, saved])
      setEditingService(null)
      setServiceFeedback(isEditing ? 'Service updated successfully.' : 'Service added successfully.')
    } catch (requestError) {
      setServiceError(requestError.message)
    } finally {
      setServiceSaving(false)
    }
  }

  const toggleService = async (service) => {
    try {
      const updated = await api(`/api/services/${service.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !service.enabled }) })
      setServices((items) => items.map((item) => item.id === service.id ? updated : item))
    } catch (requestError) {
      setServiceError(requestError.message)
    }
  }

  const deleteService = async () => {
    if (!deletingService) return
    try {
      await api(`/api/services/${deletingService.id}`, { method: 'DELETE' })
      setServices((items) => items.filter((item) => item.id !== deletingService.id))
      setDeletingService(null)
      setServiceFeedback('Service deleted successfully.')
    } catch (requestError) {
      setServiceError(requestError.message)
    }
  }

  const logout = () => {
    sessionStorage.removeItem('admin-session')
    sessionStorage.removeItem('staff-session')
    sessionStorage.removeItem('cosmocare-token')
    sessionStorage.removeItem('cosmocare-user')
    window.location.assign('/admin/login')
  }

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <a className="admin-brand" href="/admin/dashboard">
            <span className="brand-mark"><img src={logo} alt="" /></span>
            <span><strong>CosmoCare</strong><small>Admin portal</small></span>
          </a>
          <button
            className="admin-menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <nav className={`admin-nav ${menuOpen ? 'menu-open' : ''}`} aria-label="Admin navigation">
          <p className="admin-nav-label">Workspace</p>
          {navItems.filter(([id]) => isAdmin || !['accounts', 'services'].includes(id)).map(([id, label]) => (
            <button className={active === id ? 'active' : ''} type="button" key={id} onClick={() => { setActive(id); setMenuOpen(false) }}>
            <NavIcon name={id} />
            {label}
            </button>
          ))}
          {isAdmin && (
            <>
              <p className="admin-nav-label admin-nav-secondary">Administration</p>
              <button className={active === 'settings' ? 'active' : ''} type="button" onClick={() => { setActive('settings'); setMenuOpen(false) }}><NavIcon name="settings" />Settings</button>
              <button className={active === 'audit' ? 'active' : ''} type="button" onClick={() => { setActive('audit'); setMenuOpen(false) }}><NavIcon name="audit" />Activity log</button>
            </>
          )}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-user"><span>{(currentUser?.name || 'User').slice(0, 2).toUpperCase()}</span><div><strong>{currentUser?.name || 'User'}</strong><small>{currentUser?.type || 'Account'}</small></div></div>
          <button className="admin-logout" type="button" onClick={() => setLogoutConfirmOpen(true)}>Log out</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><p className="admin-kicker">Tuesday, October 6, 2026</p><h1>{active === 'dashboard' ? 'Good morning, Admin' : navItems.find(([id]) => id === active)?.[1] || 'Settings'}</h1></div>
          <div className="admin-top-actions"><span className="admin-live"><b /> System live</span><NotificationBell notifications={adminNotifications} open={bellOpen} onToggle={() => setBellOpen((open) => !open)} onOpen={openNotification} /></div>
        </header>

        {active === 'dashboard' && (
          <>
            <section className="admin-stat-grid">
              <div className="admin-stat"><span className="stat-icon stat-blue">↗</span><small>Total requests</small><strong>{requestItems.length}</strong><em>Live from database</em></div>
              <div className="admin-stat"><span className="stat-icon stat-amber">◷</span><small>Pending requests</small><strong>{pendingRequests}</strong><em className="stat-warning">Needs attention</em></div>
              <div className="admin-stat"><span className="stat-icon stat-green">✓</span><small>Completed requests</small><strong>{completedRequests}</strong><em>Live from database</em></div>
              <div className="admin-stat"><span className="stat-icon stat-teal">⌂</span><small>Requesting chapels</small><strong>{activeChapels}</strong><em>Unique chapel names</em></div>
            </section>
            <section className="admin-panel request-panel">
              <div className="panel-heading"><div><p className="admin-kicker">Live activity</p><h2>Recent customer requests</h2></div><button type="button" onClick={() => setActive('requests')}>View all requests →</button></div>
              <div className="request-table">
                <div className="request-row request-row-header"><span>Request</span><span>Location</span><span>Received</span><span>Status</span></div>
                {visibleRequests.slice(0, TABLE_PAGE_SIZE).map((item, index) => <RequestRow key={`dashboard-${item.id}-${index}`} item={item} onUpdate={updateRequest} />)}
              </div>
              <TablePagination page={requestPage} pages={requestPages} total={requestRows.length} onPageChange={setRequestPage} />
            </section>
          </>
        )}


        {active === 'requests' && <section className="admin-panel request-panel"><div className="panel-heading"><div><p className="admin-kicker">Operations</p><h2>Customer requests</h2></div><button type="button">Export list ↓</button></div><div className="request-toolbar"><input className="request-search" type="search" value={requestSearch} onChange={(event) => { setRequestSearch(event.target.value); setRequestPage(1) }} placeholder="Search requests, chapel, requester, or location..." /><select className="request-branch-select" value={requestBranch} onChange={(event) => { setRequestBranch(event.target.value); setRequestPage(1) }} aria-label="Filter requests by branch">{BRANCHES.map((branch) => <option key={branch}>{branch}</option>)}</select><div className="request-view-tabs"><button className={requestView === 'active' ? 'active' : ''} type="button" onClick={() => { setRequestView('active'); setRequestPage(1); setSelectedRequestIds([]) }}>Active</button><button className={requestView === 'deleted' ? 'active' : ''} type="button" onClick={() => { setRequestView('deleted'); setRequestPage(1); setSelectedRequestIds([]) }}>Deleted</button></div></div>{requestError && <p className="account-form-error" role="alert">{requestError}</p>}{requestView === 'active' && selectedRequestIds.length > 0 && <div className="request-bulk-actions"><span>{selectedRequestIds.length} request{selectedRequestIds.length === 1 ? '' : 's'} selected</span><button className="delete-confirm-button" type="button" onClick={confirmDeleteRequests}>Delete selected</button></div>}<div className="request-table"><div className="request-row request-row-header"><span><input type="checkbox" checked={requestView === 'active' && allVisibleRequestsSelected} disabled={requestView === 'deleted'} onChange={toggleSelectAllRequests} aria-label="Select all visible requests" /> Request / chapel</span><span>Location</span><span>Received</span><span>Status</span></div>{visibleRequests.length === 0 && <p className="request-empty">{requestView === 'deleted' ? 'No deleted requests.' : 'No requests found.'}</p>}{visibleRequests.map((item, index) => <RequestRow key={`${item.id}-${index}`} item={item} onUpdate={updateRequest} selectable={requestView === 'active'} selected={selectedRequestIds.includes(item.id)} onSelect={() => toggleRequestSelection(item.id)} />)}</div><TablePagination page={requestPage} pages={requestPages} total={requestRows.length} onPageChange={setRequestPage} /></section>}
        {active === 'accounts' && <StaffAccounts />}
        {active === 'reports' && <Reports requests={requestItems} />}
        {active === 'audit' && <ActivityLogs />}
        {active === 'settings' && <AdminSettings />}
        {active === 'services' && (
          <section className="admin-panel service-offers-panel">
            <div className="panel-heading">
              <div><p className="admin-kicker">Customer experience</p><h2>Service offers</h2></div>
              <button type="button" onClick={() => openServiceForm()}>+ Add service</button>
            </div>
            <p className="service-offers-help">Edit the services available on chapel tablets. Disabled services will not be shown to customers.</p>
            {serviceError && <p className="account-form-error" role="alert">{serviceError}</p>}
            <div className="service-offers-list">
              {visibleServices.map((service) => (
                <div className={`service-offer-row ${service.enabled ? '' : 'disabled'}`} key={service.id}>
                  <label className="service-toggle"><input type="checkbox" checked={service.enabled} onChange={() => toggleService(service)} /><span /></label>
                  <span className="service-offer-copy"><strong>{service.name}</strong><small>{service.description}</small></span>
                  <span className={`service-state ${service.enabled ? 'on' : ''}`}>{service.enabled ? 'Active' : 'Hidden'}</span>
                  <span className="service-actions"><button type="button" onClick={() => openServiceForm(service)}>Edit</button><button type="button" className="delete-account" onClick={() => setDeletingService(service)}>Delete</button></span>
                </div>
              ))}
            </div>
            <TablePagination page={servicePage} pages={servicePages} total={services.length} onPageChange={setServicePage} />
          </section>
        )}
      </main>
      <MessengerWidget open={messengerOpen} onToggle={() => setMessengerOpen((open) => !open)} message={adminMessage} setMessage={setAdminMessage} branch={messageBranch} setBranch={setMessageBranch} branches={BRANCHES} messages={notifications.filter((item) => item.recipient === 'staff')} onSent={(message) => setNotifications((items) => [message, ...items])} />
      {selectedNotification && <NotificationModal notification={selectedNotification} onClose={() => setSelectedNotification(null)} />}
      {editingService !== null && (
        <div className="notification-overlay" role="presentation" onClick={() => !serviceSaving && setEditingService(null)}>
          <section className="notification-modal account-modal service-modal" role="dialog" aria-modal="true" aria-labelledby="service-modal-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setEditingService(null)} disabled={serviceSaving} aria-label="Close service form">×</button>
            <p className="admin-kicker">Customer experience</p>
            <h2 id="service-modal-title">{editingService.id ? 'Edit service' : 'Add service'}</h2>
            <p className="account-modal-subtitle">This offer will be available to chapel tablets when active.</p>
            {serviceError && <p className="account-form-error" role="alert">{serviceError}</p>}
            <form onSubmit={saveService}>
              <div className="account-form-grid">
                <label><span>Service name</span><input value={serviceForm.name} onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })} required placeholder="e.g. Request blankets" /></label>
                <label><span>Description</span><input value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} required placeholder="Short explanation for visitors" /></label>
                <label><span>Card color</span><select value={serviceForm.tone} onChange={(event) => setServiceForm({ ...serviceForm, tone: event.target.value })}><option value="violet">Violet</option><option value="gold">Gold</option><option value="blue">Blue</option><option value="green">Green</option></select></label>
                <label><span>Status</span><select value={serviceForm.enabled ? 'Active' : 'Hidden'} onChange={(event) => setServiceForm({ ...serviceForm, enabled: event.target.value === 'Active' })}><option>Active</option><option>Hidden</option></select></label>
              </div>
              <div className="modal-actions"><button type="button" onClick={() => setEditingService(null)} disabled={serviceSaving}>Cancel</button><button className="save-services-button" type="submit" disabled={serviceSaving}>{serviceSaving ? 'Saving...' : editingService.id ? 'Save changes' : 'Add service'}</button></div>
            </form>
          </section>
        </div>
      )}
      {deletingService && <div className="notification-overlay" role="presentation" onClick={() => setDeletingService(null)}><section className="notification-modal account-action-modal" role="dialog" aria-modal="true" aria-labelledby="delete-service-title" onClick={(event) => event.stopPropagation()}><div className="account-action-icon account-action-icon-danger">!</div><p className="admin-kicker">Customer experience</p><h2 id="delete-service-title">Delete service?</h2><p>This will remove <strong>{deletingService.name}</strong> from the service offers.</p><div className="modal-actions"><button type="button" onClick={() => setDeletingService(null)}>Cancel</button><button className="delete-confirm-button" type="button" onClick={deleteService}>Delete service</button></div></section></div>}
      {serviceFeedback && <div className="notification-overlay" role="presentation" onClick={() => setServiceFeedback('')}><section className="notification-modal account-action-modal" role="dialog" aria-modal="true" aria-labelledby="service-success-title" onClick={(event) => event.stopPropagation()}><div className="account-action-icon account-action-icon-success">✓</div><p className="admin-kicker">Customer experience</p><h2 id="service-success-title">Success</h2><p>{serviceFeedback}</p><div className="modal-actions"><button className="save-services-button" type="button" onClick={() => setServiceFeedback('')}>Done</button></div></section></div>}
      {deletingRequestIds.length > 0 && <div className="notification-overlay" role="presentation" onClick={() => setDeletingRequestIds([])}><section className="notification-modal account-action-modal" role="dialog" aria-modal="true" aria-labelledby="delete-request-title" onClick={(event) => event.stopPropagation()}><div className="account-action-icon account-action-icon-danger">!</div><p className="admin-kicker">Customer requests</p><h2 id="delete-request-title">Move to Deleted?</h2><p>This will move {deletingRequestIds.length} selected request{deletingRequestIds.length === 1 ? '' : 's'} to the Deleted view. The database records will not be permanently removed.</p><div className="modal-actions"><button type="button" onClick={() => setDeletingRequestIds([])}>Cancel</button><button className="delete-confirm-button" type="button" onClick={deleteRequests}>Move to Deleted</button></div></section></div>}
      {logoutConfirmOpen && <div className="notification-overlay" role="presentation" onClick={() => setLogoutConfirmOpen(false)}><section className="notification-modal account-action-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title" onClick={(event) => event.stopPropagation()}><div className="account-action-icon account-action-icon-danger">↪</div><p className="admin-kicker">Account security</p><h2 id="logout-title">Log out now?</h2><p>Your current admin session will be ended and you will need to sign in again.</p><div className="modal-actions"><button type="button" onClick={() => setLogoutConfirmOpen(false)}>Stay signed in</button><button className="delete-confirm-button" type="button" onClick={logout}>Log out</button></div></section></div>}
    </div>
  )
}

function MessengerWidget({ open, onToggle, message, setMessage, branch, setBranch, branches, messages, onSent }) {
  const sendMessage = (event) => {
    event.preventDefault()
    if (!message.trim()) return
    api('/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ title: 'Message from administration', message: message.trim(), branch: branch === 'All branches' ? null : branch }),
    }).then((created) => {
      onSent(created)
      setMessage('')
    }).catch(() => {})
  }

  return <div className="messenger-widget">
    {open && <section className="messenger-window" role="dialog" aria-label="Messages with staff">
      <header className="messenger-header"><span className="messenger-avatar">CC</span><div><strong>CosmoCare staff</strong><small><b /> Connected · branch messaging</small></div><button type="button" onClick={onToggle} aria-label="Close messages">×</button></header>
      <div className="messenger-messages">{messages.length === 0 ? <p className="messenger-empty">No messages yet. Start a conversation with your connected staff.</p> : messages.slice(0, 20).reverse().map((item) => <div className="messenger-bubble-wrap" key={item._id || item.id}><span className="messenger-target">{item.branch || 'All branches'}</span><div className="messenger-bubble">{item.message}</div><small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now'}</small></div>)}</div>
      <form className="messenger-compose" onSubmit={sendMessage}><select value={branch} onChange={(event) => setBranch(event.target.value)} aria-label="Message branch">{branches.map((item) => <option key={item}>{item}</option>)}</select><div><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type a message..." aria-label="Message staff" /><button type="submit" aria-label="Send message">➤</button></div></form>
    </section>}
    <button className={`messenger-launcher ${open ? 'open' : ''}`} type="button" onClick={onToggle} aria-label={open ? 'Close messages' : 'Open messages'}><span>✉</span>{messages.length > 0 && <b>{messages.length > 9 ? '9+' : messages.length}</b>}</button>
  </div>
}

function NotificationBell({ notifications, open, onToggle, onOpen }) {
  const notificationRef = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const closeWhenClickedOutside = (event) => {
      if (!notificationRef.current?.contains(event.target)) onToggle()
    }
    document.addEventListener('mousedown', closeWhenClickedOutside)
    return () => document.removeEventListener('mousedown', closeWhenClickedOutside)
  }, [open, onToggle])
  const unread = notifications.filter((item) => !item.read).length
  return <div className="notification-wrap" ref={notificationRef}><button className="notification-bell" type="button" aria-label="Notifications" aria-expanded={open} onClick={onToggle}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{unread > 0 && <b className="notification-count">{unread}</b>}</button>{open && <NotificationMenu notifications={notifications} onOpen={onOpen} />}</div>
}

function TablePagination({ page, pages, total, onPageChange }) {
  return <div className="table-pagination"><span>Showing up to {Math.min(TABLE_PAGE_SIZE, total)} per page · {total} total</span>{pages > 1 && <div className="pagination"><button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page === pages} onClick={() => onPageChange(page + 1)}>Next</button></div>}</div>
}

function RequestRow({ item, onUpdate, selectable = false, selected = false, onSelect }) {
  const tone = item.status === 'Completed' ? 'done' : item.status === 'In progress' ? 'progress' : 'new'
  const requestInfo = <><strong>{item.request}</strong><small>Account Name: {item.createdBy?.name || 'Not provided'}</small><small>Branch: {item.chapel || item.createdBy?.chapel || 'Not provided'}</small><small>Requester: {item.requestedBy || 'Not provided'}</small><small>Details: {item.details || 'None'}</small></>
  const status = selectable ? <select className={`request-status-select ${tone}`} value={item.status} onChange={(event) => onUpdate(item.id, { status: event.target.value })}><option>Pending</option><option>In progress</option><option>Completed</option></select> : <span className={`request-status ${tone}`}>{item.status}</span>
  return <div className="request-row request-management-row"><span>{selectable && <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${item.request}`} />} {requestInfo}</span><span><small>Location: {item.location || 'Not provided'}</small></span><span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : item.time}</span><span>{status}</span></div>
}

function NotificationMenu({ notifications, onOpen }) {
  return <div className="notification-menu"><strong>Notifications</strong>{notifications.length === 0 ? <p>No notifications yet.</p> : notifications.slice(0, 5).map((item) => <button className={item.read ? '' : 'unread'} type="button" key={item.id} onClick={() => onOpen(item)}><span><b>{item.title}</b><small>{item.message}</small></span><i>{item.read ? '' : 'New'}</i></button>)}</div>
}

function NotificationModal({ notification, onClose }) {
  return <div className="notification-overlay" role="presentation" onClick={onClose}><section className="notification-modal" role="dialog" aria-modal="true" aria-labelledby="admin-notification-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Close notification" onClick={onClose}>×</button><p className="admin-kicker">From {notification.sender || 'team member'}</p><h2 id="admin-notification-title">{notification.title}</h2><p>{notification.message}</p><small>{new Date(notification.createdAt).toLocaleString()}</small></section></div>
}

export default AdminDashboard
