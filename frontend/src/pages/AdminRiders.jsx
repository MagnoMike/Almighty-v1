import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })

function SvgIcon({ paths, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

export default function AdminRiders() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'Admin'
  const [riders, setRiders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState('')
  const [formError, setFormError] = useState('')
  const [newOrdersCount, setNewOrdersCount] = useState(0)

  // form state
  const [fname, setFname] = useState('')
  const [femail, setFemail] = useState('')
  const [fphone, setFphone] = useState('')
  const [fpassword, setFpassword] = useState('')

  useEffect(() => {
    fetchRiders()
    const token = localStorage.getItem('token')
    fetch('http://127.0.0.1:3000/orders/all', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setNewOrdersCount(d.orders.filter(o => o.status === 'new').length) })
      .catch(() => {})
  }, [])

  async function fetchRiders() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/auth/riders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setRiders(data.riders)
    } catch {}
    finally { setLoading(false) }
  }

  function openAdd() {
    setFname(''); setFemail(''); setFphone(''); setFpassword('')
    setFormError(''); setShowAddModal(true)
  }

  function openEdit(rider) {
    setSelected(rider)
    setFname(rider.name); setFemail(rider.email); setFphone(rider.phone || ''); setFpassword('')
    setFormError(''); setShowEditModal(true)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!fname || !femail || !fpassword) return setFormError('Name, email and password are required.')
    if (fpassword.length < 8) return setFormError('Password must be at least 8 characters.')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/auth/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: fname, email: femail, phone: fphone, password: fpassword })
      })
      const data = await res.json()
      if (!res.ok) return setFormError(data.error || 'Failed to add rider.')
      setShowAddModal(false)
      showToast('Rider added!')
      fetchRiders()
    } catch { setFormError('Unable to connect to server.') }
  }

  async function handleEdit(e) {
    e.preventDefault()
    if (!fname || !femail) return setFormError('Name and email are required.')
    try {
      const token = localStorage.getItem('token')
      const body = { name: fname, email: femail, phone: fphone }
      if (fpassword) body.password = fpassword
      const res = await fetch(`http://127.0.0.1:3000/auth/riders/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) return setFormError(data.error || 'Failed to update rider.')
      setShowEditModal(false)
      showToast('Rider updated!')
      fetchRiders()
    } catch { setFormError('Unable to connect to server.') }
  }

  async function handleDelete() {
    try {
      const token = localStorage.getItem('token')
      await fetch(`http://127.0.0.1:3000/auth/riders/${selected.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setShowDeleteModal(false)
      showToast('Rider removed.')
      fetchRiders()
    } catch { showToast('Failed to remove rider.', true) }
  }

  function showToast(msg, isErr) {
    setToast({ msg, isErr })
    setTimeout(() => setToast(''), 2500)
  }

  function logout() { localStorage.clear(); navigate('/login') }

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

      {/* Add Rider Modal */}
      {showAddModal && (
        <div className="overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Add delivery staff</h2>
            <form onSubmit={handleAdd} noValidate>
              {formError && <div className="auth-error">{formError}</div>}
              <div className="field"><label>Full name</label><input value={fname} onChange={e => setFname(e.target.value)} placeholder="e.g. Juan dela Cruz" /></div>
              <div className="field"><label>Email</label><input type="email" value={femail} onChange={e => setFemail(e.target.value)} placeholder="rider@gmail.com" /></div>
              <div className="field"><label>Phone</label><input type="tel" value={fphone} onChange={e => setFphone(e.target.value)} placeholder="09XXXXXXXXX" maxLength={11} /></div>
              <div className="field"><label>Password</label><input type="password" value={fpassword} onChange={e => setFpassword(e.target.value)} placeholder="At least 8 characters" /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add rider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rider Modal */}
      {showEditModal && (
        <div className="overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Edit delivery staff</h2>
            <form onSubmit={handleEdit} noValidate>
              {formError && <div className="auth-error">{formError}</div>}
              <div className="field"><label>Full name</label><input value={fname} onChange={e => setFname(e.target.value)} /></div>
              <div className="field"><label>Email</label><input type="email" value={femail} onChange={e => setFemail(e.target.value)} /></div>
              <div className="field"><label>Phone</label><input type="tel" value={fphone} onChange={e => setFphone(e.target.value)} maxLength={11} /></div>
              <div className="field"><label>New password <span className="muted">(leave blank to keep current)</span></label><input type="password" value={fpassword} onChange={e => setFpassword(e.target.value)} placeholder="At least 8 characters" /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Remove rider</h2>
            <p className="sub">Are you sure you want to remove <b>{selected?.name}</b>?</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">ALLMIGHTY</div>
        <nav>
          <Link className="nav-item" to="/admin"><SvgIcon paths={['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z']} /><span>Overview</span></Link>
          <Link className="nav-item" to="/admin/orders">
            <SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} /><span>Orders</span>
            {newOrdersCount > 0 && <em className="nav-badge">{newOrdersCount}</em>}
          </Link>
          <Link className="nav-item" to="/admin/products"><SvgIcon paths={['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8l9 5 9-5V8', 'M12 13v8']} /><span>Products</span></Link>
          <Link className="nav-item active" to="/admin/riders"><SvgIcon paths={['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8']} /><span>Riders</span></Link>
          <Link className="nav-item" to="/admin/payroll"><SvgIcon paths={['M3 6h18a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2z', 'M3 10h18']} /><span>Payroll</span></Link>
          <Link className="nav-item" to="/admin/reports"><SvgIcon paths={['M5 20V10', 'M12 20V4', 'M19 20v-7']} /><span>Reports</span></Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-brand">ALLMIGHTY</div>
          <button className="btn btn-ghost" onClick={() => setShowLogoutModal(true)}>Log out</button>
          <div className="avatar">{initials(name)}</div>
        </header>

        <div className="head">
          <div>
            <div className="eyebrow">Delivery Staff</div>
            <h1>Riders</h1>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Rider</button>
        </div>

        {/* Stats */}
        <div className="grid-stat" style={{ marginBottom: '20px' }}>
          <div className="card">
            <div className="eyebrow">Total Riders</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{riders.length}</div>
          </div>
        </div>

        {/* Riders list */}
        {loading ? <p className="muted">Loading riders...</p> : riders.length === 0 ? (
          <div className="empty">
            <div className="ring"><SvgIcon paths={['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8']} size={32} /></div>
            <h3>No riders yet</h3>
            <p>Add delivery staff to start assigning orders.</p>
          </div>
        ) : (
          <div className="stack">
            {riders.map(r => (
              <div key={r.id} className="card">
                <div className="row between">
                  <div className="row" style={{ gap: '14px' }}>
                    <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '14px' }}>{initials(r.name)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '16px' }}>{r.name}</div>
                      <div className="small muted">{r.email}</div>
                      <div className="small muted">{r.phone || 'No phone'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => { setSelected(r); setShowDeleteModal(true) }}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {toast && <div className={`toast${toast.isErr ? ' err' : ''}`}>{toast.msg}</div>}
    </div>
  )
}
