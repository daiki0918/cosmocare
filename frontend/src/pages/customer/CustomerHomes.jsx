import { useEffect, useRef, useState } from 'react'
import logo from '../../assets/Logo.png'
import '../../App.css'
import { api } from '../../api.js'
import CustomerHelpChat from '../../CustomerHelpChat.jsx'

const REQUEST_COOLDOWN_MS = 30_000

const Icon = ({ name }) => {
  const paths = {
    staff: (<><circle cx="12" cy="8" r="3.25" /><path d="M5.2 20c.5-3.8 3.1-6.2 6.8-6.2s6.3 2.4 6.8 6.2" /></>),
    chair: (<><path d="M7 4v8.5h10V4" /><path d="M5 12.5h14v3H5zM7 15.5V20M17 15.5V20" /></>),
    water: (<><path d="M12 3c3.4 4.3 5.8 7.2 5.8 10.4a5.8 5.8 0 0 1-11.6 0C6.2 10.2 8.6 7.3 12 3Z" /><path d="M9.2 14.2c.2 1.4 1.1 2.3 2.4 2.6" /></>),
    coffee: (<><path d="M5 9h11v5.5A3.5 3.5 0 0 1 12.5 18h-4A3.5 3.5 0 0 1 5 14.5V9Z" /><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16M7 5c0 1 1 1 1 2M11 5c0 1 1 1 1 2" /></>),
    food: (<><path d="M6 3v7M4 3v4a2 2 0 0 0 4 0V3M6 9v12M16 3v18M16 3c3 2 3 6 0 8" /></>),
    cleaning: (<><path d="m14.5 3 6.5 6.5M17.5 6.5 10 14" /><path d="M10 14c-2.8 0-4.8 2-5.8 6 3.8-.1 6.5-1.6 7.2-4.6" /></>),
    aircon: (<><path d="M4 8h16M4 12h16M4 16h16" /><path d="M8 5v3M16 5v3M8 16v3M16 16v3" /></>),
    restroom: (<><circle cx="8" cy="5" r="2" /><circle cx="16" cy="5" r="2" /><path d="M8 8v6m-3 0h6M16 8v6m-3 0h6M8 14l-2 6M8 14l2 6M16 14l-2 6M16 14l2 6" /></>),
    parking: (<><path d="M6 20V4h6a4 4 0 0 1 0 8H6M6 8h6" /><path d="M3 20h18" /></>),
    supplies: (<><path d="M4 7h16v13H4zM7 7V4h10v3M8 12h8M8 16h5" /></>),
    coordinator: (<><circle cx="12" cy="8" r="3" /><path d="M5 20c.4-3.7 3-6 7-6s6.6 2.3 7 6M12 3v2M5 8H3M21 8h-2" /></>),
    other: (<><circle cx="6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18" cy="12" r="1" /></>),
    calendar: (<><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></>),
    heart: <><path d="M20.8 8.7c0 4.8-8.8 11-8.8 11s-8.8-6.2-8.8-11a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z" /><path d="m8 11 2.3 2.3 5-5" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    back: <path d="M19 12H5m6 6-6-6 6-6" />,
    check: <path d="m5 12.5 4.2 4.2L19 7" />,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function resolveServiceIcon(service) {
  if (service.icon && service.icon !== 'other') return service.icon
  const label = `${service.label || ''} ${service.name || ''}`.toLowerCase()
  if (label.includes('staff')) return 'staff'
  if (label.includes('chair')) return 'chair'
  if (label.includes('water')) return 'water'
  if (label.includes('coffee')) return 'coffee'
  if (label.includes('food') || label.includes('meal')) return 'food'
  if (label.includes('clean')) return 'cleaning'
  if (label.includes('aircon') || label.includes('air con') || label.includes('temperature')) return 'aircon'
  if (label.includes('restroom') || label.includes('bathroom')) return 'restroom'
  if (label.includes('parking')) return 'parking'
  if (label.includes('suppl')) return 'supplies'
  if (label.includes('coordinator')) return 'coordinator'
  return 'other'
}

const serviceCategories = [
  {
    id: 'assistance',
    title: 'Call for Assistance',
    description: 'Speak with our team',
    icon: 'staff',
  },
  {
    id: 'food',
    title: 'Food & Refreshments',
    description: 'Water, coffee and meals',
    icon: 'coffee',
  },
  {
    id: 'comfort',
    title: 'Chapel Comfort',
    description: 'Chairs, aircon and supplies',
    icon: 'chair',
  },
  {
    id: 'housekeeping',
    title: 'Housekeeping',
    description: 'Cleaning and restroom needs',
    icon: 'cleaning',
  },
  {
    id: 'wake',
    title: 'Wake & Service Details',
    description: 'Schedule and arrangements',
    icon: 'calendar',
  },
  {
    id: 'other',
    title: 'Other Requests',
    description: 'Tell us what you need',
    icon: 'other',
  },
]

function getServiceCategory(service) {
  const icon = resolveServiceIcon(service)
  const label = `${service.label || ''} ${service.name || ''} ${service.description || ''}`.toLowerCase()
  if (['staff', 'coordinator'].includes(icon)) return 'assistance'
  if (/funeral director|urgent assistance|call staff/.test(label)) return 'assistance'
  if (['water', 'coffee', 'food'].includes(icon)) return 'food'
  if (/refresh|cater|meal|drink|beverage/.test(label)) return 'food'
  if (['chair', 'aircon', 'supplies'].includes(icon) || /light|temperature|comfort|chair|supply/.test(label)) return 'comfort'
  if (['cleaning', 'restroom'].includes(icon)) return 'housekeeping'
  if (/clean|trash|spill|restroom|bathroom/.test(label)) return 'housekeeping'
  if (/schedule|flower|memorial|wake|service details/.test(label)) return 'wake'
  if (/parking|direction|special request/.test(label)) return 'other'
  return 'other'
}

function getSignedInCustomer() {
  const storedUser = localStorage.getItem('cosmocare-user')
  if (!storedUser) return null
  try {
    return JSON.parse(storedUser)
  } catch {
    return null
  }
}

function getRequestCooldownKey(customer, request) {
  const account = customer?.id || customer?.email || customer?.name || 'chapel'
  return `cosmocare-request-cooldown:${encodeURIComponent(account)}:${encodeURIComponent(request.toLowerCase())}`
}

function getCurrentTimestamp() {
  return Date.now()
}

function CustomerHomes() {
  const currentCustomer = getSignedInCustomer()
  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [sent, setSent] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [otherRequestOption, setOtherRequestOption] = useState(null)
  const [otherRequestDetails, setOtherRequestDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeRequest, setActiveRequest] = useState('')
  const [error, setError] = useState('')
  const [showRequests, setShowRequests] = useState(false)
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState('')
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [cooldownNow, setCooldownNow] = useState(() => Date.now())
  const submitLock = useRef(false)
  useEffect(() => {
    api('/api/services')
      .then(setServices)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setServicesLoading(false))
  }, [])
  const categoryServices = selectedCategory
    ? services.filter((service) => getServiceCategory(service) === selectedCategory.id)
    : []
  const availableCategories = serviceCategories.filter((category) => (
    services.some((service) => getServiceCategory(service) === category.id)
  ))
  const requestOptions = selectedCategory
    ? categoryServices.map((service) => ({
      label: service.label || service.name,
      description: service.description,
      icon: resolveServiceIcon(service),
    }))
    : []
  const selectCategory = (category) => {
    setError('')
    setCooldownNow(getCurrentTimestamp())
    setSelectedCategory(category)
  }
  const chooseChatService = (service) => {
    setShowRequests(false)
    if (!service) {
      setSelectedCategory(null)
      return
    }
    const category = serviceCategories.find((item) => item.id === getServiceCategory(service))
    setSelectedCategory(category || null)
  }
  useEffect(() => {
    if (!selectedCategory) return undefined
    const timer = window.setInterval(() => setCooldownNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [selectedCategory])
  const getCooldownRemaining = (request) => Math.max(
    0,
    Number(localStorage.getItem(getRequestCooldownKey(currentCustomer, request)) || 0) - cooldownNow,
  )
  const sendRequest = async (option, details = '') => {
    if (!selectedCategory || submitLock.current) return
    const requestDetails = details.trim()
    if (option.label.trim().toLowerCase() === 'other request' && !requestDetails) {
      setError('Please describe what kind of request you need.')
      return
    }
    const location = currentCustomer?.chapel || currentCustomer?.branch || localStorage.getItem('chapel-session')
    if (!currentCustomer?.name || !location) {
      setError('Your chapel account details are missing. Please sign out and sign in again.')
      return
    }
    const cooldownKey = getRequestCooldownKey(currentCustomer, option.label)
    const existingCooldown = Number(localStorage.getItem(cooldownKey) || 0)
    const now = getCurrentTimestamp()
    if (existingCooldown > now) {
      setCooldownNow(now)
      setError(`Please wait ${Math.ceil((existingCooldown - now) / 1000)} seconds before repeating this request.`)
      return
    }
    const cooldownUntil = now + REQUEST_COOLDOWN_MS
    submitLock.current = true
    setSubmitting(true)
    setActiveRequest(option.label)
    setError('')
    localStorage.setItem(cooldownKey, String(cooldownUntil))
    setCooldownNow(now)
    try {
      await api('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          request: option.label,
          icon: option.icon,
          requestedBy: currentCustomer.name,
          location,
          details: requestDetails,
        }),
      })
      const successfulCooldownUntil = getCurrentTimestamp() + REQUEST_COOLDOWN_MS
      localStorage.setItem(cooldownKey, String(successfulCooldownUntil))
      setCooldownNow(getCurrentTimestamp())
      setSent({ label: option.label })
      setSelectedCategory(null)
      setOtherRequestOption(null)
      setOtherRequestDetails('')
      setShowRequests(false)
    } catch (requestError) {
      if (localStorage.getItem(cooldownKey) === String(cooldownUntil)) localStorage.removeItem(cooldownKey)
      setError(requestError.message)
    } finally {
      submitLock.current = false
      setSubmitting(false)
      setActiveRequest('')
    }
  }
  const chooseRequest = (option) => {
    if (option.label.trim().toLowerCase() === 'other request') {
      setError('')
      setOtherRequestDetails('')
      setOtherRequestOption(option)
      return
    }
    void sendRequest(option)
  }
  const loadRequests = async () => {
    setRequestsLoading(true)
    setRequestsError('')
    try {
      setRequests(await api('/api/requests'))
      setShowRequests(true)
      setSelectedCategory(null)
    } catch (requestError) {
      setRequestsError(requestError.message)
    } finally {
      setRequestsLoading(false)
    }
  }
  return (
    <div className="app-shell customer-home">
      <header className="customer-header">
        <div className="customer-header-label">
          <span>COSMOPOLITAN FUNERAL HOMES</span>
          {currentCustomer?.chapel && <small>{currentCustomer.chapel}</small>}
        </div>
        <div className="account-actions">
          <button
            className="logout-button"
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
          >
            Log out
          </button>
        </div>
      </header>
      {logoutConfirmOpen && <div className="notification-overlay" role="presentation" onClick={() => setLogoutConfirmOpen(false)}><section className="notification-modal account-action-modal" role="dialog" aria-modal="true" aria-labelledby="customer-logout-title" onClick={(event) => event.stopPropagation()}><div className="account-action-icon account-action-icon-danger">↪</div><p className="admin-kicker">Account security</p><h2 id="customer-logout-title">Log out now?</h2><p>Your chapel session will end and you will need to sign in again.</p><div className="modal-actions"><button type="button" onClick={() => setLogoutConfirmOpen(false)}>Stay signed in</button><button className="delete-confirm-button" type="button" onClick={() => {
              localStorage.removeItem('chapel-session')
              localStorage.removeItem('cosmocare-token')
              localStorage.removeItem('cosmocare-user')
              sessionStorage.removeItem('chapel-session')
              sessionStorage.removeItem('cosmocare-token')
              sessionStorage.removeItem('cosmocare-user')
              window.location.assign('/')
            }}>Log out</button></div></section></div>}
      <main className="customer-content">
        <div className="customer-panel">
          {!selectedCategory && !showRequests && (
            <div className="customer-welcome">
              <div>
                <p className="eyebrow">Here whenever you need us</p>
                <h1>How can we assist you?</h1>
                <p>We're here to make your stay more comfortable.</p>
              </div>
              <span className="customer-heart" aria-label="CosmoCare"><Icon name="heart" /></span>
            </div>
          )}
          {selectedCategory ? (
          <section className="customer-options" aria-labelledby="customer-options-title">
            <button className="customer-back-link customer-options-back" type="button" onClick={() => { setSelectedCategory(null); setError('') }}>
              <Icon name="back" /> All services
            </button>
            <div className="customer-options-heading">
              <span className="customer-options-icon"><Icon name={selectedCategory.icon} /></span>
              <div>
                <p className="eyebrow">Choose a request</p>
                <h2 id="customer-options-title">{selectedCategory.title}</h2>
                <p>Tap an item and we’ll notify our team right away.</p>
              </div>
            </div>
            <div className="customer-option-list">
              {requestOptions.map((option) => (
                <button className="customer-option-button" type="button" key={option.label} onClick={() => chooseRequest(option)} disabled={submitting || getCooldownRemaining(option.label) > 0}>
                  <span className="customer-option-icon"><Icon name={option.icon} /></span>
                  <span className="customer-option-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
                  {submitting && activeRequest === option.label
                    ? <span className="customer-option-wait">Sending…</span>
                    : getCooldownRemaining(option.label) > 0
                      ? <span className="customer-option-wait">Wait {Math.ceil(getCooldownRemaining(option.label) / 1000)}s</span>
                      : <Icon name="arrow" />}
                </button>
              ))}
            </div>
            <p className="customer-quick-note">Your account and chapel are added automatically. A short cooldown prevents accidental repeat requests.</p>
            {error && <p className="customer-login-error" role="alert">{error}</p>}
          </section>
        ) : showRequests ? (
          <section className="customer-requests" aria-labelledby="customer-requests-title">
            <div className="customer-requests-heading">
              <div><p className="eyebrow">Your chapel</p><h2 id="customer-requests-title">My requests</h2></div>
              <button type="button" className="customer-back-link" onClick={() => setShowRequests(false)}>Back to services</button>
            </div>
            {requestsError && <p className="customer-login-error" role="alert">{requestsError}</p>}
            {requestsLoading ? <p className="customer-empty-state">Loading your requests…</p> : requests.length ? (
              <ul className="customer-request-list">
                {requests.map((request) => (
                  <li key={request._id}>
                    <div><strong>{request.request}</strong>{request.details && <small>{request.details}</small>}<small>Submitted {new Date(request.createdAt).toLocaleString()}</small></div>
                    <span className={`customer-request-status ${request.status === 'Completed' ? 'complete' : request.status === 'In progress' ? 'progress' : ''}`}>{request.status}</span>
                  </li>
                ))}
              </ul>
            ) : !requestsError && <p className="customer-empty-state">You haven't submitted any requests yet.</p>}
            {!requestsLoading && requestsError && <button className="customer-back-link" type="button" onClick={loadRequests}>Try again</button>}
          </section>
        ) : (
        <>
          <section className="service-section customer-service-section" aria-labelledby="services-title">
            <div className="customer-service-heading">
              <div><span className="eyebrow">Here whenever you need us</span><h2 id="services-title">Choose a service</h2></div>
              <span className="customer-available"><i /> Team ready to help</span>
            </div>
            {servicesLoading ? <p className="customer-empty-state">Loading available services…</p> : availableCategories.length ? (
            <div className="service-grid">
              {availableCategories.map((category) => (
                <button className="service-card customer-service-card" type="button" key={category.id} onClick={() => selectCategory(category)} disabled={submitting}>
                  <span className="customer-service-icon"><Icon name={category.icon} /></span>
                  <span className="service-text"><strong>{category.title}</strong><small>{category.description}</small></span>
                  <span className="customer-card-arrow"><Icon name="arrow" /></span>
                </button>
              ))}
            </div>
            ) : !error && <p className="customer-empty-state">There are no assistance services available right now. Please contact a team member.</p>}
            <button className="customer-view-requests" type="button" onClick={loadRequests} disabled={requestsLoading}>
              <span className="customer-requests-icon"><Icon name="check" /></span>
              <span>{requestsLoading ? 'Loading requests…' : 'View my requests'}</span>
              <Icon name="arrow" />
            </button>
            {requestsError && <p className="customer-login-error" role="alert">{requestsError}</p>}
            {error && <p className="customer-login-error" role="alert">{error}</p>}
          </section>
        </>
        )}
        </div>
      </main>
      {otherRequestOption && (
        <div className="notification-overlay" role="presentation" onClick={() => !submitting && setOtherRequestOption(null)}>
          <section className="notification-modal suggestion-modal other-request-modal" role="dialog" aria-modal="true" aria-labelledby="other-request-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close other request form" onClick={() => setOtherRequestOption(null)} disabled={submitting}>×</button>
            <p className="admin-kicker">Other request</p>
            <h2 id="other-request-title">What do you need?</h2>
            <p className="modal-description">Tell our team what kind of request you have so they can be prepared to help.</p>
            {error && <p className="customer-login-error" role="alert">{error}</p>}
            <form onSubmit={(event) => { event.preventDefault(); void sendRequest(otherRequestOption, otherRequestDetails) }}>
              <label className="suggestion-label" htmlFor="other-request-details">Request details</label>
              <textarea
                className="suggestion-input suggestion-textarea"
                id="other-request-details"
                value={otherRequestDetails}
                onChange={(event) => setOtherRequestDetails(event.target.value)}
                placeholder="Describe what you need..."
                maxLength={500}
                required
                autoFocus
              />
              <div className="other-request-character-count">{otherRequestDetails.length}/500</div>
              <div className="modal-actions">
                <button type="button" onClick={() => setOtherRequestOption(null)} disabled={submitting}>Cancel</button>
                <button className="save-services-button" type="submit" disabled={submitting || !otherRequestDetails.trim()}>
                  {submitting ? 'Sending...' : 'Send request'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {sent && <div className="notification-overlay" role="presentation" onClick={() => setSent(null)}>
        <section className="notification-modal account-action-modal" role="dialog" aria-modal="true" aria-labelledby="request-success-title" onClick={(event) => event.stopPropagation()}>
          <div className="account-action-icon account-action-icon-success">✓</div>
          <p className="admin-kicker">Request received</p>
          <h2 id="request-success-title">Request sent successfully</h2>
          <p>Our team has been notified about your request for <strong>{sent.label.toLowerCase()}</strong>. Someone will be with you shortly.</p>
          <div className="modal-actions">
            <button className="save-services-button" type="button" onClick={() => setSent(null)}>Done</button>
          </div>
        </section>
      </div>}
      <CustomerHelpChat
        services={services}
        onViewRequests={loadRequests}
        onChooseService={chooseChatService}
      />
      <footer className="customer-footer"><a className="brand" href="/" aria-label="CosmoCare home"><span className="brand-mark"><img src={logo} alt="" /></span><span><strong>CosmoCare</strong><small>Quiet care. Thoughtful service.</small></span></a></footer>
    </div>
  )
}

export default CustomerHomes