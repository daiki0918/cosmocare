import { useState } from 'react'
import logo from '../../assets/Logo.png'
import { login } from '../../api.js'
import '../../App.css'

function StaffLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      const user = await login(email, password)
      if (user.type !== 'Staff') throw new Error('This account does not have staff access.')
      localStorage.setItem('staff-session', user.email)
      window.location.assign('/staff/dashboard')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-glow admin-login-glow-one" />
      <div className="admin-login-glow admin-login-glow-two" />
      <header className="admin-login-header">
        <a className="brand" href="/" aria-label="CosmoCare customer home">
          <span className="brand-mark"><img src={logo} alt="" /></span>
          <span><strong>CosmoCare</strong><small>Servicing platform</small></span>
        </a>
        <span className="admin-badge">Staff portal</span>
      </header>
      <main className="admin-login-main">
        <section className="login-card" aria-labelledby="staff-login-title">
          <div className="login-lock">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>
          </div>
          <p className="eyebrow">Team access</p>
          <h1 id="staff-login-title">Staff sign in</h1>
          <p className="login-subtitle">Sign in to view and manage assigned chapel requests.</p>
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="staff-email">Work email</label>
            <input id="staff-email" type="email" placeholder="example@gmail.com" value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} required />
            <div className="password-label"><label htmlFor="staff-password">Password</label><a href="#forgot-password">Forgot password?</a></div>
            <input id="staff-password" type="password" placeholder="Enter your password" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} required />
            {error && <p className="login-notice login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit">Sign in to staff portal</button>
          </form>
          <p className="login-help">Need access? Contact your CosmoCare administrator.</p>
        </section>
      </main>
    </div>
  )
}

export default StaffLogin
