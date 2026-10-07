import { useState } from 'react'
import logo from '../../assets/Logo.png'
import '../../App.css'
import { login } from '../../api.js'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      const user = await login(email, password)
      if (user.type !== 'Admin') throw new Error('This account does not have administrator access.')
      sessionStorage.setItem('admin-session', user.email)
      window.location.assign('/admin/dashboard')
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
        <span className="admin-badge">Admin portal</span>
      </header>

      <main className="admin-login-main">
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-lock">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="10" width="14" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
            </svg>
          </div>
          <p className="eyebrow">Secure access</p>
          <h1 id="login-title">Welcome back</h1>
          <p className="login-subtitle">Sign in to manage requests and support your guests.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="admin-email">Work email</label>
            <input
              id="admin-email"
              type="email"
              placeholder="Enter your work email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
              }}
              required
            />

            <div className="password-label">
              <label htmlFor="admin-password">Password</label>
              <a href="#forgot-password">Forgot password?</a>
            </div>
            <div className="password-field">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError('')
                }}
                required
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {error && <p className="login-notice login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit">Sign in to admin portal</button>
          </form>

          <p className="login-help">Need access? Contact your CosmoCare system administrator.</p>
        </section>
      </main>

      <footer className="site-footer">
        <span>CosmoCare Servicing</span>
        <span className="footer-divider" />
        <span>Authorized personnel only</span>
      </footer>
    </div>
  )
}

export default LoginPage
