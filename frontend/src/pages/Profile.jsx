import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LOCATIONS } from '../utils/barangays.js'

function SvgIcon({ paths, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

export default function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [pwError, setPwError] = useState('')

  // edit form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedMunicipality, setSelectedMunicipality] = useState('')
  const [barangay, setBarangay] = useState('')
  const [street, setStreet] = useState('')

  // password form state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setProfile(data.user)
        localStorage.setItem('name', data.user.name)
      }
    } catch {}
    finally { setLoading(false) }
  }

  function openEdit() {
    setName(profile.name || '')
    setPhone(profile.phone || '')
    setStreet('')
    setBarangay('')
    setSelectedMunicipality('')
    setError('')
    setShowEditModal(true)
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required.')
    if (phone && !/^(09|\+639)\d{9}$/.test(phone.replace(/[\s-]/g, ''))) return setError('Enter a valid PH mobile number.')

    const fullAddress = street && barangay ? `${street.trim()}, ${barangay}, Batangas` : profile.address

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, phone, address: fullAddress })
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Failed to update profile.')
      setShowEditModal(false)
      showToast('Profile updated!')
      fetchProfile()
    } catch {
      setError('Unable to connect to server.')
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    if (!currentPw) return setPwError('Enter your current password.')
    if (newPw.length < 8) return setPwError('New password must be at least 8 characters.')
    if (newPw !== confirmPw) return setPwError('Passwords do not match.')

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
      })
      const data = await res.json()
      if (!res.ok) return setPwError(data.error || 'Failed to update password.')
      setShowPasswordModal(false)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      showToast('Password updated!')
    } catch {
      setPwError('Unable to connect to server.')
    }
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function logout() {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <div className="layout">

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Log out</h2>
            <p className="sub">Are you sure you want to log out?</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={logout}>Log out</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Edit profile</h2>
            <form onSubmit={handleEditSubmit} noValidate>
              {error && <div className="auth-error">{error}</div>}
              <div className="field">
                <label>Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Maria Reyes" />
              </div>
              <div className="field">
                <label>Contact number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09XXXXXXXXX" maxLength={11} />
              </div>
              <div className="field">
                <label>Current address</label>
                <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px', padding: '8px 12px', background: '#f5f5f5', borderRadius: '8px' }}>{profile.address || 'No address set'}</div>
              </div>
              <div className="field">
                <label>Update address (optional)</label>
                <select
                  value={selectedMunicipality}
                  onChange={e => { setSelectedMunicipality(e.target.value); setBarangay('') }}
                  style={{ height: '44px', borderRadius: '12px', padding: '0 16px', fontSize: '14px', border: '1px solid #ccc', width: '100%', background: '#fff', marginBottom: '8px' }}
                >
                  <option value="">Select municipality...</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc.municipality} value={loc.municipality}>{loc.municipality}, Batangas</option>
                  ))}
                </select>
                {selectedMunicipality && (
                  <select
                    value={barangay}
                    onChange={e => setBarangay(e.target.value)}
                    style={{ height: '44px', borderRadius: '12px', padding: '0 16px', fontSize: '14px', border: '1px solid #ccc', width: '100%', background: '#fff', marginBottom: '8px' }}
                  >
                    <option value="">Select barangay...</option>
                    {(LOCATIONS.find(l => l.municipality === selectedMunicipality)?.barangays || []).map(b => (
                      <option key={b} value={`${b}, ${selectedMunicipality}`}>{b}</option>
                    ))}
                  </select>
                )}
                {barangay && (
                  <input
                    placeholder="House no. / Street"
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    style={{ height: '44px', borderRadius: '12px', padding: '0 16px', fontSize: '14px', border: '1px solid #ccc', width: '100%' }}
                  />
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Change password</h2>
            <form onSubmit={handlePasswordSubmit} noValidate>
              {pwError && <div className="auth-error">{pwError}</div>}
              <div className="field">
                <label>Current password</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password" />
              </div>
              <div className="field">
                <label>New password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 8 characters" />
              </div>
              <div className="field">
                <label>Confirm new password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Enter new password again" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">ALLMIGHTY</div>
        <nav>
          <Link className="nav-item" to="/shop"><SvgIcon paths={['M3 11l9-8 9 8', 'M5 10v10h5v-6h4v6h5V10']} /> <span>Home</span></Link>
          <Link className="nav-item" to="/shop/catalog"><SvgIcon paths={['M5 8h14l-1 12H6L5 8z', 'M9 8V6a3 3 0 016 0v2']} /> <span>Shop</span></Link>
          <Link className="nav-item" to="/orders"><SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} /> <span>Orders</span></Link>
          <Link className="nav-item active" to="/profile"><SvgIcon paths={['M12 8a4 4 0 100 8 4 4 0 000-8z', 'M4 21c1-4 4-6 8-6s7 2 8 6']} /> <span>Profile</span></Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-brand">ALLMIGHTY</div>
          <button className="btn btn-ghost" onClick={() => setShowLogoutModal(true)}>Log out</button>
        </header>

        <div className="head">
          <div>
            <div className="eyebrow">Your account</div>
            <h1>Profile</h1>
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading...</p>
        ) : profile ? (
          <>
            {/* Avatar */}
            <div className="profile-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div className="avatar" style={{ width: '64px', height: '64px', fontSize: '20px' }}>{initials(profile.name)}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '18px' }}>{profile.name}</div>
                <div className="small muted">{profile.email}</div>
              </div>
            </div>

            {/* Info */}
            <div className="card" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Account details</h2>
                <button className="btn btn-outline btn-sm" onClick={openEdit}>Edit</button>
              </div>
              <div className="kv"><span>Full name</span><span>{profile.name}</span></div>
              <div className="kv"><span>Email</span><span>{profile.email}</span></div>
              <div className="kv"><span>Contact number</span><span>{profile.phone || <span className="muted">Not set</span>}</span></div>
              <div className="kv"><span>Delivery address</span><span>{profile.address || <span className="muted">Not set</span>}</span></div>
            </div>

            {/* Security */}
            <div className="card">
              <h2 style={{ marginBottom: '16px' }}>Security</h2>
              <button className="menu-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setPwError(''); setShowPasswordModal(true) }}>
                <span>Change password</span>
                <SvgIcon paths={['M9 5l7 7-7 7']} />
              </button>
            </div>
          </>
        ) : (
          <p className="muted">Failed to load profile.</p>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
