import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

function SvgIcon({ paths, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

export default function AdminReports() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'Admin'
  const [tab, setTab] = useState('summary')
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState(null)
  const [daily, setDaily] = useState([])
  const [bestSelling, setBestSelling] = useState([])
  const [forecast, setForecast] = useState([])
  const [payrollReport, setPayrollReport] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [newOrdersCount, setNewOrdersCount] = useState(0)

  useEffect(() => {
    fetchAll()
    fetchNewOrders()
  }, [from, to])

  async function fetchAll() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { 'Authorization': `Bearer ${token}` }

      const [sumRes, bestRes, forecastRes, payrollRes] = await Promise.all([
        fetch(`http://127.0.0.1:3000/reports/summary?from=${from}&to=${to}`, { headers }),
        fetch(`http://127.0.0.1:3000/reports/best-selling?from=${from}&to=${to}`, { headers }),
        fetch(`http://127.0.0.1:3000/reports/forecast`, { headers }),
        fetch(`http://127.0.0.1:3000/reports/payroll?from=${from}&to=${to}`, { headers })
      ])

      const sumData = await sumRes.json()
      const bestData = await bestRes.json()
      const forecastData = await forecastRes.json()
      const payrollData = await payrollRes.json()

      if (sumData.success) { setSummary(sumData.summary); setDaily(sumData.daily) }
      if (bestData.success) setBestSelling(bestData.products)
      if (forecastData.success) setForecast(forecastData.forecast)
      if (payrollData.success) setPayrollReport(payrollData.payroll)
    } catch {}
    finally { setLoading(false) }
  }

  async function fetchNewOrders() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/orders/all', { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setNewOrdersCount(data.orders.filter(o => o.status === 'new').length)
    } catch {}
  }

  function logout() { localStorage.clear(); navigate('/login') }

  function printReport() {
    const tabNames = { summary: 'P&L Summary', daily: 'Daily Breakdown', best: 'Best Selling', forecast: 'Demand Forecast', payroll: 'Payroll Report' }
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html><head><title>Allmighty - ${tabNames[tab]}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #000; }
        .header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; border-bottom: 2px solid #0679bf; padding-bottom: 16px; }
        .header img { width: 60px; height: 60px; object-fit: contain; }
        .header-text h1 { font-size: 22px; margin: 0; color: #0679bf; }
        .header-text p { font-size: 12px; color: #666; margin: 2px 0 0; }
        .sub { font-size: 13px; color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #f5f5f5; padding: 8px 12px; text-align: left; border-bottom: 2px solid #ddd; }
        td { padding: 8px 12px; border-bottom: 1px solid #eee; }
        .total { font-weight: bold; background: #f9f9f9; }
        .right { text-align: right; }
        .summary-box { display: inline-block; border: 1px solid #ddd; border-radius: 8px; padding: 12px 20px; margin: 0 8px 16px 0; min-width: 160px; }
        .summary-box .label { font-size: 11px; color: #666; text-transform: uppercase; }
        .summary-box .value { font-size: 20px; font-weight: bold; margin-top: 4px; }
        .footer { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
      </style></head><body>
      <div class="header">
        <img src="${window.location.origin}/images/products/logo.png" alt="Allmighty Logo" />
        <div class="header-text">
          <h1>ALLMIGHTY</h1>
          <p>Business Operations and Management System</p>
          <p>Balayan, Batangas</p>
        </div>
      </div>
      <div class="sub"><b>${tabNames[tab]}</b> · ${from} to ${to} · Printed ${new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
      ${getPrintContent()}
      <div class="footer">Generated by Allmighty Business Operations and Management System · ${new Date().getFullYear()}</div>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  function getPrintContent() {
    if (tab === 'summary' && summary) {
      return `
        <div>
          <div class="summary-box"><div class="label">Gross Sales</div><div class="value">${money(summary.grossSales)}</div></div>
          <div class="summary-box"><div class="label">Product Cost</div><div class="value">${money(summary.totalCost)}</div></div>
          <div class="summary-box"><div class="label">Net Profit</div><div class="value">${money(summary.netProfit)}</div></div>
          <div class="summary-box"><div class="label">Total Orders</div><div class="value">${summary.totalOrders}</div></div>
        </div>
      `
    } else if (tab === 'daily') {
      return `<table><thead><tr><th>Date</th><th class="right">Orders</th><th class="right">Sales</th></tr></thead><tbody>
        ${daily.map(d => `<tr><td>${new Date(d.date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}</td><td class="right">${d.orders}</td><td class="right">${money(d.sales)}</td></tr>`).join('')}
        <tr class="total"><td>Total</td><td class="right">${daily.reduce((s, d) => s + Number(d.orders), 0)}</td><td class="right">${money(daily.reduce((s, d) => s + Number(d.sales), 0))}</td></tr>
      </tbody></table>`
    } else if (tab === 'best') {
      return `<table><thead><tr><th>#</th><th>Product</th><th class="right">Qty Sold</th><th class="right">Revenue</th></tr></thead><tbody>
        ${bestSelling.map((p, i) => `<tr><td>#${i + 1}</td><td>${p.name}</td><td class="right">${p.totalQty}</td><td class="right">${money(p.totalRevenue)}</td></tr>`).join('')}
      </tbody></table>`
    } else if (tab === 'forecast') {
      return `<table><thead><tr><th>Product</th><th class="right">Avg/Day</th><th class="right">7-Day Forecast</th><th class="right">Stock</th><th>Status</th></tr></thead><tbody>
        ${forecast.map(f => `<tr><td>${f.name}</td><td class="right">${f.avgPerDay}</td><td class="right">${f.forecast7Days}</td><td class="right">${f.stock}</td><td>${f.needsRestock ? 'Restock needed' : 'OK'}</td></tr>`).join('')}
      </tbody></table>`
    } else if (tab === 'payroll') {
      return `<table><thead><tr><th>Date</th><th>Rider</th><th>Attendance</th><th class="right">Wage</th><th>Status</th></tr></thead><tbody>
        ${payrollReport.flatMap(day => day.riders.map(r => `<tr><td>${new Date(day.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</td><td>${r.name}</td><td>${r.status}</td><td class="right">${money(r.wage)}</td><td>${r.paid ? 'Paid' : r.wage > 0 ? 'Unpaid' : 'No pay'}</td></tr>`)).join('')}
      </tbody></table>`
    }
    return ''
  }

  function exportCSV() {
    let csv = ''
    if (tab === 'summary' && summary) {
      csv = 'Metric,Value\n'
      csv += `Gross Sales,${summary.grossSales}\n`
      csv += `Product Cost,${summary.totalCost}\n`
      csv += `Net Profit,${summary.netProfit}\n`
      csv += `Total Orders,${summary.totalOrders}\n`
    } else if (tab === 'daily') {
      csv = 'Date,Orders,Sales\n'
      daily.forEach(d => { csv += `${d.date},${d.orders},${d.sales}\n` })
    } else if (tab === 'best') {
      csv = 'Product,Qty Sold,Revenue\n'
      bestSelling.forEach(p => { csv += `${p.name},${p.totalQty},${p.totalRevenue}\n` })
    } else if (tab === 'forecast') {
      csv = 'Product,Avg Per Day,7-Day Forecast,Current Stock,Needs Restock\n'
      forecast.forEach(f => { csv += `${f.name},${f.avgPerDay},${f.forecast7Days},${f.stock},${f.needsRestock ? 'Yes' : 'No'}\n` })
    } else if (tab === 'payroll') {
      csv = 'Date,Rider,Attendance,Wage,Status\n'
      payrollReport.forEach(day => {
        day.riders.forEach(r => {
          csv += `${day.date},${r.name},${r.status},${r.wage},${r.paid ? 'Paid' : r.wage > 0 ? 'Unpaid' : 'No pay'}\n`
        })
      })
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `allmighty-${tab}-report.csv`
    a.click()
    URL.revokeObjectURL(url)
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

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">ALLMIGHTY</div>
        <nav>
          <Link className="nav-item" to="/admin"><SvgIcon paths={['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z']} /><span>Overview</span></Link>
          <Link className="nav-item" to="/admin/orders">
            <SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} /><span>Orders</span>
            {newOrdersCount > 0 && <em className="nav-badge">{newOrdersCount}</em>}
          </Link>
          <Link className="nav-item" to="/admin/products"><SvgIcon paths={['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8l9 5 9-5V8', 'M12 13v8']} /><span>Products</span></Link>
          <Link className="nav-item" to="/admin/riders"><SvgIcon paths={['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8']} /><span>Riders</span></Link>
          <Link className="nav-item" to="/admin/payroll"><SvgIcon paths={['M3 6h18a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2z', 'M3 10h18']} /><span>Payroll</span></Link>
          <Link className="nav-item active" to="/admin/reports"><SvgIcon paths={['M5 20V10', 'M12 20V4', 'M19 20v-7']} /><span>Reports</span></Link>
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
            <div className="eyebrow">Report & Analytics</div>
            <h1>Reports</h1>
          </div>
        </div>

        {/* Date filter */}
        <div className="row" style={{ gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="small muted">From</span>
          <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
            style={{ height: '36px', borderRadius: '10px', padding: '0 12px', fontSize: '14px', border: '1px solid #ccc' }} />
          <span className="small muted">To</span>
          <input type="date" value={to} min={from} max={new Date().toISOString().split('T')[0]} onChange={e => setTo(e.target.value)}
            style={{ height: '36px', borderRadius: '10px', padding: '0 12px', fontSize: '14px', border: '1px solid #ccc' }} />
          <button className="btn btn-outline btn-sm" onClick={() => { setFrom(new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0]); setTo(new Date().toISOString().split('T')[0]) }}>Last 7 days</button>
          <button className="btn btn-outline btn-sm" onClick={() => { setFrom(new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]); setTo(new Date().toISOString().split('T')[0]) }}>Last 30 days</button>
        </div>

        {/* Tabs */}
        <div className="chips" style={{ marginBottom: '20px' }}>
          {[['summary', 'P&L Summary'], ['daily', 'Daily Breakdown'], ['best', 'Best Selling'], ['forecast', 'Demand Forecast'], ['payroll', 'Payroll Report']].map(([val, label]) => (
            <button key={val} className={`chip ${tab === val ? 'active' : ''}`} onClick={() => setTab(val)}>{label}</button>
          ))}
        </div>

        {loading ? <p className="muted">Loading...</p> : (
          <>
            {/* P&L Summary */}
            {tab === 'summary' && summary && (
              <>
                <div className="grid-stat" style={{ marginBottom: '20px' }}>
                  <div className="card">
                    <div className="eyebrow">Gross Sales</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--blue)' }}>{money(summary.grossSales)}</div>
                    <div className="small muted">{summary.totalOrders} delivered orders</div>
                  </div>
                  <div className="card">
                    <div className="eyebrow">Product Cost</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--warn)' }}>{money(summary.totalCost)}</div>
                    <div className="small muted">Total cost of goods sold</div>
                  </div>
                  <div className="card" style={{ background: summary.netProfit >= 0 ? 'var(--ok-bg)' : 'var(--bad-bg)' }}>
                    <div className="eyebrow">Net Profit</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: summary.netProfit >= 0 ? 'var(--ok)' : 'var(--bad)' }}>{money(summary.netProfit)}</div>
                    <div className="small muted">{summary.netProfit >= 0 ? 'Profit' : 'Loss'} for the period</div>
                  </div>
                </div>
                {daily.length > 0 && (
                  <div className="card" style={{ marginBottom: '20px' }}>
                    <h2 style={{ marginBottom: '16px' }}>Daily Sales Trend</h2>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={daily.map(d => ({ date: new Date(d.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }), sales: Number(d.sales), orders: Number(d.orders) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(val, name) => [name === 'sales' ? money(val) : val, name === 'sales' ? 'Sales' : 'Orders']} />
                        <Legend />
                        <Line type="monotone" dataKey="sales" stroke="#0679bf" strokeWidth={2} dot={false} name="sales" />
                        <Line type="monotone" dataKey="orders" stroke="#22b8e8" strokeWidth={2} dot={false} name="orders" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}

            {/* Daily Breakdown */}
            {tab === 'daily' && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--tint-2)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Orders</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.length === 0 ? (
                      <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>No data for this period.</td></tr>
                    ) : daily.map((d, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '12px 16px' }}>{new Date(d.date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{d.orders}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{money(d.sales)}</td>
                      </tr>
                    ))}
                    {daily.length > 0 && (
                      <tr style={{ background: 'var(--tint-2)', fontWeight: 700 }}>
                        <td style={{ padding: '12px 16px' }}>Total</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{daily.reduce((s, d) => s + Number(d.orders), 0)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{money(daily.reduce((s, d) => s + Number(d.sales), 0))}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Best Selling */}
            {tab === 'best' && (
              <>
                {bestSelling.length > 0 && (
                  <div className="card" style={{ marginBottom: '20px' }}>
                    <h2 style={{ marginBottom: '16px' }}>Best Selling Products</h2>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={bestSelling.map(p => ({ name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name, revenue: Number(p.totalRevenue), qty: Number(p.totalQty) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(val, name) => [name === 'revenue' ? money(val) : val, name === 'revenue' ? 'Revenue' : 'Qty Sold']} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#0679bf" name="revenue" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="qty" fill="#22b8e8" name="qty" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--tint-2)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>#</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Product</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Qty Sold</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bestSelling.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>No data for this period.</td></tr>
                    ) : bestSelling.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '12px 16px', color: i < 3 ? 'var(--blue)' : 'var(--muted)', fontWeight: i < 3 ? 700 : 400 }}>#{i + 1}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{p.totalQty}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{money(p.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}

            {/* Demand Forecast */}
            {tab === 'forecast' && (
              <>
                <div style={{ background: 'var(--tint-2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: 'var(--blue)' }}>
                  Based on average daily sales from the last 30 days. Products needing restock are highlighted.
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--tint-2)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Product</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Avg/Day</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>7-Day Forecast</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Current Stock</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.length === 0 ? (
                        <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>No sales data available for forecasting.</td></tr>
                      ) : forecast.map((f, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--line)', background: f.needsRestock ? '#fff9e6' : '#fff' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{f.name}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>{f.avgPerDay}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{f.forecast7Days}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: f.stock <= 10 ? 'var(--warn)' : 'inherit' }}>{f.stock}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {f.needsRestock ? (
                              <span className="badge b-preparing">Restock needed</span>
                            ) : (
                              <span className="badge b-ok">Sufficient</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {/* Payroll Report */}
            {tab === 'payroll' && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--tint-2)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Rider</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Attendance</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Wage</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollReport.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>No payroll data for this period.</td></tr>
                    ) : payrollReport.map((day, di) => (
                      day.riders.map((r, ri) => (
                        <tr key={`${di}-${ri}`} style={{ borderBottom: '1px solid var(--line)' }}>
                          {ri === 0 && <td rowSpan={day.riders.length} style={{ padding: '12px 16px', fontWeight: 600, verticalAlign: 'top' }}>
                            {new Date(day.date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
                            <div className="small muted">Total: {money(day.total)}</div>
                          </td>}
                          <td style={{ padding: '12px 16px' }}>{r.name}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span className={`badge ${r.status === 'present' ? 'b-ok' : r.status === 'half_day' ? 'b-preparing' : 'b-cancelled'}`}>
                              {r.status === 'present' ? 'Present' : r.status === 'half_day' ? 'Half Day' : 'Absent'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{money(r.wage)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span className={`badge ${r.paid ? 'b-ok' : r.wage > 0 ? 'b-preparing' : 'b-cancelled'}`}>
                              {r.paid ? 'Paid' : r.wage > 0 ? 'Unpaid' : 'No pay'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Export buttons */}
            <div className="row" style={{ gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={printReport}>
                <SvgIcon paths={['M6 9V3h12v6', 'M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2', 'M6 14h12v8H6z']} size={16} />
                Print / Export PDF
              </button>
              <button className="btn btn-primary" onClick={() => exportCSV()}>
                <SvgIcon paths={['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8']} size={16} />
                Export Excel/CSV
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
