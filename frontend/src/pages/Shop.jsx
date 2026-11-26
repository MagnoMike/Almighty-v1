import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getCart, addToCart, updateCartQty, clearCart } from '../utils/cartApi.js'
import { LOCATIONS } from '../utils/barangays.js'
import ProductModal from '../components/ProductModal.jsx'

const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })

function SvgIcon({ paths, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

export default function Shop() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(['All'])
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [showProductModal, setShowProductModal] = useState(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [buyNowItem, setBuyNowItem] = useState(null)

  // Checkout form
  const [phone, setPhone] = useState('')
  const [selectedMunicipality, setSelectedMunicipality] = useState('')
  const [barangay, setBarangay] = useState('')
  const [street, setStreet] = useState('')
  const [notes, setNotes] = useState('')
  const [CheckoutError, setCheckoutError] = useState('')
  const [CheckoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    // clear old localStorage cart
    localStorage.removeItem('cart')
    fetchProducts()
    fetchCategories()
    fetchCart()
  }, [])

  async function fetchCart() {
    try {
      const items = await getCart()
      setCart(items)
    } catch {}
  }

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:3000/products')
      const data = await res.json()
      if (data.success) setProducts(data.products)
    } catch {
      showToast('Failed to load products', true)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch('http://127.0.0.1:3000/products/categories')
      const data = await res.json()
      if (data.success) setCategories(['All', ...data.categories])
    } catch {}
  }

  const filtered = products.filter(p =>
    (category === 'All' || p.category === category) &&
    (!search || (p.name + ' ' + p.category).toLowerCase().includes(search.toLowerCase()))
  )

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)

  async function handleAddToCart(product) {
    try {
      const items = await addToCart(product.id)
      setCart(items)
      showToast('Added to cart')
    } catch (e) {
      showToast(e.message, true)
    }
  }

  async function handleUpdateQty(productId, qty, variantId = null) {
    try {
      const items = await updateCartQty(productId, qty, variantId)
      setCart(items)
    } catch (e) {
      showToast(e.message, true)
    }
  }

  function showToast(msg, isErr) {
    setToast({ msg, isErr })
    setTimeout(() => setToast(''), 2500)
  }

  async function openCheckout() {
    setBuyNowItem(null) // reset buy now item when opening cart checkout
    setCheckoutError('')
    try {
      const token = localStorage.getItem('token')
      // refresh cart from DB first
      const freshCart = await getCart()
      setCart(freshCart)

      const res = await fetch('http://127.0.0.1:3000/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success && data.user) {
        setPhone(data.user.phone || '')
        setStreet(data.user.address || '')
      }
    } catch {}
    setShowCart(false)
    setShowCheckout(true)
  }

  async function handleCheckout(e) {
    e.preventDefault()
    setCheckoutError('')
    if (!phone) return setCheckoutError('No contact number found. Please update your profile first.')
    if (!street) return setCheckoutError('No delivery address found. Please update your profile first.')

    setCheckoutLoading(true)
    try {
      const token = localStorage.getItem('token')
      const items = buyNowItem
        ? [{ id: buyNowItem.id, name: buyNowItem.name, price: buyNowItem.price, qty: buyNowItem.qty, variant_id: buyNowItem.variant_id || null }]
        : cart.map(i => ({ id: i.product_id, name: i.name, price: i.price, qty: i.qty, variant_id: i.variant_id || null }))
      const res = await fetch('http://127.0.0.1:3000/orders/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ phone, address: street, notes, items })
      })
      const data = await res.json()
      if (!res.ok) return setCheckoutError(data.error || 'Failed to place order.')
      if (!buyNowItem) await clearCart()
      setCart([])
      setBuyNowItem(null)
      setShowCheckout(false)
      setShowCart(false)
      setOrderSuccess(data.orderId)
      setPhone(''); setStreet(''); setNotes('')
    } catch {
      setCheckoutError('Unable to connect to server.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  async function buyNow(product) {
    try {
      const items = await addToCart(product.id)
      setCart(items)
      await openCheckout()
    } catch (e) {
      showToast(e.message, true)
    }
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

      {/* Cart Drawer */}
      {showCart && (
        <div className="overlay drawer-wrap" onClick={() => setShowCart(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-head">
              <h2>Your cart</h2>
              <button className="icon-btn" onClick={() => setShowCart(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>
            <div className="drawer-body">
              {cart.length === 0 ? (
                <div className="empty">
                  <div className="ring">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>
                  </div>
                  <h3>Your cart is empty</h3>
                  <p>Add a few essentials and they'll show up here.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="cart-item">
                    <div className="th">
                      <div className="pimg">
                        {item.image ? <img src={`http://127.0.0.1:3000${item.image}`} alt={item.name} /> : null}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="pname">{item.name}</div>
                      <div className="pmeta">{item.display || item.size} · {money(item.price)}</div>
                      <div className="qty">
                        <button onClick={() => handleUpdateQty(item.product_id, item.qty - 1, item.variant_id)}>−</button>
                        <span>{item.qty}</span>
                        <button onClick={() => handleUpdateQty(item.product_id, item.qty + 1, item.variant_id)} disabled={item.qty >= item.stock}>+</button>
                      </div>
                    </div>
                    <div className="price">{money(item.price * item.qty)}</div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="drawer-foot">
                <div className="row between" style={{ marginBottom: '14px' }}>
                  <span className="muted">Total</span>
                  <b style={{ fontSize: '20px' }}>{money(cartTotal)}</b>
                </div>
                <button className="btn btn-primary btn-lg btn-block" onClick={openCheckout}>
                  Checkout
                </button>
                <button className="btn btn-danger btn-block" style={{ marginTop: '8px' }} onClick={async () => { await clearCart(); setCart([]) }}>
                  Clear cart
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="overlay" onClick={() => setShowCheckout(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>Checkout</h2>
            <p className="sub">Delivering to your saved address.</p>
            <form onSubmit={handleCheckout} noValidate>
              {CheckoutError && <div className="auth-error">{CheckoutError}</div>}
              <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'var(--tint-2)', borderRadius: '12px' }}>
                {buyNowItem ? (
                  <div className="row between small" style={{ padding: '3px 0' }}>
                    <span>{buyNowItem.qty} × {buyNowItem.name}
                      {(buyNowItem.size || buyNowItem.flavor) && (
                        <span className="muted"> ({[buyNowItem.size, buyNowItem.flavor].filter(Boolean).join(' · ')})</span>
                      )}
                    </span>
                    <span className="muted">{money(buyNowItem.price * buyNowItem.qty)}</span>
                  </div>
                ) : cart.map(item => (
                  <div key={item.product_id} className="row between small" style={{ padding: '3px 0' }}>
                    <span>{item.qty} × {item.name}
                      {item.display && (
                        <span className="muted"> ({item.display})</span>
                      )}
                    </span>
                    <span className="muted">{money(item.price * item.qty)}</span>
                  </div>
                ))}
                <div className="row between" style={{ marginTop: '8px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                  <b>Total</b>
                  <b style={{ fontSize: '18px' }}>{money(
                    buyNowItem
                      ? buyNowItem.price * buyNowItem.qty
                      : cart.reduce((s, i) => s + Number(i.price) * i.qty, 0)
                  )}</b>
                </div>
              </div>
              <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '12px 16px', marginBottom: '12px' }}>
                <div className="row between" style={{ marginBottom: '6px' }}>
                  <span className="small muted">Delivery details</span>
                  <Link to="/profile" className="link" style={{ fontSize: '12px' }} onClick={() => setShowCheckout(false)}>Edit in profile</Link>
                </div>
                <div className="kv"><span>Phone</span><span>{phone || <span className="muted">Not set</span>}</span></div>
                <div className="kv"><span>Address</span><span>{street || <span className="muted">Not set</span>}</span></div>
              </div>
              <div className="field">
                <label>Note for rider <span className="muted">(optional)</span></label>
                <input placeholder="e.g. Blue gate, call when outside" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="pay-opt" style={{ marginBottom: '14px' }}>
                <div style={{ flex: 1 }}><div className="t">Cash on delivery</div><div className="s">Pay the rider when your order arrives</div></div>
                <span>✓</span>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCheckout(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={CheckoutLoading}>
                  {CheckoutLoading ? 'Placing...' : 'Place order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Success Modal */}
      {orderSuccess && (
        <div className="overlay">
          <div className="modal" role="dialog" style={{ textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--ok-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
            </div>
            <h2 style={{ marginBottom: '8px' }}>Order placed!</h2>
            <p className="sub" style={{ marginBottom: '24px' }}>Order #{orderSuccess} has been placed. The store will confirm it shortly.</p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => { setOrderSuccess(null); navigate('/orders') }}>View orders</button>
              <button className="btn btn-primary" onClick={() => setOrderSuccess(null)}>Continue shopping</button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={showProductModal.product}
          mode={showProductModal.mode}
          onClose={() => setShowProductModal(null)}
          onAdded={(items) => { setCart(items); showToast('Added to cart') }}
          onBuyNow={(item) => { setBuyNowItem(item); setShowProductModal(null); setShowCheckout(true) }}
        />
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">ALLMIGHTY</div>
        <nav>
          <Link className="nav-item" to="/shop"><SvgIcon paths={['M3 11l9-8 9 8', 'M5 10v10h5v-6h4v6h5V10']} /> <span>Home</span></Link>
          <Link className="nav-item active" to="/shop/catalog"><SvgIcon paths={['M5 8h14l-1 12H6L5 8z', 'M9 8V6a3 3 0 016 0v2']} /> <span>Shop</span></Link>
          <Link className="nav-item" to="/orders"><SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} /> <span>Orders</span></Link>
          <Link className="nav-item" to="/profile"><SvgIcon paths={['M12 8a4 4 0 100 8 4 4 0 000-8z', 'M4 21c1-4 4-6 8-6s7 2 8 6']} /> <span>Profile</span></Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-brand">ALLMIGHTY</div>
          <button className="btn btn-ghost" onClick={() => setShowLogoutModal(true)}>Log out</button>
          <button className="icon-btn" onClick={() => setShowCart(true)} style={{ position: 'relative' }}>
            <SvgIcon paths={['M5 8h14l-1 12H6L5 8z', 'M9 8V6a3 3 0 016 0v2']} />
            {cartCount > 0 && <span className="count">{cartCount}</span>}
          </button>
        </header>

        <div className="head">
          <div>
            <div className="eyebrow">Mighty essentials</div>
            <h1>Shop all</h1>
          </div>
        </div>

        {/* Search */}
        <div className="search">
          <SvgIcon paths={['M11 4a7 7 0 100 14A7 7 0 0011 4z', 'M20 20l-4-4']} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="What are you looking for?" />
        </div>

        {/* Categories */}
        <div className="chips" style={{ marginBottom: '20px' }}>
          {categories.map(c => (
            <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>

        {/* Products */}
        {loading ? (
          <p className="muted">Loading products...</p>
        ) : (
          <>
            <div className="small muted" style={{ margin: '16px 0' }}>{filtered.length} product{filtered.length !== 1 ? 's' : ''} available</div>
            {filtered.length > 0 ? (
              <div className="products">
                {filtered.map(p => (
                  <article key={p.id} className="pcard">
                    <div className="pimg">
                      {p.image ? (
                        <img src={`http://127.0.0.1:3000${p.image}`} alt={p.name} />
                      ) : null}
                      {p.stock <= 0 && <div className="sold">Sold out</div>}
                    </div>
                    <div className="pmeta">
                      {p.category} · {p.size}
                      {p.stock > 0 && p.stock <= 10 && <b style={{ color: 'var(--warn)' }}> · {p.stock} left</b>}
                    </div>
                    <div className="pname">{p.name}</div>
                    <div className="pfoot">
                      <span className="price">{money(p.price)}</span>
                      {p.stock <= 0 ? (
                        <span className="small muted">Out of stock</span>
                      ) : (
                        <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '32px', fontSize: '12px' }} onClick={() => setShowProductModal({ product: p, mode: 'cart' })}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>
                          </svg>
                          Add to cart
                        </button>
                      )}
                    </div>
                    {p.stock > 0 && (
                      <button className="btn btn-primary btn-block btn-sm" style={{ marginTop: '6px', height: '32px', fontSize: '12px', borderRadius: '10px' }} onClick={() => setShowProductModal({ product: p, mode: 'buynow' })}>Buy now</button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">
                <div className="ring">🔍</div>
                <h3>Nothing found</h3>
                <p>Try a different word or category.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Toast */}
      {toast && <div className={`toast${toast.isErr ? ' err' : ''}`}>{toast.msg}</div>}
    </div>
  )
}
