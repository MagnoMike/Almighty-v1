import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

function timeAgo(ts) {
  const m = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  return new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function SvgIcon({ paths, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

export default function RiderHistory() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'Rider'
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/orders/rider', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setOrders(data.orders.filter(o => o.status === 'delivered'))
    } catch {}
    finally { setLoading(false) }
  }

  function logout() { localStorage.clear(); navigate('/login') }

  const totalDeliveries = orders.length
  const totalCOD = orders.reduce((s, o) => s + Number(o.total), 0)

  const thisWeek = orders.filter(o => {
    const d = new Date(o.created_at)
    const now = new Date()
    const diff = (now - d) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })

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

      {/* Order Detail Modal */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <div className="row between">
              <h2>#AM-{selected.id}</h2>
              <span className="badge b-delivered">Delivered</span>
            </div>
            <p className="sub">{timeAgo(selected.created_at)}</p>
            <div className="kv"><span>Customer</span><span>{selected.customer_name}</span></div>
            <div className="kv"><span>Address</span><span>{selected.address}</span></div>
            <div className="kv"><span>Mobile</span><span>{selected.phone}</span></div>
            {selected.notes && <div className="kv"><span>Note</span><span>{selected.notes}</span></div>}
            <div style={{ margin: '14px 0 4px', fontWeight: 600, fontSize: '13px' }}>Items</div>
            {selected.items?.map((item, i) => (
              <div key={i} className="kv">
                <span>{item.qty} × {item.name}</span>
                <span>{money(item.qty * item.price)}</span>
              </div>
            ))}
            <div className="row between" style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
              <b>Total collected</b>
              <b style={{ fontSize: '19px' }}>{money(selected.total)}</b>
            </div>
            {selected.proof_photo && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Proof of Delivery</div>
                <img src={`http://127.0.0.1:3000${selected.proof_photo}`} alt="proof"
                  style={{ width: '100%', borderRadius: '12px', maxHeight: '200px', objectFit: 'cover' }} />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">ALLMIGHTY</div>
        <nav>
          <Link className="nav-item" to="/rider"><SvgIcon paths={['M3 11l9-8 9 8', 'M5 10v10h5v-6h4v6h5V10']} /><span>Today</span></Link>
          <Link className="nav-item" to="/rider/deliveries"><SvgIcon paths={['M2 6h11v10H2z', 'M13 9h5l3 3v4h-8', 'M7 18a2 2 0 100-4 2 2 0 000 4z', 'M17 18a2 2 0 100-4 2 2 0 000 4z']} /><span>Deliveries</span></Link>
          <Link className="nav-item active" to="/rider/history"><SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} /><span>History</span></Link>
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
            <div className="eyebrow">Delivery records</div>
            <h1>History</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-stat" style={{ marginBottom: '20px' }}>
          <div className="card">
            <div className="eyebrow">This week</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{thisWeek.length}</div>
            <div className="small muted">Completed</div>
          </div>
          <div className="card">
            <div className="eyebrow">All time</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{totalDeliveries}</div>
            <div className="small muted">Deliveries</div>
          </div>
          <div className="card">
            <div className="eyebrow">COD collected</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{money(totalCOD)}</div>
            <div className="small muted">Total</div>
          </div>
        </div>

        {/* History list */}
        {loading ? (
          <p className="muted">Loading...</p>
        ) : orders.length === 0 ? (
          <div className="empty">
            <div className="ring"><SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} size={32} /></div>
            <h3>No completed deliveries</h3>
            <p>Your delivery history will appear here.</p>
          </div>
        ) : (
          <div className="stack">
            {orders.map(o => (
              <div key={o.id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => setSelected(o)}>
                <div className="avatar" style={{ width: '36px', height: '36px', background: 'var(--ok-bg)' }}>
                  <SvgIcon paths={['M5 12.5l4.5 4.5L19 7']} size={16} />
                </div>
                <div className="grow">
                  <div className="t">{o.customer_name}</div>
                  <div className="s">#AM-{o.id} · {timeAgo(o.created_at)}</div>
                </div>
                <b>{money(o.total)}</b>
              </div>
            ))}
          </div>
        )}
      </main>

      {toast && <div className={`toast${toast.isErr ? ' err' : ''}`}>{toast.msg}</div>}
    </div>
  )
}
