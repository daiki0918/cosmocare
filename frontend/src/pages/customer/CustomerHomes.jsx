import { useEffect, useRef, useState } from 'react'
import logo from '../../assets/Logo.png'
import '../../App.css'
import './CustomerHome.css'
import { api } from '../../api.js'
import CustomerHelpChat from './CustomerHelpChat.jsx'

const REQUEST_COOLDOWN_MS = 30_000
// Keep slightly above --ch-dur-base in CustomerHome.css (200ms) so exit animations can finish.
const MODAL_EXIT_MS = 220
const SKELETON_CARD_COUNT = 6
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

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
    list: (<><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>),
    logout: <><path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" /><path d="m15 8 4 4-4 4M19 12H9" /></>,
    close: <path d="M6 6l12 12M18 6 6 18" />,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>
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

/* Three quiet notes shown beneath the service list. Each one describes
   behaviour that actually exists in this screen — no invented promises. */
const assuranceNotes = [
  {
    title: 'Addressed to your chapel',
    description: 'Your name and chapel are attached automatically. There is nothing to type.',
    icon: 'check',
  },
  {
    title: 'Reviewed before it is sent',
    description: 'A short confirmation step lets you check the request first.',
    icon: 'check',
  },
  {
    title: 'Paced to prevent repeats',
    description: 'A brief cooldown keeps an accidental double request from reaching the team.',
    icon: 'check',
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

function signOut() {
  localStorage.removeItem('chapel-session')
  localStorage.removeItem('cosmocare-token')
  localStorage.removeItem('cosmocare-user')
  sessionStorage.removeItem('chapel-session')
  sessionStorage.removeItem('cosmocare-token')
  sessionStorage.removeItem('cosmocare-user')
  window.location.assign('/')
}

/**
 * Keeps a dialog mounted long enough to play its exit animation.
 * `item` keeps the last non-null value so the content doesn't vanish mid-fade.
 */
function usePresence(value, exitMs) {
  const [snapshot, setSnapshot] = useState(value)
  const [mounted, setMounted] = useState(Boolean(value))

  useEffect(() => {
    if (value) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSnapshot(value)
      setMounted(true)
      return undefined
    }
    const timer = window.setTimeout(() => setMounted(false), exitMs)
    return () => window.clearTimeout(timer)
  }, [value, exitMs])

  return {
    item: value || snapshot,
    mounted: Boolean(value) || mounted,
    closing: !value,
  }
}

/**
 * Shared dialog shell: overlay, focus handling, focus trap, and enter/exit animation hooks.
 * Escape handling lives in the screen component so it can respect the submit lock.
 */
function ModalShell({
  closing,
  onDismiss,
  labelledBy,
  describedBy,
  className = '',
  skipOverlayFade = false,
  hideBackdrop = false,
  inert = false,
  children,
}) {
  const dialogRef = useRef(null)
  const pressStartedOnOverlay = useRef(false)
  const [opener] = useState(() => document.activeElement)
  const [skipFade] = useState(skipOverlayFade)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) {
      const first = dialog.querySelector(FOCUSABLE)
      ;(first || dialog).focus({ preventScroll: true })
    }
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) {
        const nextDialog = document.querySelector('.customer-home [role="dialog"]')
        if (!nextDialog || nextDialog.contains(opener)) opener.focus({ preventScroll: true })
      }
    }
  }, [opener])

  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return
    const dialog = dialogRef.current
    const nodes = Array.from(dialog.querySelectorAll(FOCUSABLE))
    if (!nodes.length) {
      event.preventDefault()
      return
    }
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const overlayClass = [
    'notification-overlay',
    closing ? 'is-closing' : '',
    hideBackdrop ? 'is-handoff-out' : '',
    skipFade ? 'is-handoff-in' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={overlayClass}
      role="presentation"
      inert={inert}
      onPointerDown={(event) => { pressStartedOnOverlay.current = event.target === event.currentTarget }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressStartedOnOverlay.current) onDismiss()
      }}
    >
      <section
        ref={dialogRef}
        className={`notification-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {children}
      </section>
    </div>
  )
}
function CustomerHomes() {
  const currentCustomer = getSignedInCustomer()
  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [sent, setSent] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [otherRequestOption, setOtherRequestOption] = useState(null)
  const [otherRequestDetails, setOtherRequestDetails] = useState('')
  const [pendingRequest, setPendingRequest] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [activeRequest, setActiveRequest] = useState('')
  const [error, setError] = useState('')
  const [showRequests, setShowRequests] = useState(false)
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState('')
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [cooldownNow, setCooldownNow] = useState(() => Date.now())
  const [navDirection, setNavDirection] = useState('forward')
  const submitLock = useRef(false)
  const accountMenuRef = useRef(null)
  const accountTriggerRef = useRef(null)

  const logoutPresence = usePresence(logoutConfirmOpen || null, MODAL_EXIT_MS)
  const otherPresence = usePresence(otherRequestOption, MODAL_EXIT_MS)
  const pendingPresence = usePresence(pendingRequest, MODAL_EXIT_MS)
  const sentPresence = usePresence(sent, MODAL_EXIT_MS)

  useEffect(() => {
    api('/api/services')
      .then(setServices)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setServicesLoading(false))
  }, [])

  useEffect(() => {
    if (!accountMenuOpen) return undefined

    const trigger = accountTriggerRef.current
    const { overflow, paddingRight } = document.body.style
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`

    const firstItem = accountMenuRef.current?.querySelector(FOCUSABLE)
    firstItem?.focus({ preventScroll: true })

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setAccountMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
      window.removeEventListener('keydown', onKeyDown)
      if (trigger?.isConnected) {
        trigger.focus({ preventScroll: true })
      }
    }
  }, [accountMenuOpen])

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

  const viewKey = selectedCategory ? `category-${selectedCategory.id}` : showRequests ? 'requests' : 'home'
  const hasCategories = availableCategories.length > 0
  useEffect(() => {
    const revealTargets = document.querySelectorAll('.customer-home [data-reveal]')
    if (!revealTargets.length) return undefined

    const revealAll = () => revealTargets.forEach((target) => {
      target.classList.remove('is-reveal-pending')
      target.classList.add('is-revealed')
    })
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || !('IntersectionObserver' in window)
    ) {
      revealAll()
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.remove('is-reveal-pending')
        entry.target.classList.add('is-revealed')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' })

    revealTargets.forEach((target) => {
      target.classList.add('is-reveal-pending')
      observer.observe(target)
    })

    return () => observer.disconnect()
  }, [viewKey, hasCategories, servicesLoading])

  // While any dialog is open: lock background scroll without shifting the layout,
  // and let Escape close the top-most dialog.
  const modalOpen = logoutConfirmOpen || Boolean(otherRequestOption) || Boolean(pendingRequest) || Boolean(sent)
  useEffect(() => {
    if (!modalOpen) return undefined
    const { overflow, paddingRight } = document.body.style
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || submitLock.current) return
      if (pendingRequest) setPendingRequest(null)
      else if (otherRequestOption) setOtherRequestOption(null)
      else if (logoutConfirmOpen) setLogoutConfirmOpen(false)
      else setSent(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [modalOpen, otherRequestOption, pendingRequest, logoutConfirmOpen])

  // When the screen changes: scroll to top and move focus to the new heading
  // (keyboard and screen-reader users otherwise lose their place).
  const previousViewKey = useRef(viewKey)
  useEffect(() => {
    if (previousViewKey.current === viewKey) return
    previousViewKey.current = viewKey
    window.scrollTo({ top: 0, behavior: 'auto' })
    if (document.querySelector('.customer-home [role="dialog"]')) return
    document.querySelector('.customer-home [data-screen-heading]')?.focus({ preventScroll: true })
  }, [viewKey])

  const selectCategory = (category) => {
    setError('')
    setNavDirection('forward')
    setCooldownNow(getCurrentTimestamp())
    setSelectedCategory(category)
  }
  const goBackToServices = () => {
    setNavDirection('back')
    setSelectedCategory(null)
    setShowRequests(false)
    setError('')
  }
  const chooseChatService = (service) => {
    setShowRequests(false)
    if (!service) {
      setNavDirection('back')
      setSelectedCategory(null)
      return
    }
    setNavDirection('forward')
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
      setNavDirection('back')
      setSent({ label: option.label })
      setPendingRequest(null)
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
    setError('')
    setPendingRequest({ option, details: '' })
  }
  const confirmRequest = () => {
    if (!pendingPresence.item || submitLock.current) return
    void sendRequest(pendingPresence.item.option, pendingPresence.item.details)
  }
  const loadRequests = async () => {
    setRequestsLoading(true)
    setRequestsError('')
    try {
      setRequests(await api('/api/requests'))
      setNavDirection('forward')
      setShowRequests(true)
      setSelectedCategory(null)
    } catch (requestError) {
      setRequestsError(requestError.message)
    } finally {
      setRequestsLoading(false)
    }
  }

  const chapelName = currentCustomer?.chapel || currentCustomer?.branch || ''
  const assistanceCategory = availableCategories.find((category) => category.id === 'assistance')
  const customerInitials = (currentCustomer?.name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CC'

  return (
    <div className="app-shell customer-home">
      <header className="customer-header">
        <a className="customer-brand" href="/" aria-label="CosmoCare home">
          <span className="customer-brand-mark"><img src={logo} alt="" /></span>
          <span className="customer-brand-copy">
            <strong>CosmoCare</strong>
            <small>{chapelName ? `Cosmopolitan Funeral Homes · ${chapelName}` : 'Cosmopolitan Funeral Homes'}</small>
          </span>
        </a>
        <div className="account-actions">
          <span className="customer-header-note">
            <i aria-hidden="true" />
            Team ready to help
          </span>
          <button
            ref={accountTriggerRef}
            className="customer-account-toggle"
            type="button"
            aria-label={accountMenuOpen ? 'Close account menu' : 'Open account menu'}
            aria-controls="customer-account-drawer"
            aria-expanded={accountMenuOpen}
            onClick={() => setAccountMenuOpen((open) => !open)}
          >
            <span className="customer-account-initials" aria-hidden="true">{customerInitials}</span>
          </button>
        </div>
      </header>

      {accountMenuOpen && (
        <div className="customer-account-overlay">
          <button
            className="customer-account-backdrop"
            type="button"
            aria-label="Close account menu"
            onClick={() => setAccountMenuOpen(false)}
          />
          <aside
            ref={accountMenuRef}
            className="customer-account-drawer"
            id="customer-account-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-account-title"
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return
              const items = Array.from(event.currentTarget.querySelectorAll(FOCUSABLE))
              if (!items.length) {
                event.preventDefault()
                return
              }
              const first = items[0]
              const last = items[items.length - 1]
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
              }
            }}
          >
            <div className="customer-account-drawer-header">
              <h2 id="customer-account-title">Account</h2>
              <button
                className="customer-account-close"
                type="button"
                aria-label="Close account menu"
                onClick={() => setAccountMenuOpen(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="customer-account-details">
              <span className="customer-account-avatar" aria-hidden="true">{customerInitials}</span>
              <div>
                <strong>{currentCustomer?.name || 'Chapel account'}</strong>
                <span>{chapelName || 'Signed in'}</span>
              </div>
            </div>
            <button
              className="customer-account-logout"
              type="button"
              onClick={() => {
                setAccountMenuOpen(false)
                setLogoutConfirmOpen(true)
              }}
            >
              <Icon name="logout" />
              <span>Log out</span>
            </button>
          </aside>
        </div>
      )}

      {logoutPresence.mounted && (
        <ModalShell
          closing={logoutPresence.closing}
          onDismiss={() => setLogoutConfirmOpen(false)}
          className="account-action-modal"
          labelledBy="customer-logout-title"
          describedBy="customer-logout-description"
        >
          <div className="account-action-icon account-action-icon-danger" aria-hidden="true"><Icon name="logout" /></div>
          <p className="admin-kicker">Account security</p>
          <h2 id="customer-logout-title">Log out now?</h2>
          <p id="customer-logout-description">Your chapel session will end and you will need to sign in again.</p>
          <div className="modal-actions">
            <button type="button" onClick={() => setLogoutConfirmOpen(false)}>Stay signed in</button>
            <button className="delete-confirm-button" type="button" onClick={signOut}>Log out</button>
          </div>
        </ModalShell>
      )}

      <main className="customer-content" id="main-content">
        <div className="customer-panel" data-direction={navDirection}>
          {selectedCategory ? (
            <section key={viewKey} className="customer-screen customer-options" aria-labelledby="customer-options-title">
              <button className="customer-back-link customer-options-back" type="button" onClick={goBackToServices}>
                <Icon name="back" /> All services
              </button>
              <div className="customer-options-heading">
                <span className="customer-options-icon" aria-hidden="true"><Icon name={selectedCategory.icon} /></span>
                <div>
                  <p className="eyebrow">Choose a request</p>
                  <h2 id="customer-options-title" tabIndex={-1} data-screen-heading>{selectedCategory.title}</h2>
                  <p>Choose a request to review before sending.</p>
                </div>
              </div>
              <div className="customer-option-list">
                {requestOptions.map((option, index) => {
                  const remainingMs = getCooldownRemaining(option.label)
                  const cooldownSeconds = Math.ceil(remainingMs / 1000)
                  const isCoolingDown = cooldownSeconds > 0
                  const isSending = submitting && activeRequest === option.label
                  return (
                    <button
                      className={`customer-option-button${isCoolingDown ? ' is-cooling' : ''}`}
                      style={{ '--i': Math.min(index, 8), ...(isCoolingDown ? { '--progress': Math.min(1, remainingMs / REQUEST_COOLDOWN_MS) } : null) }}
                      type="button"
                      key={option.label}
                      onClick={() => chooseRequest(option)}
                      disabled={submitting || isCoolingDown}
                      aria-busy={isSending}
                    >
                      <span className="customer-option-icon" aria-hidden="true"><Icon name={option.icon} /></span>
                      <span className="customer-option-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
                      {isSending
                        ? <span className="customer-option-wait" role="status"><span className="ch-spinner" aria-hidden="true" />Sending…</span>
                        : isCoolingDown
                          ? <span className="customer-option-wait">Wait {cooldownSeconds}s</span>
                          : <span className="customer-option-action">Request</span>}
                    </button>
                  )
                })}
              </div>
              <p className="customer-quick-note">Your account and chapel are added automatically. A short cooldown prevents accidental repeat requests.</p>
              {error && <p className="customer-login-error" role="alert">{error}</p>}
            </section>
          ) : showRequests ? (
            <section key={viewKey} className="customer-screen customer-requests" aria-labelledby="customer-requests-title">
              <button type="button" className="customer-back-link customer-options-back" onClick={goBackToServices}>
                <Icon name="back" /> Back to services
              </button>
              <div className="customer-requests-heading">
                <div>
                  <p className="eyebrow">Your chapel</p>
                  <h2 id="customer-requests-title" tabIndex={-1} data-screen-heading>My requests</h2>
                </div>
              </div>
              {requestsError && <p className="customer-login-error" role="alert">{requestsError}</p>}
              {requestsLoading ? <p className="customer-empty-state" role="status">Loading your requests…</p> : requests.length ? (
                <ul className="customer-request-list">
                  {requests.map((request, index) => (
                    <li key={request._id} style={{ '--i': Math.min(index, 8) }}>
                      <div>
                        <strong>{request.request}</strong>
                        {request.details && <small>{request.details}</small>}
                        <small>Submitted {new Date(request.createdAt).toLocaleString()}</small>
                      </div>
                      <span className={`customer-request-status ${request.status === 'Completed' ? 'complete' : request.status === 'In progress' ? 'progress' : request.status === 'Cancelled' ? 'cancelled' : ''}`}>{request.status}</span>
                    </li>
                  ))}
                </ul>
              ) : !requestsError && <p className="customer-empty-state">You haven't submitted any requests yet.</p>}
              {!requestsLoading && requestsError && <button className="customer-back-link" type="button" onClick={loadRequests}>Try again</button>}
            </section>
          ) : (
            <div key={viewKey} className="customer-screen customer-home-view">
              <section className="customer-welcome" aria-labelledby="customer-welcome-title">
                <div className="customer-welcome-copy" data-reveal>
                  <p className="eyebrow">Thoughtful care, whenever you need it</p>
                  <h1 id="customer-welcome-title" tabIndex={-1} data-screen-heading>
                    How can we <em>assist you today?</em>
                  </h1>
                  <p className="customer-welcome-lede">A little help can make this moment easier. Our chapel team is here to make your stay more comfortable.</p>
                  <div className="customer-welcome-actions">
                    {assistanceCategory && (
                      <button
                        className="customer-primary-action"
                        type="button"
                        onClick={() => selectCategory(assistanceCategory)}
                        disabled={submitting}
                      >
                        <Icon name="staff" />
                        <span>Call for assistance</span>
                        <Icon name="arrow" />
                      </button>
                    )}
                    <button
                      className="customer-secondary-action"
                      type="button"
                      onClick={loadRequests}
                      disabled={requestsLoading}
                      aria-busy={requestsLoading}
                    >
                      {requestsLoading ? <span className="ch-spinner" aria-hidden="true" /> : <Icon name="list" />}
                      <span>{requestsLoading ? 'Loading requests…' : 'View my requests'}</span>
                    </button>
                  </div>
                  <ul className="customer-welcome-facts" aria-label="Your account details">
                    {chapelName && (
                      <li><span>Chapel</span><strong>{chapelName}</strong></li>
                    )}
                    <li><span>Signed in as</span><strong>{currentCustomer?.name || 'Chapel account'}</strong></li>
                  </ul>
                </div>
                <div className="customer-welcome-art" data-reveal aria-hidden="true">
                  <span className="customer-art-orbit customer-art-orbit-one" />
                  <span className="customer-art-orbit customer-art-orbit-two" />
                  <span className="customer-art-caption">A quieter kind of care</span>
                  <span className="customer-arch customer-arch-outer" />
                  <span className="customer-arch customer-arch-inner" />
                  <span className="customer-heart"><Icon name="heart" /></span>
                  <span className="customer-art-note">
                    <span className="customer-art-note-icon"><Icon name="check" /></span>
                    <span><strong>Here for you</strong><small>Care, just a request away</small></span>
                  </span>
                  <span className="customer-welcome-stamp">CosmoCare · Chapel concierge</span>
                </div>
              </section>

              <section className="service-section customer-service-section" aria-labelledby="services-title">
                <div className="customer-service-heading" data-reveal>
                  <div>
                    <p className="eyebrow">What we can bring you</p>
                    <h2 id="services-title">Choose a service</h2>
                  </div>
                  <span className="customer-available"><i aria-hidden="true" /> <span>Team ready to help</span></span>
                </div>
                {servicesLoading ? (
                  <div className="service-grid" aria-busy="true">
                    <p className="sr-only" role="status">Loading available services…</p>
                    {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
                      <div className="customer-service-card is-skeleton" key={index} aria-hidden="true">
                        <span className="customer-service-icon" />
                        <span className="service-text"><strong /><small /></span>
                      </div>
                    ))}
                  </div>
                ) : availableCategories.length ? (
                  <div className="service-grid">
                    {availableCategories.map((category, index) => (
                      <button
                        className="service-card customer-service-card"
                        data-reveal
                        style={{ '--i': Math.min(index, 7) }}
                        type="button"
                        key={category.id}
                        onClick={() => selectCategory(category)}
                        disabled={submitting}
                      >
                        <span className="customer-service-card-top">
                          <span className="customer-service-icon" aria-hidden="true"><Icon name={category.icon} /></span>
                          <span className="customer-service-index">SERVICE {String(index + 1).padStart(2, '0')}</span>
                        </span>
                        <span className="service-text"><strong>{category.title}</strong><small>{category.description}</small></span>
                        <span className="customer-service-card-bottom">
                          <span>Explore service</span>
                          <span className="card-arrow" aria-hidden="true"><Icon name="arrow" /></span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : !error && <p className="customer-empty-state">There are no assistance services available right now. Please contact a team member.</p>}
                <button className="customer-view-requests" type="button" onClick={loadRequests} disabled={requestsLoading} aria-busy={requestsLoading} data-reveal>
                  <span className="customer-requests-icon" aria-hidden="true">
                    {requestsLoading ? <span className="ch-spinner" /> : <Icon name="list" />}
                  </span>
                  <span className="customer-view-requests-copy">
                    <small className="customer-view-requests-label">Your activity</small>
                    <strong>{requestsLoading ? 'Loading requests…' : 'View my requests'}</strong>
                    <span>Follow each request from the moment you send it.</span>
                  </span>
                  <span className="customer-view-requests-arrow" aria-hidden="true"><Icon name="arrow" /></span>
                </button>
                {requestsError && <p className="customer-login-error" role="alert">{requestsError}</p>}
                {error && <p className="customer-login-error" role="alert">{error}</p>}

                <div className="customer-assurance" data-reveal>
                  <div className="customer-assurance-head">
                    <p className="eyebrow">Good to know</p>
                    <h3>Considered details. Clear next steps.</h3>
                    <p>Your chapel information is included automatically, and you can review each request before it reaches our team.</p>
                  </div>
                  <ul className="customer-assurance-list">
                    {assuranceNotes.map((note) => (
                      <li key={note.title}>
                        <span className="customer-assurance-icon" aria-hidden="true"><Icon name={note.icon} /></span>
                        <span>
                          <strong>{note.title}</strong>
                          <small>{note.description}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {otherPresence.mounted && (
        <ModalShell
          closing={otherPresence.closing}
          hideBackdrop={Boolean(pendingRequest || sent)}
          inert={Boolean(pendingRequest || sent)}
          onDismiss={() => { if (!submitting) setOtherRequestOption(null) }}
          className="suggestion-modal other-request-modal"
          labelledBy="other-request-title"
          describedBy="other-request-description"
        >
          <button className="modal-close" type="button" aria-label="Close other request form" onClick={() => setOtherRequestOption(null)} disabled={submitting}><Icon name="close" /></button>
          <p className="admin-kicker">Other request</p>
          <h2 id="other-request-title">What do you need?</h2>
          <p className="modal-description" id="other-request-description">Tell our team what kind of request you have so they can be prepared to help.</p>
          {error && <p className="customer-login-error" role="alert">{error}</p>}
          <form onSubmit={(event) => {
            event.preventDefault()
            setError('')
            setPendingRequest({ option: otherPresence.item, details: otherRequestDetails })
          }}>
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
              aria-describedby="other-request-character-count"
            />
            <div className="other-request-character-count" id="other-request-character-count" aria-live="polite">{otherRequestDetails.length}/500</div>
            <div className="modal-actions">
              <button type="button" onClick={() => setOtherRequestOption(null)} disabled={submitting}>Cancel</button>
              <button className="save-services-button" type="submit" disabled={submitting || !otherRequestDetails.trim()}>
                Review request
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {pendingPresence.mounted && (
        <ModalShell
          closing={pendingPresence.closing}
          hideBackdrop={Boolean(sent)}
          inert={Boolean(sent)}
          onDismiss={() => { if (!submitting) setPendingRequest(null) }}
          className="request-confirm-modal"
          labelledBy="request-confirm-title"
          describedBy="request-confirm-description"
        >
          <div className="request-confirm-icon" aria-hidden="true">
            <Icon name={pendingPresence.item.option.icon} />
          </div>
          <p className="admin-kicker">Before we send</p>
          <h2 id="request-confirm-title">Confirm this request?</h2>
          <p id="request-confirm-description">Our chapel team will be notified when you confirm.</p>
          <div className="request-confirm-summary">
            <span>Request</span>
            <strong>{pendingPresence.item.option.label}</strong>
            {pendingPresence.item.details.trim() && (
              <>
                <span>Details</span>
                <p>{pendingPresence.item.details.trim()}</p>
              </>
            )}
          </div>
          {error && <p className="customer-login-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={() => setPendingRequest(null)} disabled={submitting}>Go back</button>
            <button className="save-services-button" type="button" onClick={confirmRequest} disabled={submitting}>
              {submitting ? <><span className="ch-spinner" aria-hidden="true" />Sending…</> : 'Confirm and send'}
            </button>
          </div>
        </ModalShell>
      )}

      {sentPresence.mounted && (
        <ModalShell
          closing={sentPresence.closing}
          skipOverlayFade={otherPresence.closing && otherPresence.mounted}
          onDismiss={() => setSent(null)}
          className="account-action-modal"
          labelledBy="request-success-title"
          describedBy="request-success-description"
        >
          <div className="account-action-icon account-action-icon-success" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <circle className="ch-draw ch-draw-ring" cx="12" cy="12" r="10" pathLength="1" />
              <path className="ch-draw ch-draw-check" d="m7.5 12.5 3 3 6-6.5" pathLength="1" />
            </svg>
          </div>
          <p className="admin-kicker">Request received</p>
          <h2 id="request-success-title">Request sent successfully</h2>
          <p id="request-success-description">Our team has been notified about your request for <strong>{sentPresence.item.label.toLowerCase()}</strong>. Someone will be with you shortly.</p>
          <div className="modal-actions">
            <button className="save-services-button" type="button" onClick={() => setSent(null)}>Done</button>
          </div>
        </ModalShell>
      )}

      <CustomerHelpChat
        services={services}
        onViewRequests={loadRequests}
        onChooseService={chooseChatService}
      />

      <footer className="customer-footer">
        <a className="brand" href="/" aria-label="CosmoCare home">
          <span className="brand-mark"><img src={logo} alt="" /></span>
          <span><strong>CosmoCare</strong><small>Quiet care. Thoughtful service.</small></span>
        </a>
        <p className="customer-footer-note">
          Cosmopolitan Funeral Homes{chapelName ? ` · ${chapelName}` : ''}
        </p>
      </footer>
    </div>
  )
}

export default CustomerHomes
