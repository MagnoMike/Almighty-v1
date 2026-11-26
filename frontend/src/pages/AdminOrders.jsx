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
  return new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

const STATUS_LABEL = {
  new: 'New', preparing: 'Preparing',
  for_delivery: 'For Delivery', delivered: 'Delivered', cancelled: 'Cancelled'
}
const STATUS_COLOR = {
  new: 'b-new', preparing: 'b-preparing',
  for_delivery: 'b-for_delivery', delivered: 'b-delivered', cancelled: 'b-cancelled'
}

function SvgIcon({ paths, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

export default function AdminOrders() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'Admin'
  const [orders, setOrders] = useState([])
  const [riders, setRiders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const [selected, setSelected] = useState(null)
  const [showOrderDetail, setShowOrderDetail] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showPOS, setShowPOS] = useState(false)
  const [selectedRider, setSelectedRider] = useState('')
  const [toast, setToast] = useState('')
  const [assignError, setAssignError] = useState('')
  const [posCart, setPosCart] = useState([])
  const [posError, setPosError] = useState('')
  const [posSuccess, setPosSuccess] = useState(null)
  const [posSearch, setPosSearch] = useState('')
  const [showPosConfirm, setShowPosConfirm] = useState(false)

  useEffect(() => {
    fetchOrders()
    fetchRiders()
    fetchProducts()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchOrders() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/orders/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setOrders(data.orders)
    } catch {}
    finally { setLoading(false) }
  }

  async function fetchRiders() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/auth/riders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setRiders(data.riders)
    } catch {}
  }

  async function fetchProducts() {
    try {
      const res = await fetch('http://127.0.0.1:3000/products?active=true')
      const data = await res.json()
      if (data.success) setProducts(data.products)
    } catch {}
  }

  // POS functions
  function posAddItem(product) {
    setPosCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        if (existing.qty >= product.stock) return prev
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, stock: product.stock, qty: 1 }]
    })
  }

  function posUpdateQty(id, delta) {
    setPosCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0))
  }

  async function handleCompleteSale() {
    if (posCart.length === 0) return setPosError('No items selected.')
    setPosError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/orders/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items: posCart })
      })
      const data = await res.json()
      if (!res.ok) return setPosError(data.error || 'Failed to complete sale.')
      setPosSuccess(data)
      setShowPOS(false)
      setShowPosConfirm(false)
      setFilter('completed')
      fetchOrders()
      fetchProducts()
    } catch { setPosError('Unable to connect to server.') }
  }

  async function handleAccept(id) {
    try {
      const token = localStorage.getItem('token')
      await fetch(`http://127.0.0.1:3000/orders/accept/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      showToast('Order accepted!')
      fetchOrders()
    } catch { showToast('Failed to accept order.', true) }
  }

  async function handleAssign(e) {
    e.preventDefault()
    if (!selectedRider) return setAssignError('Please select a rider.')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://127.0.0.1:3000/orders/assign/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ riderId: selectedRider })
      })
      const data = await res.json()
      if (!res.ok) return setAssignError(data.error || 'Failed to assign rider.')
      setShowAssignModal(false)
      setSelected(null)
      showToast('Rider assigned successfully!')
      fetchOrders()
    } catch { setAssignError('Unable to connect to server.') }
  }

  async function handleCancel(id) {
    try {
      const token = localStorage.getItem('token')
      await fetch(`http://127.0.0.1:3000/orders/decline/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      showToast('Order declined.')
      fetchOrders()
    } catch { showToast('Failed to decline order.', true) }
  }

  function showToast(msg, isErr) {
    setToast({ msg, isErr })
    setTimeout(() => setToast(''), 2500)
  }

  function logout() { localStorage.clear(); navigate('/login') }

  const filtered = orders.filter(o => {
    if (filter === 'active') return ['new', 'preparing', 'for_delivery'].includes(o.status)
    if (filter === 'completed') return o.status === 'delivered'
    if (filter === 'cancelled') return o.status === 'cancelled'
    return true
  })

  const newCount = orders.filter(o => o.status === 'new').length

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
      {showOrderDetail && (
        <div className="overlay" onClick={() => setShowOrderDetail(null)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <div className="row between" style={{ marginBottom: '4px' }}>
              <h2>Order #{showOrderDetail.id}</h2>
              <span className={`badge ${STATUS_COLOR[showOrderDetail.status]}`}>{STATUS_LABEL[showOrderDetail.status]}</span>
            </div>
            <p className="sub">{timeAgo(showOrderDetail.created_at)} · Cash on Delivery</p>
            <div className="kv"><span>Customer</span><span>{showOrderDetail.customer_name}</span></div>
            <div className="kv"><span>Phone</span><span>{showOrderDetail.phone}</span></div>
            <div className="kv"><span>Address</span><span>{showOrderDetail.address}</span></div>
            {showOrderDetail.notes && <div className="kv"><span>Note</span><span>{showOrderDetail.notes}</span></div>}
            <div style={{ margin: '14px 0 4px', fontWeight: 600, fontSize: '13px' }}>Items</div>
            {showOrderDetail.items?.map((item, i) => (
              <div key={i} className="kv">
                <span>{item.qty} × {item.name}</span>
                <span>{money(item.qty * item.price)}</span>
              </div>
            ))}
            <div className="row between" style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
              <b>Total</b>
              <b style={{ fontSize: '19px' }}>{money(showOrderDetail.total)}</b>
            </div>
            {showOrderDetail.proof_photo && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Proof of Delivery</div>
                <img src={`http://127.0.0.1:3000${showOrderDetail.proof_photo}`} alt="proof"
                  style={{ width: '100%', borderRadius: '12px', maxHeight: '220px', objectFit: 'cover' }} />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowOrderDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Rider Modal */}
      {showAssignModal && selected && (
        <div className="overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Assign a rider</h2>
            <p className="sub">Order #{selected.id} · {selected.customer_name} · {selected.address}</p>
            <form onSubmit={handleAssign} noValidate>
              {assignError && <div className="auth-error">{assignError}</div>}
              {riders.length === 0 ? (
                <p className="muted">No delivery staff found. Add riders first.</p>
              ) : riders.map(r => (
                <label key={r.id} className="radio-card" style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', border: `1.5px solid ${selectedRider == r.id ? 'var(--blue)' : 'var(--line)'}`,
                  borderRadius: '12px', cursor: 'pointer', marginBottom: '8px',
                  background: selectedRider == r.id ? 'var(--tint-2)' : '#fff'
                }}>
                  <input type="radio" name="rider" value={r.id}
                    checked={selectedRider == r.id}
                    onChange={() => setSelectedRider(r.id)}
                    style={{ display: 'none' }} />
                  <div className="avatar soft" style={{ width: '38px', height: '38px', fontSize: '12px' }}>{initials(r.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{r.name}</div>
                    <div className="small muted">{r.email}</div>
                  </div>
                </label>
              ))}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAssignModal(false)}>Later</button>
                {riders.length > 0 && <button type="submit" className="btn btn-primary">Send to rider</button>}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POS Success Modal */}
      {posSuccess && (
        <div className="overlay">
          <div className="modal" role="dialog" style={{ textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--ok-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
            </div>
            <h2 style={{ marginBottom: '8px' }}>Sale complete!</h2>
            <p className="muted" style={{ marginBottom: '4px' }}>Order #{posSuccess.orderId}</p>
            <p style={{ fontSize: '28px', fontWeight: 700, marginBottom: '24px' }}>{money(posSuccess.total)}</p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => setPosSuccess(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setPosSuccess(null); setPosCart([]); setPosSearch('') }}>New Sale</button>
            </div>
          </div>
        </div>
      )}

      {/* Walk-in POS Drawer */}
      {showPOS && (
        <div className="overlay drawer-wrap" onClick={() => setShowPOS(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()} style={{ width: '420px', maxWidth: '100%' }}>
            <div className="drawer-head" style={{ background: 'var(--blue)', color: '#fff', borderRadius: '0' }}>
              <h2 style={{ color: '#fff' }}>Walk-in Order</h2>
              <button className="icon-btn" onClick={() => setShowPOS(false)} style={{ border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>

            {(
              <>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'var(--tint-2)' }}>
                  <div className="search" style={{ margin: 0, background: '#fff' }}>
                    <SvgIcon paths={['M11 4a7 7 0 100 14A7 7 0 0011 4z', 'M20 20l-4-4']} />
                    <input value={posSearch} onChange={e => setPosSearch(e.target.value)} placeholder="Search products..." />
                  </div>
                </div>

                {/* Product list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', maxHeight: '240px', background: '#fff' }}>
                  {products.filter(p => p.stock > 0 && (!posSearch || p.name.toLowerCase().includes(posSearch.toLowerCase()))).map(p => (
                    <div key={p.id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => posAddItem(p)}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', background: 'var(--tint-2)', flexShrink: 0 }}>
                        {p.image ? (
                          <img src={`http://127.0.0.1:3000${p.image}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                            <SvgIcon paths={['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8l9 5 9-5V8', 'M12 13v8']} size={20} />
                          </div>
                        )}
                      </div>
                      <div className="grow">
                        <div className="t">{p.name}</div>
                        <div className="s">{p.size} · {money(p.price)} · 
                          {p.stock <= 10 ? (
                            <span style={{ color: p.stock <= 0 ? 'var(--bad)' : 'var(--warn)', fontWeight: 600 }}> Stock: {p.stock} {p.stock <= 5 ? '⚠ Low' : ''}</span>
                          ) : (
                            <span> Stock: {p.stock}</span>
                          )}
                        </div>
                      </div>
                      {(() => {
                        const cartItem = posCart.find(i => i.id === p.id)
                        const qty = cartItem ? cartItem.qty : 0
                        if (qty > 0) return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button className="plus-btn" onClick={e => { e.stopPropagation(); posUpdateQty(p.id, -1) }}>−</button>
                            <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center', color: 'var(--blue)' }}>{qty}</span>
                            <button className="plus-btn" onClick={e => { e.stopPropagation(); posAddItem(p) }} disabled={qty >= p.stock}>+</button>
                          </div>
                        )
                        return <button className="plus-btn" style={{ background: 'var(--blue)', color: '#fff', border: 'none' }} onClick={e => { e.stopPropagation(); posAddItem(p) }}>+</button>
                      })()}
                    </div>
                  ))}
                </div>

                {/* Cart */}
                <div className="drawer-body" style={{ borderTop: '1px solid var(--line)', background: 'var(--tint-2)' }}>
                  {posCart.length === 0 ? (
                    <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>No items — tap a product to add</p>
                  ) : posCart.map(item => (
                    <div key={item.id} className="cart-item">
                      <div style={{ flex: 1 }}>
                        <div className="pname">{item.name}</div>
                        <div className="pmeta">{money(item.price)}</div>
                        <div className="qty">
                          <button onClick={() => posUpdateQty(item.id, -1)}>−</button>
                          <span>{item.qty}</span>
                          <button onClick={() => posUpdateQty(item.id, 1)} disabled={item.qty >= item.stock}>+</button>
                        </div>
                      </div>
                      <div className="price">{money(item.price * item.qty)}</div>
                    </div>
                  ))}
                </div>

                {posCart.length > 0 && (
                  <div className="drawer-foot">
                    {posError && <div className="auth-error" style={{ marginBottom: '10px' }}>{posError}</div>}
                    <div className="row between" style={{ marginBottom: '14px' }}>
                      <span className="muted">Total</span>
                      <b style={{ fontSize: '20px' }}>{money(posCart.reduce((s, i) => s + i.price * i.qty, 0))}</b>
                    </div>
                    {!showPosConfirm ? (
                      <button className="btn btn-primary btn-lg btn-block" onClick={() => setShowPosConfirm(true)}>
                        Complete Sale
                      </button>
                    ) : (
                      <div>
                        <p style={{ textAlign: 'center', fontWeight: 600, marginBottom: '10px' }}>Complete this sale?</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button className="btn btn-outline btn-block" onClick={() => setShowPosConfirm(false)}>Cancel</button>
                          <button className="btn btn-primary btn-block" onClick={handleCompleteSale}>Yes, complete</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">ALLMIGHTY</div>
        <nav>
          <Link className="nav-item" to="/admin"><SvgIcon paths={['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z']} /><span>Overview</span></Link>
          <Link className="nav-item active" to="/admin/orders">
            <SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} />
            <span>Orders</span>
            {newCount > 0 && <em className="nav-badge">{newCount}</em>}
          </Link>
          <Link className="nav-item" to="/admin/products"><SvgIcon paths={['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8l9 5 9-5V8', 'M12 13v8']} /><span>Products</span></Link>
          <Link className="nav-item" to="/admin/riders"><SvgIcon paths={['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8']} /><span>Riders</span></Link>
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
            <div className="eyebrow">Order Management</div>
            <h1>Customer orders</h1>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowPOS(true); setPosSuccess(null); setPosCart([]); setPosError(''); setPosSearch('') }}>
            + Walk-in Order
          </button>
        </div>

        {/* Filter chips */}
        <div className="chips" style={{ marginBottom: '20px' }}>
          {[['active', `Active ${orders.filter(o => ['new','preparing','for_delivery'].includes(o.status)).length}`],
            ['all', 'All'],
            ['completed', 'Completed'],
            ['cancelled', 'Cancelled']
          ].map(([val, label]) => (
            <button key={val} className={`chip ${filter === val ? 'active' : ''}`} onClick={() => setFilter(val)}>{label}</button>
          ))}
        </div>

        {/* Orders */}
        {loading ? <p className="muted">Loading orders...</p> : filtered.length === 0 ? (
          <div className="empty">
            <div className="ring"><SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} size={32} /></div>
            <h3>No orders here</h3>
            <p>Orders will appear here once customers start placing them.</p>
          </div>
        ) : (
          <div className="grid-2">
            {filtered.map(o => (
              <div key={o.id} className="ocard">
                <div className="top">
                  <div>
                    <div className="oid">#AM-{o.id}</div>
                    <div className="ago">{timeAgo(o.created_at)}</div>
                  </div>
                  <span className={`badge ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                </div>

                {/* Customer info */}
                <div className="row" style={{ gap: '12px' }}>
                  <div className="avatar soft" style={{ width: '38px', height: '38px', fontSize: '11px', flexShrink: 0 }}>{initials(o.customer_name)}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{o.customer_name}</div>
                    <div className="small muted">{o.phone}</div>
                    <div className="small muted">{o.address}</div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  {o.items?.slice(0, 2).map((item, i) => (
                    <div key={i} className="row between small" style={{ padding: '2px 0' }}>
                      <span>{item.qty} × {item.name}</span>
                      <span className="muted">{money(item.qty * item.price)}</span>
                    </div>
                  ))}
                  {o.items?.length > 2 && <div className="small muted">+{o.items.length - 2} more items</div>}
                </div>

                <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
                  <span className="small muted">Cash on delivery</span>
                  <b>{money(o.total)}</b>
                </div>

                <button className="btn btn-outline btn-sm btn-block" onClick={() => setShowOrderDetail(o)}>
                  View details {o.proof_photo ? '· Has proof' : ''}
                </button>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {o.status === 'new' && (
                    <>
                      <button className="btn btn-primary btn-block"
                        onClick={() => handleAccept(o.id)}>Accept</button>
                      <button className="btn btn-danger btn-block"
                        onClick={() => handleCancel(o.id)}>Decline</button>
                    </>
                  )}
                  {o.status === 'preparing' && (
                    <button className="btn btn-primary btn-block"
                      onClick={() => { setSelected(o); setSelectedRider(''); setAssignError(''); setShowAssignModal(true) }}>
                      Assign Delivery
                    </button>
                  )}
                  {o.status === 'for_delivery' && (
                    <button className="btn btn-outline btn-block"
                      onClick={() => { setSelected(o); setSelectedRider(o.rider_id || ''); setAssignError(''); setShowAssignModal(true) }}>
                      Reassign rider
                    </button>
                  )}
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
