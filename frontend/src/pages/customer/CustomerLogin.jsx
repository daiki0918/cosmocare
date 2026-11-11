import { useState } from 'react'
import logo from '../../assets/Logo.png'
import '../../App.css'
import { login } from '../../api.js'

function CustomerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      const user = await login(email, password)
      if (user.type !== 'Chapel') throw new Error('This account does not have chapel access.')
      localStorage.setItem('chapel-session', user.chapel)
      window.location.assign('/')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <div className="customer-login">
      <div className="customer-login-glow customer-login-glow-one" />
      <div className="customer-login-glow customer-login-glow-two" />

      <main className="customer-login-main">
        <div className="customer-login-layout">
          <section className="customer-login-story" aria-label="CosmoCare guest assistance">

            <p className="customer-login-kicker">Cosmopolitan Funeral Homes</p>
            <h1>A quieter way to ask for care.</h1>
            <p className="customer-login-story-copy">
              Thoughtful assistance for the moments in between. Request refreshments, comfort items,
              or a member of our chapel team whenever you need one.
            </p>
            <div className="customer-login-quote">
              <span aria-hidden="true">“</span>
              <p>We are here to make your stay as comfortable as possible.</p>
            </div>
          </section>

          <section className="customer-login-card" aria-labelledby="customer-login-title">
            <div className="customer-login-brand">
              <span className="brand-mark"><img src={logo} alt="" /></span>
              <span><strong>CosmoCare</strong><small>Guest assistance</small></span>
            </div>

            <div className="customer-login-heading">
              <p className="customer-login-kicker">Welcome</p>
              <h2 id="customer-login-title">Sign in to continue</h2>
              <p>Use your chapel account to request help from our team.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label htmlFor="chapel-email">Chapel account email</label>
              <input
                id="chapel-email"
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError('');
                }}
                required
              />

              <label htmlFor="chapel-password">Password</label>
              <div className="password-field">
                <input
                  id="chapel-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError('');
                  }}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {showPassword
                      ? <><path d="m3 3 18 18" /><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" /><path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5 0 8.3 4 9.5 8a13.8 13.8 0 0 1-3.1 5.1M6.2 6.2C4.5 7.5 3.4 9.5 2.5 12c1.2 4 4.5 8 9.5 8 1 0 2-.2 2.8-.5" /></>
                      : <><path d="M2.5 12C3.7 8 7 4 12 4s8.3 4 9.5 8c-1.2 4-4.5 8-9.5 8s-8.3-4-9.5-8Z" /><circle cx="12" cy="12" r="2.5" /></>}
                  </svg>
                </button>
              </div>

              {error && (
                <p className="customer-login-error" role="alert">
                  {error}
                </p>
              )}

              <button className="login-submit" type="submit">
                Continue to assistance <span aria-hidden="true">→</span>
              </button>
            </form>

            <p className="customer-login-note">For authorized chapel visitors · Your information stays private.</p>
          </section>
        </div>
      </main>
    </div>
  )
}

export default CustomerLogin
