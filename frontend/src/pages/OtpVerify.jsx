import { useState, useRef, useEffect } from 'react'
import AuthArt from '../components/AuthArt.jsx'
import AuthError from '../components/AuthError.jsx'

export default function OtpVerify({ signupData, onBack }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes in seconds
  const [expired, setExpired] = useState(false)
  const inputs = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    startTimer()
    return () => clearInterval(timerRef.current)
  }, [])

  function startTimer() {
    setTimeLeft(300)
    setExpired(false)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function getCode() {
    return inputs.current.map(i => i?.value || '').join('')
  }

  function handleInput(e, idx) {
    const val = e.target.value.replace(/\D/g, '')
    e.target.value = val.slice(-1)
    if (val && idx < 5) inputs.current[idx + 1]?.focus()
  }

  function handleKeyDown(e, idx) {
    if (e.key === 'Backspace' && !e.target.value && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
  }

  async function handleVerify(e) {
    e.preventDefault()
    const code = getCode()
    if (code.length < 6) return setError('Please enter the complete 6-digit code.')
    if (expired) return setError('OTP has expired. Please request a new one.')
    if (attempts >= 3) return setError('Too many attempts. Please request a new OTP.')

    setLoading(true)
    setError('')

    try {
      // verify OTP
      const otpRes = await fetch('http://127.0.0.1:3000/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupData.email, code })
      })
      const otpData = await otpRes.json()
      if (!otpRes.ok) {
        setAttempts(prev => prev + 1)
        return setError(otpData.error || 'Invalid OTP.')
      }

      // save to DB
      const signupRes = await fetch('http://127.0.0.1:3000/auth/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupData.name,
          email: signupData.email,
          password: signupData.password,
          phone: signupData.phone || '',
          address: signupData.address || ''
        })
      })
      const signupResult = await signupRes.json()
      if (!signupRes.ok) return setError(signupResult.error || 'Failed to create account.')

      // auto login
      const loginRes = await fetch('http://127.0.0.1:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupData.email, password: signupData.password })
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok) return setError(loginData.error || 'Login failed.')

      localStorage.setItem('token', loginData.token)
      localStorage.setItem('role', loginData.role)
      localStorage.setItem('name', loginData.name)
      window.location.href = loginData.redirectTo

    } catch {
      setError('Unable to connect to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setError('')
    setResent(false)
    setAttempts(0)
    try {
      const res = await fetch('http://127.0.0.1:3000/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupData.email })
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Failed to resend OTP.')
      setResent(true)
      startTimer()
      inputs.current.forEach(i => { if (i) i.value = '' })
      inputs.current[0]?.focus()
    } catch {
      setError('Unable to connect to server.')
    } finally {
      setResending(false)
    }
  }

  const attemptsLeft = 3 - attempts

  return (
    <div className="auth">
      <AuthArt />
      <section className="auth-panel">
        <div className="auth-form">
          <div className="auth-eyebrow">Verify your email</div>
          <h1>Enter OTP</h1>
          <p className="lead">
            We sent a 6-digit code to <b>{signupData?.email}</b>.
          </p>

          {/* Timer */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 4px' }}>
            <span style={{
              fontSize: '13px',
              fontWeight: 600,
              color: expired ? 'var(--bad)' : timeLeft <= 60 ? 'var(--warn)' : 'var(--muted)'
            }}>
              {expired ? 'OTP expired' : `Expires in ${formatTime(timeLeft)}`}
            </span>
          </div>

          {/* Attempts */}
          {attempts > 0 && !expired && (
            <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--warn)', marginBottom: '4px' }}>
              {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining
            </div>
          )}

          <form onSubmit={handleVerify} noValidate>
            <AuthError message={error} />

            <div className="otp-boxes">
              {[0,1,2,3,4,5].map(i => (
                <input
                  key={i}
                  ref={el => inputs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="otp-box"
                  onInput={e => handleInput(e, i)}
                  onKeyDown={e => handleKeyDown(e, i)}
                  disabled={expired || attempts >= 3}
                />
              ))}
            </div>

            {resent && <p className="otp-resent">OTP resent! Check your email.</p>}

            <button className="auth-btn" type="submit" disabled={loading || expired || attempts >= 3}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>

          <p className="auth-foot">
            Didn't receive a code?{' '}
            <b>
              <a href="#" onClick={e => { e.preventDefault(); handleResend() }}>
                {resending ? 'Sending...' : 'Resend OTP'}
              </a>
            </b>
          </p>
          <p className="auth-foot" style={{ marginTop: '8px' }}>
            <b><a href="#" onClick={e => { e.preventDefault(); onBack() }}>← Back to Sign up</a></b>
          </p>
        </div>
      </section>
    </div>
  )
}
