import { useEffect, useRef, useState } from 'react'
import { api } from './api.js'

function getFaqReply(text, services) {
  const query = text.toLowerCase()
  if (/status|track|pending|progress|previous request|my request/.test(query)) {
    return {
      text: 'You can see the latest status of your chapel’s requests in “View my requests”.',
      action: 'View my requests',
      actionType: 'requests',
    }
  }
  if (/cancel|change|edit|update request/.test(query)) {
    return {
      text: 'Requests can’t be edited or cancelled in this chat. Send the team a message below and include the request name and chapel room.',
      action: 'Message the support team',
      actionType: 'support',
    }
  }
  if (/staff|help|assistance|urgent|director|speak|call/.test(query)) {
    const assistanceService = services.find((service) => /staff|director|coordinator|assistance/i.test(`${service.name} ${service.description}`))
    return {
      text: assistanceService
        ? 'Tap below to open the assistance options and send a request to the team.'
        : 'Choose an available service on the home screen, or send a message to the support team below.',
      action: assistanceService ? assistanceService.name : 'Browse available services',
      actionType: assistanceService ? 'service' : 'services',
      service: assistanceService,
    }
  }
  if (/service|offer|available|what can|menu|water|coffee|food|chair|clean|restroom|parking|flower|aircon|air con|light|supply/.test(query)) {
    return {
      text: services.length
        ? 'These are the services currently available. Choose a category to continue:'
        : 'There are no services available right now. You can send a message to the support team below.',
      actionType: 'service-list',
    }
  }
  if (/where|location|chapel room|room/.test(query)) {
    return {
      text: 'When you send a service request, the chapel location is added automatically. If you need help at a specific room, choose a service and include that location in the request.',
      action: 'Browse available services',
      actionType: 'services',
    }
  }
  if (/thank/.test(query)) {
    return { text: 'You’re welcome. I’m here if you need help with a service or request status.' }
  }
  return {
    text: 'I don’t have an answer for that yet. You can send your question to the CosmoCare support team and an administrator will receive it.',
    action: 'Send question to support',
    actionType: 'support',
  }
}

function CustomerHelpChat({ services, currentCustomer, onViewRequests, onChooseService }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { id: 'welcome', sender: 'bot', text: 'Hello! I can help you find services, check request status, or contact our support team. What would you like to know?' },
  ])
  const [question, setQuestion] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [supportPrompt, setSupportPrompt] = useState(false)
  const [sendingSupport, setSendingSupport] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, open])

  const addBotMessage = (reply) => {
    setMessages((items) => [...items, { id: `${Date.now()}-${items.length}`, sender: 'bot', ...reply }])
    setSupportPrompt(reply.actionType === 'support')
  }

  const askQuestion = (text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((items) => [...items, { id: `${Date.now()}-user`, sender: 'user', text: trimmed }])
    setQuestion('')
    setError('')
    const reply = getFaqReply(trimmed, services)
    addBotMessage(reply)
    if (reply.actionType === 'support') setSupportMessage(trimmed)
  }

  const sendToSupport = async (event) => {
    event.preventDefault()
    const message = supportMessage.trim()
    if (!message || sendingSupport) return
    setSendingSupport(true)
    setError('')
    try {
      await api('/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Customer support question',
          message: `${message}\n\nChapel: ${currentCustomer?.chapel || currentCustomer?.branch || 'Not provided'}\nAccount: ${currentCustomer?.name || 'Not provided'}`,
        }),
      })
      setMessages((items) => [...items, {
        id: `${Date.now()}-sent`,
        sender: 'bot',
        text: 'Your message was sent to the CosmoCare support team.',
      }])
      setSupportMessage('')
      setSupportPrompt(false)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSendingSupport(false)
    }
  }

  const runAction = (message) => {
    if (message.actionType === 'requests') {
      setOpen(false)
      onViewRequests()
    } else if (message.actionType === 'services') {
      setOpen(false)
      onChooseService()
    } else if (message.actionType === 'service') {
      const service = services.find((item) => item.id === message.service?.id)
      if (service) {
        setOpen(false)
        onChooseService(service)
      }
    } else if (message.actionType === 'support') {
      setSupportPrompt(true)
    }
  }

  return (
    <div className="customer-chat-widget">
      {open && (
        <section className="customer-chat-window" role="dialog" aria-label="CosmoCare help and FAQs">
          <header className="customer-chat-header">
            <span className="customer-chat-avatar" aria-hidden="true">CC</span>
            <div><strong>CosmoCare Help</strong><small><i /> FAQs & support</small></div>
            <button type="button" aria-label="Close help chat" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="customer-chat-messages" aria-live="polite">
            {messages.map((message) => (
              <div className={`customer-chat-message ${message.sender}`} key={message.id}>
                <p>{message.text}</p>
                {message.action && <button className="customer-chat-action" type="button" onClick={() => runAction(message)}>{message.action} <span aria-hidden="true">›</span></button>}
                {message.actionType === 'service-list' && services.length > 0 && (
                  <div className="customer-chat-service-list">
                    {services.map((service) => (
                      <button type="button" key={service.id} onClick={() => { setOpen(false); onChooseService(service) }}>
                        <strong>{service.name}</strong><small>{service.description}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {supportPrompt && (
              <form className="customer-chat-support" onSubmit={sendToSupport}>
                <label htmlFor="customer-support-message">Message the support team</label>
                <textarea id="customer-support-message" rows="3" value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} placeholder="Type your question here…" required />
                {error && <p className="customer-login-error" role="alert">{error}</p>}
                <button type="submit" disabled={sendingSupport || !supportMessage.trim()}>{sendingSupport ? 'Sending…' : 'Send to support'}</button>
              </form>
            )}
            {error && !supportPrompt && <p className="customer-login-error" role="alert">{error}</p>}
            <div ref={messagesEndRef} />
          </div>
          <div className="customer-chat-faqs">
            <span>Popular questions</span>
            <div>
              <button type="button" onClick={() => askQuestion('What services are available?')}>Available services</button>
              <button type="button" onClick={() => askQuestion('How do I check my request status?')}>Check request status</button>
              <button type="button" onClick={() => askQuestion('How can I contact staff?')}>Contact staff</button>
              <button type="button" onClick={() => askQuestion('Can I change or cancel a request?')}>Change a request</button>
            </div>
          </div>
          <form className="customer-chat-compose" onSubmit={(event) => { event.preventDefault(); askQuestion(question) }}>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question…" aria-label="Ask CosmoCare a question" />
            <button type="submit" aria-label="Send question" disabled={!question.trim()}>➤</button>
          </form>
        </section>
      )}
      <button className={`customer-chat-launcher ${open ? 'open' : ''}`} type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close help and FAQs' : 'Open help and FAQs'} aria-expanded={open}>
        {open ? '×' : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></svg>}
      </button>
    </div>
  )
}

export default CustomerHelpChat
