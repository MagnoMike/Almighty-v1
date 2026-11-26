import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const longDate = ts => new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const mapsUrl = a => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a)

function SvgIcon({ paths, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

export default function RiderToday() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'Rider'
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(null)
  const [showProofModal, setShowProofModal] = useState(null)
  const [proofPhoto, setProofPhoto] = useState(null)
  const [proofLoading, setProofLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchOrders() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/orders/rider', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setOrders(data.orders)
    } catch {}
    finally { setLoading(false) }
  }

  const activeOrders = orders.filter(o => o.status === 'for_delivery')
  const doneToday = orders.filter(o => o.status === 'delivered' && new Date(o.created_at).toDateString() === new Date().toDateString()).length
  const current = activeOrders[idx]

  async function handlePickup(id) {
    try {
      const token = localStorage.getItem('token')
      await fetch(`http://127.0.0.1:3000/orders/pickup/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      showToast('Pickup confirmed — safe trip!')
      setShowDeliveryModal(null)
      fetchOrders()
    } catch { showToast('Failed to update.', true) }
  }

  async function handleDeliver(id) {
    if (!proofPhoto) { showToast('Please take a photo first.', true); return }
    setProofLoading(true)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('proof', proofPhoto)
      await fetch(`http://127.0.0.1:3000/orders/deliver/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      showToast('Delivery completed. Nice work!')
      setShowProofModal(null)
      setShowDeliveryModal(null)
      setProofPhoto(null)
      fetchOrders()
    } catch { showToast('Failed to update.', true) }
    finally { setProofLoading(false) }
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

      {/* Proof of Delivery Modal */}
      {showProofModal && (
        <div className="overlay" onClick={() => { setShowProofModal(null); setProofPhoto(null) }}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Proof of Delivery</h2>
            <p className="sub">Take a photo of the delivered items or customer receiving the order.</p>
            <div style={{ border: '1.5px dashed #ccc', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#fafafa', marginBottom: '16px' }}
              onClick={() => document.getElementById('proof-input-today').click()}>
              {proofPhoto ? (
                <div>
                  <img src={URL.createObjectURL(proofPhoto)} alt="proof"
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px', marginBottom: '8px' }} />
                  <div className="small muted">{proofPhoto.name}</div>
                </div>
              ) : (
                <div>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px', display: 'block' }}>
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                  <div style={{ fontWeight: 600 }}>Upload photo</div>
                  <div className="small muted">JPG, PNG · Max 10MB</div>
                </div>
              )}
            </div>
            <input id="proof-input-today" type="file" accept="image/*" capture="environment"
              onChange={e => setProofPhoto(e.target.files[0])} style={{ display: 'none' }} />
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setShowProofModal(null); setProofPhoto(null) }}>Cancel</button>
              <button className="btn btn-primary" disabled={!proofPhoto || proofLoading} onClick={() => handleDeliver(showProofModal.id)}>
                {proofLoading ? 'Saving...' : 'Confirm delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Modal */}
      {showDeliveryModal && (
        <div className="overlay" onClick={() => setShowDeliveryModal(null)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <div className="row between">
              <h2>#AM-{showDeliveryModal.id}</h2>
              <span className="badge b-cod">COD</span>
            </div>
            <p className="sub">{showDeliveryModal.customer_name}</p>
            <div className="kv"><span>Address</span><span>{showDeliveryModal.address}</span></div>
            <div className="kv"><span>Mobile</span><span>{showDeliveryModal.phone}</span></div>
            {showDeliveryModal.notes && <div className="kv"><span>Note</span><span>{showDeliveryModal.notes}</span></div>}
            <div style={{ margin: '14px 0 4px', fontWeight: 600, fontSize: '13px' }}>Items</div>
            {showDeliveryModal.items?.map((i, idx) => (
              <div key={idx} className="kv"><span>{i.qty} × {i.name}</span><span>{money(i.qty * i.price)}</span></div>
            ))}
            <div className="collect"><span>Amount to collect</span><b>{money(showDeliveryModal.total)}</b></div>
            <div className="stack" style={{ gap: '10px' }}>
              {showDeliveryModal.status === 'for_delivery' && (
                <button className="btn btn-primary btn-lg btn-block" onClick={() => {
                  setShowProofModal(showDeliveryModal)
                  setProofPhoto(null)
                  setShowDeliveryModal(null)
                }}>
                  Mark as delivered
                </button>
              )}
              <a className="btn btn-outline btn-block btn-lg" href={mapsUrl(showDeliveryModal.address)} target="_blank" rel="noopener">
                Open directions
              </a>
              <button className="btn btn-outline btn-block" onClick={() => setShowDeliveryModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">ALLMIGHTY</div>
        <nav>
          <Link className="nav-item active" to="/rider">
            <SvgIcon paths={['M3 11l9-8 9 8', 'M5 10v10h5v-6h4v6h5V10']} /> <span>Today</span>
          </Link>
          <Link className="nav-item" to="/rider/deliveries">
            <SvgIcon paths={['M2 6h11v10H2z', 'M13 9h5l3 3v4h-8', 'M7 18a2 2 0 100-4 2 2 0 000 4z', 'M17 18a2 2 0 100-4 2 2 0 000 4z']} /> <span>Deliveries</span>
          </Link>
          <Link className="nav-item" to="/rider/history">
            <SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} /> <span>History</span>
          </Link>
          <Link className="nav-item" to="/rider/profile">
            <SvgIcon paths={['M12 8a4 4 0 100 8 4 4 0 000-8z', 'M4 21c1-4 4-6 8-6s7 2 8 6']} /> <span>Profile</span>
          </Link>
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
            <div className="eyebrow">{longDate(Date.now())}</div>
            <h1>Ready to deliver?</h1>
          </div>
        </div>

        {/* Banner */}
        <div className="banner-blue">
          <div className="label">Today's route</div>
          <div className="big">{activeOrders.length} stop{activeOrders.length !== 1 ? 's' : ''}</div>
          <div className="sub">{doneToday} delivered today</div>
          <div className="deco">
            <SvgIcon paths={['M2 6h11v10H2z', 'M13 9h5l3 3v4h-8', 'M7 18a2 2 0 100-4 2 2 0 000 4z', 'M17 18a2 2 0 100-4 2 2 0 000 4z']} size={44} />
          </div>
        </div>

        {/* Current delivery */}
        {loading ? <p className="muted" style={{ marginTop: '20px' }}>Loading deliveries...</p> :
        current ? (
          <>
            <div className="section-head">
              <h2>Next delivery</h2>
              {activeOrders.length > 1 && (
                <span className="row small muted" style={{ gap: '6px' }}>
                  <button className="plus-btn" style={{ width: '26px', height: '26px' }} onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>‹</button>
                  {idx + 1} of {activeOrders.length}
                  <button className="plus-btn" style={{ width: '26px', height: '26px' }} onClick={() => setIdx(i => Math.min(activeOrders.length - 1, i + 1))} disabled={idx === activeOrders.length - 1}>›</button>
                </span>
              )}
            </div>
            <div className="card" style={{ maxWidth: '640px' }}>
              <div className="row between">
                <div className="row">
                  <div className="avatar soft" style={{ width: '40px', height: '40px', fontSize: '11px' }}>{initials(current.customer_name)}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{current.customer_name}</div>
                    <div className="small muted">Order #AM-{current.id} · {current.items?.length} items</div>
                  </div>
                </div>
                <span className="badge b-cod">COD</span>
              </div>
              <div className="row" style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--line)', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', marginTop: '2px' }}>
                  <SvgIcon paths={['M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z', 'M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z']} />
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{current.address}</div>
                  <div className="small muted">{current.phone}</div>
                </div>
              </div>
              <div className="collect"><span>Amount to collect</span><b>{money(current.total)}</b></div>
              <div className="stack" style={{ gap: '10px' }}>
                <button className="btn btn-primary btn-lg btn-block" onClick={() => {
                  setShowProofModal(current)
                  setProofPhoto(null)
                }}>
                  Mark as delivered
                </button>
                <button className="btn btn-outline btn-block" onClick={() => setShowDeliveryModal(current)}>
                  View details
                </button>
                <a className="btn btn-outline btn-block btn-lg" href={mapsUrl(current.address)} target="_blank" rel="noopener">
                  Open directions
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="empty" style={{ marginTop: '20px' }}>
            <div className="ring">
              <SvgIcon paths={['M2 6h11v10H2z', 'M13 9h5l3 3v4h-8']} size={30} />
            </div>
            <h3>No deliveries right now</h3>
            <p>New orders from the store will show up here.</p>
          </div>
        )}
      </main>

      {toast && <div className={`toast${toast.isErr ? ' err' : ''}`}>{toast.msg}</div>}
    </div>
  )
}
