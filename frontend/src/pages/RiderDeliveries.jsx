import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const mapsUrl = a => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a)

function timeAgo(ts) {
  const m = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  return new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function SvgIcon({ paths, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

export default function RiderDeliveries() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'Rider'
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(null)
  const [showProofModal, setShowProofModal] = useState(null)
  const [proofPhoto, setProofPhoto] = useState(null)
  const [proofLoading, setProofLoading] = useState(false)
  const [toast, setToast] = useState('')

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
  const doneOrders = orders.filter(o => o.status === 'delivered')

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
      showToast('Delivery completed!')
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

  const list = tab === 'active' ? activeOrders : doneOrders

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
            <div style={{
              border: '1.5px dashed #ccc', borderRadius: '12px', padding: '20px',
              textAlign: 'center', cursor: 'pointer', background: '#fafafa', marginBottom: '16px'
            }} onClick={() => document.getElementById('proof-input').click()}>
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
            <input id="proof-input" type="file" accept="image/*" capture="environment"
              onChange={e => setProofPhoto(e.target.files[0])} style={{ display: 'none' }} />
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setShowProofModal(null); setProofPhoto(null) }}>Cancel</button>
              <button className="btn btn-primary" disabled={!proofPhoto || proofLoading}
                onClick={() => handleDeliver(showProofModal.id)}>
                {proofLoading ? 'Saving...' : 'Confirm delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Detail Modal */}
      {showDeliveryModal && (
        <div className="overlay" onClick={() => setShowDeliveryModal(null)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <div className="row between">
              <h2>#AM-{showDeliveryModal.id}</h2>
              <span className="badge b-cod">COD</span>
            </div>
            <p className="sub">{showDeliveryModal.customer_name} · {timeAgo(showDeliveryModal.created_at)}</p>
            <div className="kv"><span>Address</span><span>{showDeliveryModal.address}</span></div>
            <div className="kv"><span>Mobile</span><span>{showDeliveryModal.phone}</span></div>
            {showDeliveryModal.notes && <div className="kv"><span>Note</span><span>{showDeliveryModal.notes}</span></div>}
            <div style={{ margin: '14px 0 4px', fontWeight: 600, fontSize: '13px' }}>Items</div>
            {showDeliveryModal.items?.map((item, i) => (
              <div key={i} className="kv">
                <span>{item.qty} × {item.name}</span>
                <span>{money(item.qty * item.price)}</span>
              </div>
            ))}
            <div className="collect"><span>Amount to collect</span><b>{money(showDeliveryModal.total)}</b></div>
            <div className="stack" style={{ gap: '10px', marginTop: '12px' }}>
              {showDeliveryModal.status === 'for_delivery' && (
                <button className="btn btn-primary btn-lg btn-block" onClick={() => { 
                  setShowProofModal(showDeliveryModal)
                  setProofPhoto(null)
                  setShowDeliveryModal(null)
                }}>
                  Mark as delivered
                </button>
              )}
              <a className="btn btn-outline btn-block" href={mapsUrl(showDeliveryModal.address)} target="_blank" rel="noopener">
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
          <Link className="nav-item" to="/rider"><SvgIcon paths={['M3 11l9-8 9 8', 'M5 10v10h5v-6h4v6h5V10']} /><span>Today</span></Link>
          <Link className="nav-item active" to="/rider/deliveries"><SvgIcon paths={['M2 6h11v10H2z', 'M13 9h5l3 3v4h-8', 'M7 18a2 2 0 100-4 2 2 0 000 4z', 'M17 18a2 2 0 100-4 2 2 0 000 4z']} /><span>Deliveries</span></Link>
          <Link className="nav-item" to="/rider/history"><SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} /><span>History</span></Link>
          <Link className="nav-item" to="/rider/profile"><SvgIcon paths={['M12 8a4 4 0 100 8 4 4 0 000-8z', 'M4 21c1-4 4-6 8-6s7 2 8 6']} /><span>Profile</span></Link>
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
            <div className="eyebrow">Assigned to you</div>
            <h1>My deliveries</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="chips" style={{ marginBottom: '20px' }}>
          <button className={`chip ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
            Active <small>{activeOrders.length}</small>
          </button>
          <button className={`chip ${tab === 'done' ? 'active' : ''}`} onClick={() => setTab('done')}>
            Completed <small>{doneOrders.length}</small>
          </button>
        </div>

        {/* Orders */}
        {loading ? (
          <p className="muted">Loading...</p>
        ) : list.length === 0 ? (
          <div className="empty">
            <div className="ring"><SvgIcon paths={['M2 6h11v10H2z', 'M13 9h5l3 3v4h-8']} size={30} /></div>
            <h3>{tab === 'active' ? 'No active deliveries' : 'No completed deliveries'}</h3>
            <p>{tab === 'active' ? 'Orders assigned to you will appear here.' : 'Completed deliveries will appear here.'}</p>
          </div>
        ) : (
          <div className="grid-2">
            {list.map(o => (
              <div key={o.id} className="ocard">
                <div className="top">
                  <div>
                    <div className="oid">#AM-{o.id}</div>
                    <div className="ago">{timeAgo(o.created_at)}</div>
                  </div>
                  <span className="badge b-cod">COD</span>
                </div>

                <div className="row" style={{ gap: '10px' }}>
                  <div className="avatar soft" style={{ width: '36px', height: '36px', fontSize: '11px' }}>{initials(o.customer_name)}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{o.customer_name}</div>
                    <div className="small muted">{o.address}</div>
                    <div className="small muted">{o.phone}</div>
                  </div>
                </div>

                <div>
                  {o.items?.slice(0, 2).map((item, i) => (
                    <div key={i} className="row between small" style={{ padding: '2px 0' }}>
                      <span>{item.qty} × {item.name}</span>
                      <span className="muted">{money(item.qty * item.price)}</span>
                    </div>
                  ))}
                  {o.items?.length > 2 && <div className="small muted">+{o.items.length - 2} more</div>}
                </div>

                <div className="collect"><span>Amount to collect</span><b>{money(o.total)}</b></div>

                {o.status === 'for_delivery' && (
                  <button className="btn btn-primary btn-block" onClick={() => setShowDeliveryModal(o)}>
                    View delivery
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {toast && <div className={`toast${toast.isErr ? ' err' : ''}`}>{toast.msg}</div>}
    </div>
  )
}
