import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })

function SvgIcon({ paths, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

export default function AdminProducts() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'Admin'
  const [newOrdersCount, setNewOrdersCount] = useState(0)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState('')
  const [formError, setFormError] = useState('')

  // form state
  const [fname, setFname] = useState('')
  const [fcategory, setFcategory] = useState('')
  const [fsize, setFsize] = useState('')
  const [fpackaging, setFpackaging] = useState('per piece')
  const [funitcost, setFunitcost] = useState('')
  const [fprice, setFprice] = useState('')
  const [fstock, setFstock] = useState('')
  const [freorder, setFreorder] = useState('10')
  const [fdesc, setFdesc] = useState('')
  const [fimage, setFimage] = useState(null)
  const [factive, setFactive] = useState(true)
  const [fstockQty, setFstockQty] = useState('')

  // variants state
  const [showVariantsModal, setShowVariantsModal] = useState(false)
  const [variantProduct, setVariantProduct] = useState(null)
  const [variants, setVariants] = useState([])
  const [vsize, setVsize] = useState('')
  const [vflavor, setVflavor] = useState('')
  const [vprice, setVprice] = useState('')
  const [vstock, setVstock] = useState('')
  const [variantError, setVariantError] = useState('')

  useEffect(() => {
    fetchProducts()
    // fetch new orders count for badge
    const token = localStorage.getItem('token')
    fetch('http://127.0.0.1:3000/orders/all', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setNewOrdersCount(d.orders.filter(o => o.status === 'new').length) })
      .catch(() => {})
  }, [])

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:3000/products')
      const data = await res.json()
      if (data.success) setProducts(data.products)
    } catch {}
    finally { setLoading(false) }
  }

  function openAdd() {
    setFname(''); setFcategory(''); setFsize(''); setFpackaging('per piece')
    setFunitcost(''); setFprice(''); setFstock('0'); setFreorder('10'); setFdesc(''); setFimage(null); setFactive(true)
    setFormError(''); setShowAddModal(true)
  }

  function openEdit(p) {
    setSelected(p)
    setFname(p.name); setFcategory(p.category); setFsize(p.size)
    setFpackaging(p.packaging || 'per piece'); setFunitcost(p.unit_cost || '')
    setFprice(p.price); setFstock(p.stock); setFreorder(p.reorder_level || '10')
    setFdesc(p.description || ''); setFimage(null); setFactive(p.active === 1)
    setFormError(''); setShowEditModal(true)
  }

  function openStock(p) {
    setSelected(p); setFstockQty(''); setFormError(''); setShowStockModal(true)
  }

  function openDelete(p) {
    setSelected(p); setShowDeleteModal(true)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!fname || !fcategory || !fsize || !fprice) return setFormError('All fields are required.')
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('name', fname)
      formData.append('category', fcategory)
      formData.append('size', fsize)
      formData.append('packaging', fpackaging)
      formData.append('unit_cost', Number(funitcost))
      formData.append('price', Number(fprice))
      formData.append('stock', Number(fstock))
      formData.append('active', factive ? 1 : 0)
      if (fimage) formData.append('image', fimage)

      const res = await fetch('http://127.0.0.1:3000/products', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) return setFormError(data.error || 'Failed to add product.')
      setShowAddModal(false)
      showToast('Product added! Add variants below.')
      await fetchProducts()
      // auto-open variants modal for new product
      const newProduct = { id: data.id, name: fname }
      openVariants(newProduct)
    } catch { setFormError('Unable to connect to server.') }
  }

  async function handleEdit(e) {
    e.preventDefault()
    if (!fname || !fcategory || !fsize || !fprice) return setFormError('All fields are required.')
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('name', fname)
      formData.append('category', fcategory)
      formData.append('size', fsize)
      formData.append('packaging', fpackaging)
      formData.append('unit_cost', Number(funitcost))
      formData.append('price', Number(fprice))
      formData.append('stock', Number(fstock))
      formData.append('active', factive ? 1 : 0)
      if (fimage) formData.append('image', fimage)

      const res = await fetch(`http://127.0.0.1:3000/products/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) return setFormError(data.error || 'Failed to update product.')
      setShowEditModal(false)
      showToast('Product updated!')
      fetchProducts()
    } catch { setFormError('Unable to connect to server.') }
  }

  async function handleStockIn(e) {
    e.preventDefault()
    if (!fstockQty || Number(fstockQty) <= 0) return setFormError('Enter a valid quantity.')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://127.0.0.1:3000/products/${selected.id}/stock-in`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ qty: Number(fstockQty) })
      })
      const data = await res.json()
      if (!res.ok) return setFormError(data.error || 'Failed to update stock.')
      setShowStockModal(false)
      showToast('Stock updated!')
      fetchProducts()
    } catch { setFormError('Unable to connect to server.') }
  }

  async function openVariants(p) {
    setVariantProduct(p)
    setVsize(''); setVflavor(''); setVprice(''); setVstock(''); setVariantError('')
    setVariants([])
    setShowVariantsModal(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://127.0.0.1:3000/products/${p.id}/variants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setVariants(data.variants)
    } catch {}
  }

  async function handleAddVariant(e) {
    e.preventDefault()
    if (!vsize || !vprice) return setVariantError('Size and price are required.')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://127.0.0.1:3000/products/${variantProduct.id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ size: vsize, flavor: vflavor, price: Number(vprice), stock: Number(vstock) || 0 })
      })
      const data = await res.json()
      if (!res.ok) return setVariantError(data.error || 'Failed to add variant.')
      setVsize(''); setVflavor(''); setVprice(''); setVstock(''); setVariantError('')
      openVariants(variantProduct)
      showToast('Variant added!')
    } catch { setVariantError('Unable to connect.') }
  }

  async function handleDeleteVariant(variantId) {
    try {
      const token = localStorage.getItem('token')
      await fetch(`http://127.0.0.1:3000/products/${variantProduct.id}/variants/${variantId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      openVariants(variantProduct)
      showToast('Variant deleted.')
    } catch { showToast('Failed.', true) }
  }

  async function handleDelete() {
    try {
      const token = localStorage.getItem('token')
      await fetch(`http://127.0.0.1:3000/products/${selected.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setShowDeleteModal(false)
      showToast('Product deleted.')
      fetchProducts()
    } catch { showToast('Failed to delete.', true) }
  }

  function showToast(msg, isErr) {
    setToast({ msg, isErr })
    setTimeout(() => setToast(''), 2500)
  }

  function logout() { localStorage.clear(); navigate('/login') }

  const filtered = products.filter(p => {
    const matchSearch = !search || (p.name + ' ' + p.category).toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' 
      || (filter === 'low' && p.stock <= 10 && p.stock > 0) 
      || (filter === 'out' && p.stock <= 0) 
      || (filter === 'active' && p.active === 1)
      || (filter === 'retail' && p.packaging === 'per piece')
      || (filter === 'wholesale' && p.packaging === 'kahon-kahon')
    return matchSearch && matchFilter
  }).sort((a, b) => {
    // low stock first when filter is 'all'
    if (filter === 'all') {
      const aLow = a.stock <= 10 ? 0 : 1
      const bLow = b.stock <= 10 ? 0 : 1
      return aLow - bLow
    }
    return 0
  })

  const profit = (Number(fprice) - Number(funitcost)).toFixed(2)
  const margin = Number(fprice) > 0 ? ((Number(fprice) - Number(funitcost)) / Number(fprice) * 100).toFixed(1) : '0.0'

  const formFields = (
    <>
      {formError && <div className="auth-error">{formError}</div>}

        {/* Product Photo */}
        <div className="field">
          <label>Product Photo</label>
          <div style={{
            border: '1.5px dashed #ccc', borderRadius: '12px', padding: '20px',
            textAlign: 'center', cursor: 'pointer', background: '#fafafa',
            transition: 'border-color .15s'
          }}
            onClick={() => document.getElementById('fimage-input').click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setFimage(e.dataTransfer.files[0]) }}
          >
            {fimage ? (
              <div>
                <img src={URL.createObjectURL(fimage)} alt="preview"
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{fimage.name}</div>
                <button type="button" className="btn btn-danger btn-sm" style={{ marginTop: '8px' }}
                  onClick={e => { e.stopPropagation(); setFimage(null) }}>Remove</button>
              </div>
            ) : selected?.image ? (
              <div>
                <img src={`http://127.0.0.1:3000${selected.image}`} alt="current"
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Current photo — click to replace</div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                </div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Click to upload photo</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>JPG, PNG, WEBP · Max 5MB</div>
              </div>
            )}
          </div>
          <input id="fimage-input" type="file" accept="image/jpeg,image/png,image/webp"
            onChange={e => setFimage(e.target.files[0])} style={{ display: 'none' }} />
        </div>

        <div className="field">
          <label>Product Name</label>
          <input value={fname} onChange={e => setFname(e.target.value)} placeholder="e.g. Fresh Lavender Liquid Detergent" />
        </div>
        <div className="field">
          <label>Category</label>
          <input
            list="category-options"
            value={fcategory}
            onChange={e => setFcategory(e.target.value)}
            placeholder="e.g. Laundry"
          />
          <datalist id="category-options">
            <option value="Laundry" />
            <option value="Kitchen" />
            <option value="Home Care" />
          </datalist>
        </div>
        <div className="field">
          <label>Packaging Unit / Size</label>
          <input
            list="packaging-options"
            value={fsize}
            onChange={e => {
              setFsize(e.target.value)
              const val = e.target.value.toLowerCase()
              const isWholesale = val.includes('sako') || val.includes('kahon') || val.includes('bulk')
              setFpackaging(isWholesale ? 'kahon-kahon' : 'per piece')
            }}
            placeholder="e.g. Bottle (1L) or type custom size"
          />
          <datalist id="packaging-options">
            <option value="Sachet" />
            <option value="Pack (100g)" />
            <option value="Pack (500g)" />
            <option value="Pack (1kg)" />
            <option value="Bottle (250ml)" />
            <option value="Bottle (500ml)" />
            <option value="Bottle (1L)" />
            <option value="Bottle (2L)" />
            <option value="Gallon (1 gal)" />
            <option value="Gallon (5 gal)" />
            <option value="Sako (25kg)" />
            <option value="Sako (50kg)" />
            <option value="Kahon (12 pcs)" />
            <option value="Kahon (24 pcs)" />
            <option value="Kahon (48 pcs)" />
            <option value="Bulk (20L)" />
            <option value="Bulk (200L)" />
          </datalist>
        </div>
        <div className="form-2">
          <div className="field">
            <label>Unit Cost ₱ <span className="muted">(Supplier cost)</span></label>
            <input type="number" value={funitcost} onChange={e => setFunitcost(e.target.value)} placeholder="0" min="0" step="1" />
          </div>
          <div className="field">
            <label>Selling Price ₱ <span className="muted">(Customer price)</span></label>
            <input type="number" value={fprice} onChange={e => setFprice(e.target.value)} placeholder="0" min="0" step="1" />
          </div>
        </div>
        {(Number(fprice) > 0 || Number(funitcost) > 0) && (
          <div style={{ background: 'var(--tint-2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="small muted">Gross Profit / Unit</div>
              <div style={{ fontWeight: 700, color: Number(profit) >= 0 ? 'var(--ok)' : 'var(--bad)' }}>₱{profit}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="small muted">Gross Margin %</div>
              <div style={{ fontWeight: 700, color: Number(margin) >= 0 ? 'var(--ok)' : 'var(--bad)' }}>{margin}%</div>
            </div>
          </div>
        )}
        <div className="form-2">
          <div className="field">
            <label>Initial Stock Quantity</label>
            <input type="number" value={fstock} onChange={e => setFstock(e.target.value)} placeholder="0" min="0" />
          </div>
          <div className="field">
            <label>Reorder Alert Level</label>
            <input type="number" value={freorder} onChange={e => setFreorder(e.target.value)} placeholder="10" min="0" />
          </div>
        </div>
        <div className="field">
          <label>Product Description / Usage Notes <span className="muted">(Optional)</span></label>
          <textarea value={fdesc} onChange={e => setFdesc(e.target.value)}
            placeholder="Directions, ingredients, fragrance notes..."
            style={{ width: '100%', height: '80px', borderRadius: '12px', padding: '10px 16px', fontSize: '14px', border: '1px solid #ccc', resize: 'none', fontFamily: 'inherit' }} />
        </div>
        <label className="check" style={{ marginBottom: '6px' }}>
          <input type="checkbox" checked={factive} onChange={e => setFactive(e.target.checked)} />
          <span>Show in Customer Shop &amp; POS Catalog</span>
        </label>
    </>
  )

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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Add new product</h2>
            <form onSubmit={handleAdd} noValidate>
              {formFields}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Edit product</h2>
            <form onSubmit={handleEdit} noValidate>
              {formFields}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock In Modal */}
      {showStockModal && (
        <div className="overlay" onClick={() => setShowStockModal(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Stock in</h2>
            <p className="sub">{selected?.name} — Current stock: <b>{selected?.stock}</b></p>
            <form onSubmit={handleStockIn} noValidate>
              {formError && <div className="auth-error">{formError}</div>}
              <div className="field">
                <label>Quantity to add</label>
                <input type="number" value={fstockQty} onChange={e => setFstockQty(e.target.value)} placeholder="0" min="1" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowStockModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variants Modal */}
      {showVariantsModal && variantProduct && (
        <div className="overlay" onClick={() => setShowVariantsModal(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="row between" style={{ marginBottom: '16px' }}>
              <div>
                <h2>Variants</h2>
                <p className="sub">{variantProduct.name}</p>
              </div>
              <button className="icon-btn" onClick={() => setShowVariantsModal(false)}>
                <SvgIcon paths={['M6 6l12 12M18 6L6 18']} />
              </button>
            </div>

            {/* Existing variants */}
            {variants.length === 0 ? (
              <p className="muted" style={{ marginBottom: '16px' }}>No variants yet. Add one below.</p>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                {variants.map(v => (
                  <div key={v.id} className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{v.size}</span>
                      {v.flavor && <span className="small muted"> · {v.flavor}</span>}
                      <span className="small muted"> · Stock: {v.stock}</span>
                    </div>
                    <div className="row" style={{ gap: '8px' }}>
                      <span style={{ fontWeight: 600 }}>₱{v.price}</span>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteVariant(v.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add variant form */}
            <div style={{ background: 'var(--tint-2)', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Add variant</h3>
              {variantError && <div className="auth-error" style={{ marginBottom: '10px' }}>{variantError}</div>}
              <form onSubmit={handleAddVariant} noValidate>
                <div className="form-2">
                  <div className="field">
                    <label>Size / Packaging</label>
                    <input list="variant-sizes" value={vsize} onChange={e => setVsize(e.target.value)} placeholder="e.g. Bottle (1L)" />
                    <datalist id="variant-sizes">
                      <option value="Sachet" /><option value="Pack (100g)" /><option value="Pack (500g)" />
                      <option value="Pack (1kg)" /><option value="Bottle (250ml)" /><option value="Bottle (500ml)" />
                      <option value="Bottle (1L)" /><option value="Bottle (2L)" /><option value="Gallon (1 gal)" />
                      <option value="Sako (25kg)" /><option value="Kahon (12 pcs)" /><option value="Kahon (24 pcs)" />
                    </datalist>
                  </div>
                  <div className="field">
                    <label>Flavor / Scent <span className="muted">(optional)</span></label>
                    <input value={vflavor} onChange={e => setVflavor(e.target.value)} placeholder="e.g. Lemon, Lavender" />
                  </div>
                  <div className="field">
                    <label>Price ₱</label>
                    <input type="number" value={vprice} onChange={e => setVprice(e.target.value)} placeholder="0" min="0" />
                  </div>
                  <div className="field">
                    <label>Stock</label>
                    <input type="number" value={vstock} onChange={e => setVstock(e.target.value)} placeholder="0" min="0" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '8px' }}>Add variant</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Delete product</h2>
            <p className="sub">Are you sure you want to delete <b>{selected?.name}</b>? This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">ALLMIGHTY</div>
        <nav>
          <Link className="nav-item" to="/admin"><SvgIcon paths={['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z']} /><span>Overview</span></Link>
          <Link className="nav-item" to="/admin/orders"><SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} /><span>Orders</span>{newOrdersCount > 0 && <em className="nav-badge">{newOrdersCount}</em>}</Link>
          <Link className="nav-item active" to="/admin/products"><SvgIcon paths={['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8l9 5 9-5V8', 'M12 13v8']} /><span>Products</span></Link>
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
            <div className="eyebrow">Inventory</div>
            <h1>Products</h1>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <button className="btn btn-primary" onClick={openAdd}>+ Add New Product</button>
        </div>

        {/* Stats */}
        <div className="grid-stat" style={{ marginBottom: '20px' }}>
          <div className="card" style={{ cursor: 'pointer' }} onClick={() => setFilter('all')}>
            <div className="eyebrow">Total Products</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{products.length}</div>
          </div>
          <div className="card" style={{ cursor: 'pointer' }} onClick={() => setFilter('low')}>
            <div className="eyebrow">Low / Out of Stock</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--warn)' }}>{products.filter(p => p.stock <= 10).length}</div>
          </div>
          <div className="card" style={{ cursor: 'pointer' }} onClick={() => setFilter('active')}>
            <div className="eyebrow">Active Products</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--ok)' }}>{products.filter(p => p.active === 1).length}</div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="search" style={{ marginBottom: '12px' }}>
          <SvgIcon paths={['M11 4a7 7 0 100 14A7 7 0 0011 4z', 'M20 20l-4-4']} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product name or category..." />
        </div>
        <div className="chips" style={{ marginBottom: '20px' }}>
          {[['all', 'All'], ['active', 'Active'], ['low', 'Low Stock'], ['out', 'Out of Stock'], ['retail', 'Retail / Per piece'], ['wholesale', 'Wholesale / Bulk']].map(([val, label]) => (
            <button key={val} className={`chip ${filter === val ? 'active' : ''}`} onClick={() => setFilter(val)}>{label}</button>
          ))}
        </div>

        {/* Product List */}
        {loading ? <p className="muted">Loading products...</p> : (
          <>
            {/* Desktop Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'none' }} className="desktop-table">
            </div>

            {/* Cards */}
            <div className="stack">
              {filtered.length === 0 ? (
                <p className="muted">No products found.</p>
              ) : filtered.map(p => (
                <div key={p.id} className="card">
                  <div className="row between" style={{ marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>{p.name}</div>
                      <div className="small muted">{p.category} · {p.size} · {p.packaging === 'kahon-kahon' ? 'Kahon-kahon' : 'Per piece'}</div>
                    </div>
                    <span className={`badge ${p.active === 1 ? 'b-ok' : 'b-cancelled'}`}>{p.active === 1 ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="row between" style={{ marginBottom: '12px' }}>
                    <div>
                      <div className="small muted">Unit Cost</div>
                      <div style={{ fontWeight: 600 }}>{money(p.unit_cost)}</div>
                    </div>
                    <div>
                      <div className="small muted">Selling Price</div>
                      <div style={{ fontWeight: 600 }}>{money(p.price)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="small muted">Stock</div>
                      <div style={{ fontWeight: 600, color: p.stock <= 0 ? 'var(--bad)' : p.stock <= 10 ? 'var(--warn)' : 'inherit' }}>
                        {p.stock}{p.stock <= 10 && p.stock > 0 ? ' ⚠' : p.stock <= 0 ? ' ✕' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openStock(p)}>+ Stock In</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openVariants(p)}>Variants</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => openDelete(p)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {toast && <div className={`toast${toast.isErr ? ' err' : ''}`}>{toast.msg}</div>}
    </div>
  )
}
///admin/products.jsx