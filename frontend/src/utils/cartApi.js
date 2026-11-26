const BASE = 'http://127.0.0.1:3000'

function headers() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
}

export async function getCart() {
    const res = await fetch(`${BASE}/cart`, { headers: headers() })
    const data = await res.json()
    return data.items || []
}

export async function addToCart(productId, variantId = null) {
    const res = await fetch(`${BASE}/cart/add`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ productId: Number(productId), variantId: variantId ? Number(variantId) : null })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to add to cart.')
    return data.items || []
}

export async function updateCartQty(productId, qty, variantId = null) {
    const res = await fetch(`${BASE}/cart/qty`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ productId: Number(productId), qty, variantId: variantId ? Number(variantId) : null })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to update cart.')
    return data.items || []
}

export async function clearCart() {
    await fetch(`${BASE}/cart/clear`, { method: 'DELETE', headers: headers() })
}
