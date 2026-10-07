import { useEffect, useState } from 'react'
import logo from '../../assets/Logo.png'
import '../../App.css'
import { api } from '../../api.js'

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
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    check: <path d="m5 12.5 4.2 4.2L19 7" />,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function CustomerHomes() {
  const [services, setServices] = useState([])
  const [sent, setSent] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [requestedBy, setRequestedBy] = useState('')
  const [requestLocation, setRequestLocation] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  useEffect(() => {
    api('/api/services').then(setServices).catch((requestError) => setError(requestError.message))
  }, [])
  const selectService = (service) => {
    setError('')
    setSelectedService(service)
  }
  const sendRequest = async (event) => {
    event.preventDefault()
    if (!selectedService) return
    setSubmitting(true)
    try {
      await api('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          request: selectedService.label || selectedService.name,
          requestedBy: requestedBy.trim(),
          location: requestLocation.trim(),
          details: details.trim(),
        }),
      })
      setError('')
      setSent({ ...selectedService, label: selectedService.label || selectedService.name })
      setSelectedService(null)
      setRequestedBy('')
      setRequestLocation('')
      setDetails('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="site-header">
        <a className="brand" href="/" aria-label="CosmoCare home">
          <span className="brand-mark"><img src={logo} alt="" /></span>
          <span><strong>CosmoCare</strong><small>Chapel assistance</small></span>
        </a>
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
              sessionStorage.removeItem('chapel-session')
              sessionStorage.removeItem('cosmocare-token')
              sessionStorage.removeItem('cosmocare-user')
              window.location.assign('/')
            }}>Log out</button></div></section></div>}
      <main className="main-content">
        {selectedService ? (
          <section className="request-form-card" aria-labelledby="request-form-title">
            <p className="eyebrow">Almost there</p>
            <h1 id="request-form-title">Tell us where to help.</h1>
            <p className="request-form-copy">Complete these details so our team can respond to your request for <strong>{selectedService.label || selectedService.name}</strong>.</p>
            <form className="request-form" onSubmit={sendRequest}>
              <label htmlFor="requested-by">Requested by</label>
              <input id="requested-by" value={requestedBy} onChange={(event) => setRequestedBy(event.target.value)} placeholder="Full name" required />
              <label htmlFor="request-location">Where should we help?</label>
              <input id="request-location" value={requestLocation} onChange={(event) => setRequestLocation(event.target.value)} placeholder="e.g. main entrance, lobby, or courtyard" required />
              <label htmlFor="request-details">Additional details <span>(optional)</span></label>
              <textarea id="request-details" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Anything our team should know?" rows="3" />
              {error && <p className="customer-login-error" role="alert">{error}</p>}
              <div className="request-form-actions">
                <button className="secondary-button" type="button" onClick={() => { setSelectedService(null); setError('') }}>Back</button>
                <button className="request-submit" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send request'}</button>
              </div>
            </form>
          </section>
        ) : sent ? (
          <section className="confirmation-card" aria-live="polite">
            <div className="confirmation-icon"><Icon name="check" /></div>
            <p className="eyebrow">Request received</p>
            <h1>We&apos;re on our way.</h1>
            <p className="confirmation-copy">Our team has been notified about your request for <strong>{sent.label.toLowerCase()}</strong>. Someone will be with you shortly.</p>
            <button className="secondary-button" type="button" onClick={() => setSent(null)}>Make another request</button>
          </section>
        ) : (
          <>
            <section className="intro">
              <p className="eyebrow">Here for you, whenever you need us</p>
              <h1>How can we make<br /><em>your stay</em> more comfortable?</h1>
              <p className="intro-copy">Choose a service below and our team will take care of the rest.</p>
            </section>
            <section className="service-section" aria-labelledby="services-title">
              <div className="section-heading"><div><p className="eyebrow">Quick assistance</p><h2 id="services-title">What do you need?</h2></div><span className="availability"><b /> Team available now</span></div>
              <div className="service-grid">
                {services.map((service) => (
                  <button className={`service-card ${service.tone}`} type="button" key={service.id} onClick={() => selectService(service)}>
                    <span className="service-icon"><Icon name={service.icon || 'other'} /></span>
                    <span className="service-text"><strong>{service.label || service.name}</strong><small>{service.description}</small></span>
                    <span className="card-arrow"><Icon name="arrow" /></span>
                  </button>
                ))}
              </div>
              <button className="other-service" type="button" onClick={() => selectService({ label: 'Other request' })}>
                <span className="other-icon"><Icon name="other" /></span>
                <span><strong>Other request</strong><small>Tell us what you need</small></span>
                <Icon name="arrow" />
              </button>
              {error && <p className="customer-login-error" role="alert">{error}</p>}
            </section>
          </>
        )}
      </main>
      <footer className="site-footer"><span>Quiet care. Thoughtful service.</span><span className="footer-divider" /><span>CosmoCare Servicing <b>•</b> 2026</span></footer>
    </div>
  )
}

export default CustomerHomes