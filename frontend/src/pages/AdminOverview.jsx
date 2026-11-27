import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
const longDate = ts => new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

function timeAgo(ts) {
  const m = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  return new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

const STATUS_LABEL = { new: 'New', preparing: 'Preparing', for_delivery: 'For delivery', delivered: 'Delivered', cancelled: 'Cancelled' }
const STATUS_COLOR = { new: 'b-new', preparing: 'b-preparing', for_delivery: 'b-for_delivery', delivered: 'b-delivered', cancelled: 'b-cancelled' }

function SvgIcon({ paths, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

export default function AdminOverview() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'Admin'
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const token = localStorage.getItem('token')
      const [ordersRes, productsRes] = await Promise.all([
        fetch('http://127.0.0.1:3000/orders/all', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://127.0.0.1:3000/products')
      ])
      const ordersData = await ordersRes.json()
      const productsData = await productsRes.json()
      if (ordersData.success) setOrders(ordersData.orders)
      if (productsData.success) setProducts(productsData.products)
    } catch {}
    finally { setLoading(false) }
  }

  function logout() { localStorage.clear(); navigate('/login') }

  // compute stats
  const today = new Date().toDateString()
  const todaySales = orders
    .filter(o => o.status === 'delivered' && new Date(o.created_at).toDateString() === today)
    .reduce((s, o) => s + Number(o.total), 0)

  const newOrders = orders.filter(o => o.status === 'new').length
  const lowStock = products.filter(p => p.stock <= 10).length
  const recentOrders = orders.slice(0, 5)

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

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">ALLMIGHTY</div>
        <nav>
          <Link className="nav-item active" to="/admin">
            <SvgIcon paths={['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z']} /> <span>Overview</span>
          </Link>
          <Link className="nav-item" to="/admin/orders">
            <SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} /> <span>Orders</span>
            {newOrders > 0 && <em className="nav-badge">{newOrders}</em>}
          </Link>
          <Link className="nav-item" to="/admin/products">
            <SvgIcon paths={['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8l9 5 9-5V8', 'M12 13v8']} /> <span>Products</span>
          </Link>
          <Link className="nav-item" to="/admin/riders">
            <SvgIcon paths={['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8']} /> <span>Riders</span>
          </Link>
          <Link className="nav-item" to="/admin/payroll">
            <SvgIcon paths={['M3 6h18a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2z', 'M3 10h18']} /> <span>Payroll</span>
          </Link>
          <Link className="nav-item" to="/admin/reports">
            <SvgIcon paths={['M5 20V10', 'M12 20V4', 'M19 20v-7']} /> <span>Reports</span>
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
            <h1>{greeting()}, {name.split(' ')[0]}</h1>
          </div>
        </div>

        {loading ? <p className="muted">Loading...</p> : (
          <>
            {/* Today's Sales Banner */}
            <div className="banner-blue">
              <div className="label">Today's sales</div>
              <div className="big">{money(todaySales)}</div>
              <div className="sub">Delivered orders today</div>
              <div className="deco"><SvgIcon paths={['M5 20V10', 'M12 20V4', 'M19 20v-7']} size={44} /></div>
            </div>

            {/* Stats */}
            <div className="grid-2" style={{ marginTop: '14px' }}>
              <Link className="stat" to="/admin/orders">
                <SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} size={20} />
                <div className="k" style={{ marginTop: '12px' }}>New orders</div>
                <div className="v">{newOrders}</div>
                <div className="d">{newOrders > 0 ? 'Need action' : 'All good'}</div>
              </Link>
              <Link className="stat" to="/admin/products">
                <SvgIcon paths={['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8l9 5 9-5V8', 'M12 13v8']} size={20} />
                <div className="k" style={{ marginTop: '12px' }}>Low stock</div>
                <div className="v">{lowStock}</div>
                <div className="d">{lowStock > 0 ? 'Restock soon' : 'All good'}</div>
              </Link>
            </div>

            {/* Recent Orders */}
            <div className="section-head">
              <h2>Recent orders</h2>
              <Link className="link" to="/admin/orders">View all</Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="muted">No orders yet.</p>
            ) : recentOrders.map(o => (
              <div key={o.id} className="list-row">
                <div className="avatar soft" style={{ width: '38px', height: '38px', fontSize: '11px' }}>{initials(o.customer_name)}</div>
                <div className="grow">
                  <div className="t">{o.customer_name}</div>
                  <div className="s">#AM-{o.id} · {o.items?.length || 0} items · {timeAgo(o.created_at)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="t">{money(o.total)}</div>
                  <span className={`badge ${STATUS_COLOR[o.status]}`} style={{ fontSize: '10px' }}>{STATUS_LABEL[o.status]}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  )
}

//// Fixing bug In Admin Overview!