import { useState } from 'react'
import logo from '../../assets/Logo.png'
import '../../App.css'
import { login } from '../../api.js'

function CustomerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      const user = await login(email, password)
      if (user.type !== 'Chapel') throw new Error('This account does not have chapel access.')
      sessionStorage.setItem('chapel-session', user.chapel)
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
        <section className="customer-login-card" aria-labelledby="customer-login-title">
          <div className="customer-login-brand">
            <span className="brand-mark"><img src={logo} alt="" /></span>
            <span><strong>CosmoCare</strong><small>Chapel assistance</small></span>
          </div>

          <div className="customer-login-heading">
            
            <h1 id="customer-login-title">Welcome</h1>
            <p>Sign in with your chapel account to request assistance from our team.</p>
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
            <input
              id="chapel-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              required
            />

            {error && (
              <p className="customer-login-error" role="alert">
                {error}
              </p>
            )}

            <button className="login-submit" type="submit">
              Continue to assistance
            </button>
          </form>

          <p className="customer-login-note">This tablet is intended for use by authorized chapel visitors.</p>
        </section>
      </main>
    </div>
  )
}

export default CustomerLogin
