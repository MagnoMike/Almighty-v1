import { useState } from 'react'
import AuthArt from '../components/AuthArt.jsx'
import PasswordField from '../components/PasswordField.jsx'
import AuthError from '../components/AuthError.jsx'
import OtpVerify from './OtpVerify.jsx'
import { LOCATIONS } from '../utils/barangays.js'

export default function Signup() {
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupData, setSignupData] = useState(null)
  const [barangay, setBarangay] = useState('')
  const [street, setStreet] = useState('')
  const [selectedMunicipality, setSelectedMunicipality] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const f = e.target
    if (!terms) return setError('Please agree to the Terms of Service and Privacy Policy.')
    if (!f.name.value) return setError('Full name is required.')
    if (!f.email.value) return setError('Email address is required.')
    if (!f.phone.value) return setError('Contact number is required.')
    if (!/^(09|\+639)\d{9}$/.test(f.phone.value.replace(/[\s-]/g, ''))) return setError('Enter a valid PH mobile number, e.g. 09171234567.')
    if (!barangay) return setError('Please select your barangay.')
    if (!street.trim()) return setError('Please enter your house no. / street.')
    if (f.password.value.length < 8) return setError('Password must be at least 8 characters.')
    if (f.password.value !== f.confirm.value) return setError('Passwords do not match.')

    setLoading(true)
    setError('')

    try {
      const res = await fetch('http://127.0.0.1:3000/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: f.email.value })
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Failed to send OTP.')

      setSignupData({
        name: f.name.value,
        email: f.email.value,
        phone: f.phone.value,
        address: `${street.trim()}, ${barangay}, Batangas`,
        password: f.password.value
      })
    } catch {
      setError('Unable to connect to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (signupData) {
    return <OtpVerify signupData={signupData} onBack={() => setSignupData(null)} />
  }

  return (
    <div className="auth">
      <AuthArt />
      <section className="auth-panel">
        <div className="auth-form">
          <div className="seg">
            <a href="/login">Log in</a>
            <a className="on" href="/signup">Sign up</a>
          </div>
          <div className="auth-eyebrow">Join Allmighty</div>
          <h1>Create your account</h1>
          <p className="lead">Start shopping for everyday essentials.</p>

          <form onSubmit={handleSubmit} noValidate>
            <AuthError message={error} />
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" name="name" placeholder="e.g. Maria Reyes" autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" placeholder="you@gmail.com" autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="phone">Contact number</label>
              <input id="phone" name="phone" type="tel" inputMode="tel" placeholder="09XXXXXXXXX" maxLength={11} autoComplete="tel" />
            </div>
            <div className="field">
              <label>Municipality</label>
              <select
                value={selectedMunicipality}
                onChange={e => { setSelectedMunicipality(e.target.value); setBarangay('') }}
                style={{ height: '40px', borderRadius: '12px', padding: '0 16px', fontSize: '14px', border: '1px solid #ccc', width: '100%', background: '#fff' }}
              >
                <option value="">Select municipality...</option>
                {LOCATIONS.map(loc => (
                  <option key={loc.municipality} value={loc.municipality}>{loc.municipality}, Batangas</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Barangay</label>
              <select
                value={barangay}
                onChange={e => setBarangay(e.target.value)}
                style={{ height: '40px', borderRadius: '12px', padding: '0 16px', fontSize: '14px', border: '1px solid #ccc', width: '100%', background: '#fff' }}
                disabled={!selectedMunicipality}
              >
                <option value="">Select barangay...</option>
                {(LOCATIONS.find(l => l.municipality === selectedMunicipality)?.barangays || []).map(b => (
                  <option key={b} value={`${b}, ${selectedMunicipality}`}>{b}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>House no. / Street</label>
              <input
                placeholder="e.g. 42 Mabini St."
                value={street}
                onChange={e => setStreet(e.target.value)}
              />
            </div>
            <PasswordField id="pw" name="password" label="Password" placeholder="At least 8 characters" autoComplete="new-password" />
            <PasswordField id="pw2" name="confirm" label="Confirm password" placeholder="Enter password again" autoComplete="new-password" />
            <label className="check" style={{ marginBottom: '6px' }}>
              <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />
              <span>I agree to the <b>Terms of Service</b> and <b>Privacy Policy</b>.</span>
            </label>
            <button className="auth-btn" type="submit" disabled={!terms || loading}>
              {loading ? 'Sending OTP...' : 'Create Account'}
            </button>
          </form>

          <p className="auth-foot">Already have an account? <b><a href="/login">Log in</a></b></p>
        </div>
      </section>
    </div>
  )
}
