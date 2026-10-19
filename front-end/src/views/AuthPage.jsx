import { useEffect, useRef, useState } from 'react'
import { EMPTY_AUTH_FORM, PASSWORD_MIN, authErrorMessage, authFormError } from '../utils/authUtils.js'

const COPY = {
  login: { title: 'Log in', submit: 'Log in', busy: 'Logging in…', switchText: 'New to Myflix?', switchTo: 'Create an account' },
  register: { title: 'Create your account', submit: 'Create account', busy: 'Creating account…', switchText: 'Already have an account?', switchTo: 'Log in' },
}

// Log in and Register share one card; the link under the button switches between them.
// auth: { register(form), logIn(form) } from useAuth.
export default function AuthPage({ auth }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(EMPTY_AUTH_FORM)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const headingRef = useRef(null)
  const copy = COPY[mode]

  useEffect(() => headingRef.current?.focus(), [mode])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login')
    setForm((f) => ({ ...f, password: '' }))
    setError(null)
    setNotice(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const problem = authFormError(form, mode)
    setError(problem)
    setNotice(null)
    if (problem) return
    setBusy(true)
    try {
      if (mode === 'register') {
        const { needsConfirmation } = await auth.register(form)
        if (needsConfirmation) {
          setMode('login')
          setNotice('Account created. Check your email for the confirmation link, then log in.')
        }
      } else {
        await auth.logIn(form)
      }
      // Success: useAuth sees the new session and App swaps this page for My List.
    } catch (err) {
      setError(authErrorMessage(err))
      setForm((f) => ({ ...f, password: '' }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth" aria-labelledby="auth-heading">
      <form className="auth__card" onSubmit={handleSubmit} noValidate>
        <h1 id="auth-heading" ref={headingRef} tabIndex={-1}>
          {copy.title}
        </h1>
        {notice && (
          <p className="auth__notice" role="status">
            {notice}
          </p>
        )}

        {mode === 'register' && (
          <label className="field">
            <span className="label">Name</span>
            <input value={form.name} onChange={set('name')} autoComplete="name" maxLength={50} />
          </label>
        )}
        <label className="field">
          <span className="label">Email</span>
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" />
        </label>
        {/* The hint sits outside the label so the field's name stays just "Password". */}
        <div className="field">
          <label className="label" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            aria-describedby={mode === 'register' ? 'password-hint' : undefined}
          />
          {mode === 'register' && (
            <span id="password-hint" className="auth__hint">
              At least {PASSWORD_MIN} characters.
            </span>
          )}
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>
          {busy ? copy.busy : copy.submit}
        </button>

        <p className="auth__switch">
          {copy.switchText}{' '}
          <button type="button" className="link-btn" onClick={switchMode}>
            {copy.switchTo}
          </button>
        </p>
      </form>
    </section>
  )
}
