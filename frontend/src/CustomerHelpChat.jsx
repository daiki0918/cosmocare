import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api.js'

const welcomeMessage = {
  id: 'welcome',
  sender: 'bot',
  text: 'Hello! I can help you find services, check your requests, or contact the CosmoCare team. What would you like help with?',
  createdAt: new Date().toISOString(),
}

function getConversationStorageKey() {
  let userId = 'guest'
  try {
    userId = JSON.parse(localStorage.getItem('cosmocare-user') || '{}').id || userId
  } catch {
    // Start a fresh conversation when stored account data is invalid.
  }
  return `cosmocare-help-chat:${userId}`
}

function loadConversation(storageKey) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null')
    return Array.isArray(stored) && stored.length ? stored : [welcomeMessage]
  } catch {
    return [welcomeMessage]
  }
}

function CustomerHelpChat({ services, onViewRequests, onChooseService }) {
  const [open, setOpen] = useState(false)
  const [storageKey] = useState(getConversationStorageKey)
  const [messages, setMessages] = useState(() => loadConversation(storageKey))
  const [question, setQuestion] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [supportPrompt, setSupportPrompt] = useState(false)
  const [supportThreadId, setSupportThreadId] = useState(null)
  const [sending, setSending] = useState(false)
  const [sendingSupport, setSendingSupport] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)
  const sendingRef = useRef(false)
  const conversationRef = useRef(0)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-100)))
  }, [messages, storageKey])

  const closeChat = useCallback(() => {
    conversationRef.current += 1
    sendingRef.current = false
    setOpen(false)
    setMessages([welcomeMessage])
    setQuestion('')
    setSupportMessage('')
    setSupportPrompt(false)
    setSupportThreadId(null)
    setSending(false)
    setSendingSupport(false)
    setError('')
    localStorage.removeItem(storageKey)
  }, [storageKey])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, open, sending])

  useEffect(() => {
    if (!open) return undefined

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeChat()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, closeChat])

  useEffect(() => {
    if (!open || !supportThreadId) return undefined

    let active = true
    let loading = false
    const syncSupportMessages = async () => {
      if (loading) return
      loading = true
      try {
        const conversations = await api('/api/support/messages')
        if (!active) return
        const conversation = conversations.find((item) => item._id === supportThreadId)
        if (!conversation) return
        const firstMessage = String(conversation.message || '').replace(/\n\nChapel:[\s\S]*$/, '').trim()
        const history = [
          ...(firstMessage ? [{
            id: `${conversation._id}-question`,
            sender: 'user',
            text: firstMessage,
            createdAt: conversation.createdAt,
          }] : []),
          ...(conversation.replies || []).map((reply, index) => ({
            id: reply._id || `${conversation._id}-reply-${index}`,
            sender: reply.senderType === 'Chapel' ? 'user' : 'admin',
            text: reply.text,
            createdAt: reply.createdAt,
          })),
        ]
        setMessages((items) => {
          const existing = new Map(items.map((item) => [item.id, item]))
          history.forEach((item) => {
            const alreadyShown = item.sender === 'user' && items.some((current) => current.sender === 'user' && current.text === item.text)
            if (!alreadyShown) existing.set(item.id, item)
          })
          return Array.from(existing.values())
        })
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        loading = false
      }
    }

    void syncSupportMessages()
    const interval = window.setInterval(syncSupportMessages, 5000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [open, supportThreadId])

  const askQuestion = async (value) => {
    const text = value.trim()
    if (!text || sendingRef.current) return
    const conversationVersion = conversationRef.current
    sendingRef.current = true
    setSending(true)
    setQuestion('')
    setError('')
    const nextMessages = [...messages, {
      id: `${Date.now()}-user`,
      sender: 'user',
      text,
      createdAt: new Date().toISOString(),
    }]
    setMessages(nextMessages)

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 25000)
    try {
      const history = nextMessages
        .filter((message) => message.id !== 'welcome' && ['user', 'bot'].includes(message.sender))
        .slice(-12)
        .map((message) => ({
          role: message.sender === 'user' ? 'user' : 'assistant',
          content: message.text,
        }))
      const response = await api('/api/chat', {
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
      })
      if (conversationRef.current !== conversationVersion) return
      if (response.supportThreadId) setSupportThreadId(response.supportThreadId)
      setMessages((items) => [...items, {
        id: `${Date.now()}-bot`,
        sender: 'bot',
        text: typeof response.reply === 'string' && response.reply.trim()
          ? response.reply
          : 'I’m sorry, I didn’t get a response. Please try asking again.',
        services: response.services,
        action: response.supportThreadId ? 'Reply to the CosmoCare team' : undefined,
        actionType: response.supportThreadId ? 'support' : undefined,
        createdAt: new Date().toISOString(),
      }])
    } catch (requestError) {
      if (conversationRef.current !== conversationVersion) return
      const failure = controller.signal.aborted
        ? 'CosmoCare Help took too long to respond. Please try again.'
        : requestError instanceof Error && requestError.message
        ? requestError.message
        : 'I’m sorry, CosmoCare Help is temporarily unavailable. Please try again in a moment, or use the services page to contact the team.'
      setMessages((items) => [...items, {
        id: `${Date.now()}-error`,
        sender: 'bot',
        text: failure,
        createdAt: new Date().toISOString(),
      }])
    } finally {
      window.clearTimeout(timeoutId)
      if (conversationRef.current === conversationVersion) {
        sendingRef.current = false
        setSending(false)
      }
    }
  }

  const submitQuestion = (event) => {
    event.preventDefault()
    void askQuestion(question)
  }

  const handleComposeKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void askQuestion(question)
    }
  }

  const sendSupportMessage = async (event) => {
    event.preventDefault()
    const text = supportMessage.trim()
    if (!text || sendingSupport || !supportThreadId) return
    const conversationVersion = conversationRef.current
    setSendingSupport(true)
    setError('')
    try {
      const conversation = await api(`/api/support/messages/${supportThreadId}/replies`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
      if (conversationRef.current !== conversationVersion) return
      setSupportThreadId(conversation._id)
      setSupportMessage('')
      setSupportPrompt(false)
      setMessages((items) => [...items, {
        id: `${Date.now()}-support-sent`,
        sender: 'bot',
        text: 'Your message has been sent to the CosmoCare team.',
        createdAt: new Date().toISOString(),
      }])
    } catch (requestError) {
      if (conversationRef.current === conversationVersion) setError(requestError.message)
    } finally {
      if (conversationRef.current === conversationVersion) setSendingSupport(false)
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
    <div
      className={`customer-chat-widget ${open ? 'open' : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget && open) closeChat()
      }}
    >
      {open && (
        <section className="customer-chat-window" role="dialog" aria-modal="true" aria-label="CosmoCare help and FAQs">
          <header className="customer-chat-header">
            <span className="customer-chat-avatar" aria-hidden="true">CC</span>
            <div><strong>CosmoCare Help</strong><small><i /> AI guest assistance</small></div>
            <button type="button" aria-label="Close help chat" onClick={closeChat}>×</button>
          </header>
          <div className="customer-chat-messages" aria-live="polite">
            {messages.map((message) => (
              <div className={`customer-chat-message ${message.sender === 'admin' ? 'admin' : message.sender}`} key={message.id}>
                {message.sender === 'admin' && <span className="customer-chat-sender">CosmoCare support</span>}
                <p>{message.text}</p>
                <time dateTime={message.createdAt || undefined}>
                  {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                </time>
                {message.action && <button className="customer-chat-action" type="button" onClick={() => runAction(message)}>{message.action} <span aria-hidden="true">›</span></button>}
                {message.services?.length > 0 && (
                  <div className="customer-chat-service-list">
                    {message.services.map((listedService) => {
                      const service = services.find((item) => item.name === listedService.name)
                      return (
                        <button type="button" key={listedService.name} onClick={() => {
                          if (service) {
                            setOpen(false)
                            onChooseService(service)
                          }
                        }} disabled={!service}>
                          <strong>{listedService.name}</strong><small>{listedService.description}</small>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="customer-chat-typing" role="status" aria-label="CosmoCare is typing">
                <span /><span /><span />
              </div>
            )}
            {supportPrompt && (
              <form className="customer-chat-support" onSubmit={sendSupportMessage}>
                <label htmlFor="customer-support-message">Message the support team</label>
                <textarea id="customer-support-message" rows="3" value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} placeholder="Type your message here…" maxLength={2000} required />
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
              <button type="button" onClick={() => void askQuestion('What services are available?')} disabled={sending}>Available services</button>
              <button type="button" onClick={() => void askQuestion('How do I check my request status?')} disabled={sending}>Check request status</button>
              <button type="button" onClick={() => void askQuestion('How can I contact staff?')} disabled={sending}>Contact staff</button>
              <button type="button" onClick={() => void askQuestion('Can I change or cancel a request?')} disabled={sending}>Change a request</button>
            </div>
          </div>
          <form className="customer-chat-compose" onSubmit={submitQuestion}>
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleComposeKeyDown} placeholder="Ask a question…" aria-label="Ask CosmoCare a question" maxLength={2000} rows="1" />
            <button type="submit" aria-label="Send question" disabled={!question.trim() || sending}>➤</button>
          </form>
        </section>
      )}
      <button className={`customer-chat-launcher ${open ? 'open' : ''}`} type="button" onClick={open ? closeChat : () => setOpen(true)} aria-label={open ? 'Close help and FAQs' : 'Open help and FAQs'} aria-expanded={open}>
        {open ? '×' : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></svg>}
      </button>
    </div>
  )
}

export default CustomerHelpChat
