import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })

const STATUS_LABEL = {
  new: 'New',
  preparing: 'Preparing',
  for_delivery: 'For Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
}

const STATUS_COLOR = {
  new: 'b-new',
  preparing: 'b-preparing',
  for_delivery: 'b-for_delivery',
  delivered: 'b-delivered',
  cancelled: 'b-cancelled'
}

const STEPS = ['Order Placed', 'Preparing', 'Out for Delivery', 'Delivered']

function stepIndex(status) {
  return { new: 0, preparing: 1, for_delivery: 2, delivered: 3 }[status] ?? 0
}

function SvgIcon({ paths, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

function timeAgo(ts) {
  const m = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  return new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchOrders() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/orders/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setOrders(data.orders)
    } catch {}
    finally { setLoading(false) }
  }

  async function handleCancel(orderId) {
    setCancelError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://127.0.0.1:3000/orders/cancel/${orderId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) return setCancelError(data.error || 'Failed to cancel order.')
      showToast('Order cancelled.')
      setSelected(null)
      fetchOrders()
    } catch {
      setCancelError('Unable to connect to server.')
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

  const filtered = orders.filter(o => {
    if (filter === 'active') return ['new', 'preparing', 'for_delivery'].includes(o.status)
    if (filter === 'delivered') return o.status === 'delivered'
    if (filter === 'cancelled') return o.status === 'cancelled'
    return true
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
        <div className="overlay" onClick={() => { setSelected(null); setCancelError('') }}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <div className="row between" style={{ marginBottom: '4px' }}>
              <h2>Order #{selected.id}</h2>
              <span className={`badge ${STATUS_COLOR[selected.status]}`}>{STATUS_LABEL[selected.status]}</span>
            </div>
            <p className="sub">{timeAgo(selected.created_at)} · Cash on Delivery</p>

            {/* Status tracker */}
            {selected.status !== 'cancelled' && (
              <div className="track" style={{ margin: '16px 0' }}>
                {STEPS.map((s, i) => (
                  <div key={s} className={`step ${i <= stepIndex(selected.status) ? 'done' : ''}`}>{s}</div>
                ))}
              </div>
            )}

            {/* Delivery info */}
            <div className="kv"><span>Phone</span><span>{selected.phone}</span></div>
            <div className="kv"><span>Address</span><span>{selected.address}</span></div>
            {selected.notes && <div className="kv"><span>Note</span><span>{selected.notes}</span></div>}

            {/* Items */}
            <div style={{ margin: '14px 0 4px', fontWeight: 600, fontSize: '13px' }}>Items</div>
            {selected.items?.map((item, i) => (
              <div key={i} className="kv">
                <span>{item.qty} × {item.name}</span>
                <span>{money(item.qty * item.price)}</span>
              </div>
            ))}
            <div className="row between" style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
              <b>Total</b>
              <b style={{ fontSize: '19px' }}>{money(selected.total)}</b>
            </div>

            {cancelError && <div className="auth-error" style={{ marginTop: '12px' }}>{cancelError}</div>}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setSelected(null); setCancelError('') }}>Close</button>
              {selected.status === 'new' && (
                <button className="btn btn-danger" onClick={() => handleCancel(selected.id)}>Cancel order</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">ALLMIGHTY</div>
        <nav>
          <Link className="nav-item" to="/shop"><SvgIcon paths={['M3 11l9-8 9 8', 'M5 10v10h5v-6h4v6h5V10']} /><span>Home</span></Link>
          <Link className="nav-item" to="/shop/catalog"><SvgIcon paths={['M5 8h14l-1 12H6L5 8z', 'M9 8V6a3 3 0 016 0v2']} /><span>Shop</span></Link>
          <Link className="nav-item active" to="/orders"><SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} /><span>Orders</span></Link>
          <Link className="nav-item" to="/profile"><SvgIcon paths={['M12 8a4 4 0 100 8 4 4 0 000-8z', 'M4 21c1-4 4-6 8-6s7 2 8 6']} /><span>Profile</span></Link>
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
            <div className="eyebrow">Order updates</div>
            <h1>Your orders</h1>
          </div>
        </div>

        {/* Filter chips */}
        <div className="chips" style={{ marginBottom: '20px' }}>
          {[['all', 'All'], ['active', 'Active'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']].map(([val, label]) => (
            <button key={val} className={`chip ${filter === val ? 'active' : ''}`} onClick={() => setFilter(val)}>{label}</button>
          ))}
        </div>

        {loading ? (
          <p className="muted">Loading orders...</p>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="ring">
              <SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} size={32} />
            </div>
            <h3>No orders yet</h3>
            <p>When you place an order, you can track every step of its journey here.</p>
            <Link className="btn btn-primary" to="/shop/catalog">Browse products</Link>
          </div>
        ) : (
          <div className="grid-2">
            {filtered.map(o => (
              <div key={o.id} className="ocard" onClick={() => { setSelected(o); setCancelError('') }} style={{ cursor: 'pointer' }}>
                <div className="top">
                  <div>
                    <div className="oid">Order #{o.id}</div>
                    <div className="ago">{timeAgo(o.created_at)}</div>
                  </div>
                  <span className={`badge ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                </div>

                {/* Items preview */}
                <div>
                  {o.items?.slice(0, 2).map((item, i) => (
                    <div key={i} className="row between small" style={{ padding: '3px 0' }}>
                      <span>{item.qty} × {item.name}</span>
                      <span className="muted">{money(item.qty * item.price)}</span>
                    </div>
                  ))}
                  {o.items?.length > 2 && <div className="small muted">+{o.items.length - 2} more</div>}
                </div>

                {/* Status tracker */}
                {o.status !== 'cancelled' && (
                  <div className="track">
                    {STEPS.map((s, i) => (
                      <div key={s} className={`step ${i <= stepIndex(o.status) ? 'done' : ''}`}>{s}</div>
                    ))}
                  </div>
                )}

                <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                  <span className="muted small">Cash on delivery</span>
                  <b>{money(o.total)}</b>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
