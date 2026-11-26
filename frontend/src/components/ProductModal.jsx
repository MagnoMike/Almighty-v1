import { useState, useEffect } from 'react'
import { addToCart } from '../utils/cartApi.js'

const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })

export default function ProductModal({ product, onClose, onAdded, onBuyNow, mode = 'cart' }) {
  const [variants, setVariants] = useState([])
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingVariants, setLoadingVariants] = useState(true)

  useEffect(() => {
    fetchVariants()
  }, [product])

  async function fetchVariants() {
    setLoadingVariants(true)
    try {
      const res = await fetch(`http://127.0.0.1:3000/products/${product.id}/variants`)
      const data = await res.json()
      if (data.success) {
        setVariants(data.variants)
        if (data.variants.length > 0) setSelectedVariant(data.variants[0])
      }
    } catch {}
    finally { setLoadingVariants(false) }
  }

  const currentPrice = selectedVariant ? selectedVariant.price : product.price
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock

  async function handleAddToCart() {
    if (variants.length > 0 && !selectedVariant) return setError('Please select a variant.')
    if (qty > currentStock) return setError('Not enough stock.')
    setLoading(true)
    setError('')
    try {
      let items
      for (let i = 0; i < qty; i++) {
        items = await addToCart(product.id, selectedVariant?.id || null)
      }
      onAdded(items)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleBuyNow() {
    if (variants.length > 0 && !selectedVariant) return setError('Please select a variant.')
    if (qty > currentStock) return setError('Not enough stock.')
    // pass item directly to checkout without adding to cart
    const item = {
      id: product.id,
      name: product.name,
      price: currentPrice,
      qty,
      variant_id: selectedVariant?.id || null,
      size: selectedVariant?.size || product.size,
      flavor: selectedVariant?.flavor || null
    }
    onClose()
    if (onBuyNow) onBuyNow(item)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>

        {/* Product image + name */}
        <div className="row" style={{ gap: '14px', marginBottom: '16px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', background: 'var(--tint-2)', flexShrink: 0 }}>
            {product.image ? (
              <img src={`http://127.0.0.1:3000${product.image}`} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>{product.name}</div>
            <div className="small muted">{product.category}</div>
            <div style={{ fontWeight: 700, fontSize: '20px', color: 'var(--blue)', marginTop: '4px' }}>{money(currentPrice)}</div>
          </div>
        </div>

        {/* Variants */}
        {loadingVariants ? (
          <p className="small muted">Loading variants...</p>
        ) : variants.length > 0 ? (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Select variant</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
              {variants.map(v => (
                <button key={v.id}
                  onClick={() => { setSelectedVariant(v); setQty(1); setError('') }}
                  style={{
                    padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    border: `2px solid ${selectedVariant?.id === v.id ? 'var(--blue)' : 'var(--line)'}`,
                    background: selectedVariant?.id === v.id ? 'var(--tint-2)' : '#fff',
                    color: v.stock <= 0 ? 'var(--muted)' : 'inherit',
                    opacity: v.stock <= 0 ? 0.5 : 1
                  }}
                  disabled={v.stock <= 0}
                >
                  {v.size}{v.flavor ? ` · ${v.flavor}` : ''}<br />
                  <span style={{ fontSize: '11px', fontWeight: 400 }}>{money(v.price)} · {v.stock > 0 ? `${v.stock} left` : 'Out of stock'}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '12px' }}>
            <div className="small muted">{product.size} · {currentStock > 0 ? `${currentStock} in stock` : 'Out of stock'}</div>
          </div>
        )}

        {/* Quantity */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Quantity</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="plus-btn" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
            <span style={{ fontWeight: 700, fontSize: '18px', minWidth: '32px', textAlign: 'center' }}>{qty}</span>
            <button className="plus-btn" onClick={() => setQty(q => Math.min(currentStock, q + 1))} disabled={qty >= currentStock}>+</button>
            <span className="small muted">{currentStock} available</span>
          </div>
        </div>

        {/* Total */}
        <div className="row between" style={{ marginBottom: '14px', padding: '10px 14px', background: 'var(--tint-2)', borderRadius: '10px' }}>
          <span className="muted">Total</span>
          <b style={{ fontSize: '18px' }}>{money(currentPrice * qty)}</b>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: '10px' }}>{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          {mode === 'buynow' ? (
            <button className="btn btn-primary" onClick={handleBuyNow} disabled={loading || currentStock <= 0}>
              {loading ? 'Processing...' : 'Buy now'}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleAddToCart} disabled={loading || currentStock <= 0}>
              {loading ? 'Adding...' : 'Add to cart'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
