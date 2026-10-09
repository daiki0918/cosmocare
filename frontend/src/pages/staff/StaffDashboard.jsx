import { useEffect, useRef, useState } from 'react'
import logo from '../../assets/Logo.png'
import { api, API_URL } from '../../api.js'
import '../../App.css'

const TABLE_PAGE_SIZE = 5

function StaffDashboard() {
  const currentUser = JSON.parse(localStorage.getItem('cosmocare-user') || 'null')
  const [active, setActive] = useState('requests')
  const [suggestion, setSuggestion] = useState('')
  const [suggestionDetails, setSuggestionDetails] = useState('')
  const [showSuggestionModal, setShowSuggestionModal] = useState(false)
  const [suggestionError, setSuggestionError] = useState('')
  const [suggestionSent, setSuggestionSent] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [bellOpen, setBellOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [requestPage, setRequestPage] = useState(1)
  const [requestItems, setRequestItems] = useState([])
  useEffect(() => {
    const refresh = () => {
      api('/api/requests').then((items) => setRequestItems(items.map((item) => ({ ...item, id: item._id })))).catch(() => {})
      api('/api/notifications').then(setNotifications).catch(() => {})
    }
    refresh()
    const stream = new EventSource(`${API_URL}/api/requests/stream?token=${encodeURIComponent(localStorage.getItem('cosmocare-token') || '')}`)
    stream.addEventListener('request-created', refresh)
    stream.addEventListener('request-updated', refresh)
    stream.addEventListener('notification-created', refresh)
    return () => stream.close()
  }, [])
  const requestPages = Math.max(1, Math.ceil(requestItems.length / TABLE_PAGE_SIZE))
  const visibleRequests = requestItems.slice((requestPage - 1) * TABLE_PAGE_SIZE, requestPage * TABLE_PAGE_SIZE)
  const updateRequest = (id, status) => {
    api(`/api/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }).then((updated) => {
      setRequestItems((items) => items.map((item) => item.id === id ? { ...item, ...updated, id: updated._id } : item))
    }).catch(() => {})
  }
  const staffNotifications = notifications.filter((item) => item.recipient === 'staff')
  const pendingRequests = requestItems.filter((item) => item.status === 'Pending').length
  const inProgressRequests = requestItems.filter((item) => item.status === 'In progress').length
  const completedRequests = requestItems.filter((item) => item.status === 'Completed').length
  const openNotification = (item) => {
    api(`/api/notifications/${item._id}/read`, { method: 'PATCH' }).then((updated) => {
      setNotifications((items) => items.map((notification) => notification._id === updated._id ? updated : notification))
    }).catch(() => {})
    setSelectedNotification(item)
    setBellOpen(false)
  }

  const logout = () => {
    localStorage.removeItem('staff-session')
    localStorage.removeItem('cosmocare-token')
    localStorage.removeItem('cosmocare-user')
    sessionStorage.removeItem('staff-session')
    sessionStorage.removeItem('cosmocare-token')
    sessionStorage.removeItem('cosmocare-user')
    window.location.assign('/staff/login')
  }

  return (
    <div className="admin-dashboard staff-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <a className="admin-brand" href="/staff/dashboard">
            <span className="brand-mark"><img src={logo} alt="" /></span>
            <span><strong>CosmoCare</strong><small>Staff portal</small></span>
          </a>
        </div>
        <nav className="admin-nav staff-nav" aria-label="Staff navigation">
          <p className="admin-nav-label">Workspace</p>
          <button className={active === 'requests' ? 'active' : ''} type="button" onClick={() => setActive('requests')}>
            <span className="nav-svg-wrap">▤</span> Customer Requests
          </button>
          <button className={active === 'profile' ? 'active' : ''} type="button" onClick={() => setActive('profile')}>
            <span className="nav-svg-wrap">◎</span> My profile
          </button>
          <button className={active === 'suggest' ? 'active' : ''} type="button" onClick={() => setActive('suggest')}>
            <span className="nav-svg-wrap">✦</span> Suggest a service
          </button>
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-user"><span>{(currentUser?.name || 'User').slice(0, 2).toUpperCase()}</span><div><strong>{currentUser?.name || 'User'}</strong><small>{currentUser?.type || 'Staff member'}</small></div></div>
          <button className="admin-logout" type="button" onClick={() => setLogoutConfirmOpen(true)}>Log out</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><p className="admin-kicker">Staff workspace</p><h1>{active === 'requests' ? 'Customer requests' : active === 'suggest' ? 'Suggest a service' : 'My profile'}</h1></div>
          <div className="admin-top-actions"><span className="admin-live"><b /> System live</span><NotificationBell notifications={staffNotifications} open={bellOpen} onToggle={() => setBellOpen((open) => !open)} onOpen={openNotification} /></div>
        </header>

        {active === 'requests' ? (
          <>
            <section className="admin-stat-grid staff-stat-grid">
              <div className="admin-stat"><span className="stat-icon stat-blue">!</span><small>Pending requests</small><strong>{pendingRequests}</strong><em>Live from database</em></div>
              <div className="admin-stat"><span className="stat-icon stat-amber">◷</span><small>In progress</small><strong>{inProgressRequests}</strong><em className="stat-warning">Currently assigned</em></div>
              <div className="admin-stat"><span className="stat-icon stat-green">✓</span><small>Completed requests</small><strong>{completedRequests}</strong><em>Live from database</em></div>
            </section>
            <section className="admin-panel request-panel">
              <div className="panel-heading"><div><p className="admin-kicker">Assigned to your team</p><h2>Recent customer requests</h2></div><span className="availability"><b /> Live updates</span></div>
              <div className="request-table">
                <div className="request-row request-row-header"><span>Request</span><span>Location</span><span>Received</span><span>Status</span></div>
                {visibleRequests.map((item) => <StaffRequestRow item={item} key={item.id} onUpdate={updateRequest} />)}
              </div>
              <div className="table-pagination"><span>Showing up to {Math.min(TABLE_PAGE_SIZE, requestItems.length)} per page · {requestItems.length} total</span>{requestPages > 1 && <div className="pagination"><button type="button" disabled={requestPage === 1} onClick={() => setRequestPage(requestPage - 1)}>Previous</button><span>Page {requestPage} of {requestPages}</span><button type="button" disabled={requestPage === requestPages} onClick={() => setRequestPage(requestPage + 1)}>Next</button></div>}</div>
            </section>
          </>
        ) : (
          active === 'suggest' ? (
            <section className="admin-panel staff-suggestion-panel">
              <div className="panel-heading"><div><p className="admin-kicker">Help improve guest care</p><h2>Suggest a service</h2></div><span className="suggestion-badge">Admin review</span></div>
              <p className="service-offers-help">Have an idea for a service that would help families? Send it to an administrator for review.</p>
              <button className="save-services-button" type="button" onClick={() => { setSuggestionError(''); setSuggestionSent(false); setShowSuggestionModal(true) }}>Open suggestion form</button>
            </section>
          ) : (
          <section className="admin-panel staff-profile-panel"><div className="panel-heading"><div><p className="admin-kicker">Account information</p><h2>My profile</h2></div><span className="suggestion-badge">Active account</span></div><div className="profile-card"><div className="profile-avatar">{(currentUser?.name || 'User').slice(0, 2).toUpperCase()}</div><div><strong>{currentUser?.name || 'Staff member'}</strong><small>{currentUser?.email || 'No email available'}</small><span>Assigned branch: <b>{currentUser?.chapel || 'Not assigned'}</b></span></div></div><p className="service-offers-help">Your branch assignment controls which customer requests and branch messages appear in your workspace.</p></section>
          )
        )}
      </main>
      {selectedNotification && <NotificationModal notification={selectedNotification} onClose={() => setSelectedNotification(null)} />}
      {showSuggestionModal && (
        <div className="notification-overlay" role="presentation" onClick={() => setShowSuggestionModal(false)}>
          <section className="notification-modal suggestion-modal" role="dialog" aria-modal="true" aria-labelledby="suggestion-modal-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close suggestion form" onClick={() => setShowSuggestionModal(false)}>×</button>
            <p className="admin-kicker">Admin review</p>
            <h2 id="suggestion-modal-title">Suggest a service</h2>
            <p className="modal-description">Share an idea that could make the customer experience better.</p>
            {suggestionError && <p className="account-form-error" role="alert">{suggestionError}</p>}
            <form onSubmit={async (event) => { event.preventDefault(); if (!suggestion.trim()) return; setSuggestionError(''); try { await api('/api/notifications', { method: 'POST', body: JSON.stringify({ title: 'New service suggestion', message: `${suggestion.trim()}${suggestionDetails.trim() ? `\n\nDetails: ${suggestionDetails.trim()}` : ''}` }) }); setSuggestion(''); setSuggestionDetails(''); setShowSuggestionModal(false); setSuggestionSent(true) } catch (requestError) { setSuggestionError(requestError.message) } }}>
              <label className="suggestion-label" htmlFor="service-suggestion">Service suggestion</label>
              <input className="suggestion-input" id="service-suggestion" value={suggestion} onChange={(event) => setSuggestion(event.target.value)} placeholder="e.g. Request umbrellas" required />
              <label className="suggestion-label" htmlFor="suggestion-details">Details (optional)</label>
              <textarea className="suggestion-input suggestion-textarea" id="suggestion-details" value={suggestionDetails} onChange={(event) => setSuggestionDetails(event.target.value)} placeholder="How would this help customers?" />
              <div className="modal-actions"><button type="button" onClick={() => setShowSuggestionModal(false)}>Cancel</button><button className="save-services-button" type="submit">Send suggestion</button></div>
            </form>
          </section>
        </div>
      )}
      {suggestionSent && <div className="notification-overlay" role="presentation" onClick={() => setSuggestionSent(false)}><section className="notification-modal account-action-modal" role="dialog" aria-modal="true" aria-labelledby="suggestion-success-title" onClick={(event) => event.stopPropagation()}><div className="account-action-icon account-action-icon-success">✓</div><p className="admin-kicker">Admin review</p><h2 id="suggestion-success-title">Suggestion sent successfully</h2><p>Your service suggestion was sent to the administrators for review.</p><div className="modal-actions"><button className="save-services-button" type="button" onClick={() => setSuggestionSent(false)}>Done</button></div></section></div>}
      {logoutConfirmOpen && <div className="notification-overlay" role="presentation" onClick={() => setLogoutConfirmOpen(false)}><section className="notification-modal account-action-modal" role="dialog" aria-modal="true" aria-labelledby="staff-logout-title" onClick={(event) => event.stopPropagation()}><div className="account-action-icon account-action-icon-danger">↪</div><p className="admin-kicker">Account security</p><h2 id="staff-logout-title">Log out now?</h2><p>Your staff session will end and you will need to sign in again.</p><div className="modal-actions"><button type="button" onClick={() => setLogoutConfirmOpen(false)}>Stay signed in</button><button className="delete-confirm-button" type="button" onClick={logout}>Log out</button></div></section></div>}
    </div>
  )
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

function NotificationMenu({ notifications, onOpen }) {
  return <div className="notification-menu"><strong>Notifications</strong>{notifications.length === 0 ? <p>No notifications yet.</p> : notifications.slice(0, 5).map((item) => <button className={item.read ? '' : 'unread'} type="button" key={item.id} onClick={() => onOpen(item)}><span><b>{item.title}</b><small>{item.message}</small></span><i>{item.read ? '' : 'New'}</i></button>)}</div>
}

function NotificationModal({ notification, onClose }) {
  return <div className="notification-overlay" role="presentation" onClick={onClose}><section className="notification-modal" role="dialog" aria-modal="true" aria-labelledby="staff-notification-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Close notification" onClick={onClose}>×</button><p className="admin-kicker">From administration</p><h2 id="staff-notification-title">{notification.title}</h2><p>{notification.message}</p><small>{new Date(notification.createdAt).toLocaleString()}</small></section></div>
}

export default StaffDashboard

function StaffRequestRow({ item, onUpdate }) {
  const tone = item.status === 'Completed' ? 'done' : item.status === 'In progress' ? 'progress' : 'new'
  return <div className="request-row request-management-row"><span><span className="request-title"><ServiceIcon name={item.icon} /><strong>{item.request}</strong></span><small>Account: {item.createdBy?.name || 'Not provided'}</small><small>Branch: {item.chapel || item.createdBy?.chapel || 'Not provided'}</small><small>Requester: {item.requestedBy || 'Not provided'}</small><small>Details: {item.details || 'None'}</small></span><span><small>Location: {item.location || 'Not provided'}</small></span><span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : item.time}</span><span><select className={`request-status-select ${tone}`} value={item.status} onChange={(event) => onUpdate(item.id, event.target.value)}><option>Pending</option><option>In progress</option><option>Completed</option></select></span></div>
}

function ServiceIcon({ name = 'other' }) {
  const paths = {
    staff: <><circle cx="12" cy="8" r="3.25" /><path d="M5.2 20c.5-3.8 3.1-6.2 6.8-6.2s6.3 2.4 6.8 6.2" /></>,
    chair: <><path d="M7 4v8.5h10V4" /><path d="M5 12.5h14v3H5zM7 15.5V20M17 15.5V20" /></>,
    water: <><path d="M12 3c3.4 4.3 5.8 7.2 5.8 10.4a5.8 5.8 0 0 1-11.6 0C6.2 10.2 8.6 7.3 12 3Z" /><path d="M9.2 14.2c.2 1.4 1.1 2.3 2.4 2.6" /></>,
    coffee: <><path d="M5 9h11v5.5A3.5 3.5 0 0 1 12.5 18h-4A3.5 3.5 0 0 1 5 14.5V9Z" /><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16M7 5c0 1 1 1 1 2M11 5c0 1 1 1 1 2" /></>,
    food: <><path d="M6 3v7M4 3v4a2 2 0 0 0 4 0V3M6 9v12M16 3v18M16 3c3 2 3 6 0 8" /></>,
    cleaning: <><path d="m14.5 3 6.5 6.5M17.5 6.5 10 14" /><path d="M10 14c-2.8 0-4.8 2-5.8 6 3.8-.1 6.5-1.6 7.2-4.6" /></>,
    aircon: <><path d="M4 8h16M4 12h16M4 16h16" /><path d="M8 5v3M16 5v3M8 16v3M16 16v3" /></>,
    restroom: <><circle cx="8" cy="5" r="2" /><circle cx="16" cy="5" r="2" /><path d="M8 8v6m-3 0h6M16 8v6m-3 0h6M8 14l-2 6M8 14l2 6M16 14l-2 6M16 14l2 6" /></>,
    parking: <><path d="M6 20V4h6a4 4 0 0 1 0 8H6M6 8h6" /><path d="M3 20h18" /></>,
    supplies: <><path d="M4 7h16v13H4zM7 7V4h10v3M8 12h8M8 16h5" /></>,
    coordinator: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.4-3.7 3-6 7-6s6.6 2.3 7 6M12 3v2M5 8H3M21 8h-2" /></>,
    other: <><circle cx="6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18" cy="12" r="1" /></>,
  }
  return <span className="request-service-icon"><svg viewBox="0 0 24 24" aria-hidden="true">{paths[name] || paths.other}</svg></span>
}
