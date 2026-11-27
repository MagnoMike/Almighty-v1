import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const WAGES = { present: 300, half_day: 150, absent: 0 }

function toDateStr(d) { return d.toISOString().split('T')[0] }
function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function formatDateTime(ts) {
  return new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

function SvgIcon({ paths, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

export default function AdminPayroll() {
  const navigate = useNavigate()
  const adminName = localStorage.getItem('name') || 'Admin'
  const today = toDateStr(new Date())
  const [date, setDate] = useState(today)
  const [dateInput, setDateInput] = useState(today)
  const [attendance, setAttendance] = useState([])
  const [unpaid, setUnpaid] = useState([])
  const [summaryCards, setSummaryCards] = useState({ dayTotal: 0, dayPaid: 0, dayPending: 0, allPaid: 0, allUnpaid: 0, unpaidRiders: 0 })
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(null) // { rider, type: 'one'|'all' }
  const [showRiderRecord, setShowRiderRecord] = useState(null)
  const [riderRecord, setRiderRecord] = useState(null)
  const [toast, setToast] = useState('')
  const [dateError, setDateError] = useState('')
  const [newOrdersCount, setNewOrdersCount] = useState(0)
  const intervalRef = useRef(null)

  const isToday = date === today
  const isPast = date < today

  useEffect(() => {
    fetchAll()
    fetchUnpaid()
    fetchNewOrders()
    // auto-advance at midnight
    intervalRef.current = setInterval(() => {
      const newToday = toDateStr(new Date())
      if (newToday !== today && date === today) {
        setDate(newToday)
        setDateInput(newToday)
      }
    }, 30000)
    return () => clearInterval(intervalRef.current)
  }, [date])

  async function fetchAll() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://127.0.0.1:3000/attendance?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setAttendance(data.attendance)
        setSummaryCards(data.summary || { dayTotal: data.total, dayPaid: 0, dayPending: data.total, allPaid: 0, allUnpaid: 0, unpaidRiders: 0 })
      }
    } catch {}
    finally { setLoading(false) }
  }

  async function fetchUnpaid() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/attendance/unpaid', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setUnpaid(data.unpaid)
    } catch {}
  }

  async function fetchNewOrders() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://127.0.0.1:3000/orders/all', { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setNewOrdersCount(data.orders.filter(o => o.status === 'new').length)
    } catch {}
  }

  async function fetchRiderRecord(rider) {
    setShowRiderRecord(rider)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://127.0.0.1:3000/attendance/rider/${rider.rider_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setRiderRecord(data)
    } catch {}
  }

  async function handleAttendance(riderId, status) {
    if (!isToday) { showToast('Attendance can only be recorded for today.', true); return }
    const r = attendance.find(a => a.rider_id === riderId)
    if (r?.paid) { showToast('Already paid. This record is locked.', true); return }
    // toggle off if same status
    const newStatus = r?.status === status ? null : status
    try {
      const token = localStorage.getItem('token')
      await fetch('http://127.0.0.1:3000/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ riderId, date, status: newStatus || 'absent' })
      })
      fetchAll()
      fetchUnpaid()
    } catch { showToast('Failed to save.', true) }
  }

  async function handlePay(riderId) {
    try {
      const token = localStorage.getItem('token')
      await fetch('http://127.0.0.1:3000/attendance/pay-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ riderId, paidBy: adminName })
      })
      setShowPayModal(null)
      const r = unpaid.filter(u => u.rider_id === riderId).reduce((s, u) => s + Number(u.wage), 0)
      showToast(`Paid ${money(r)}`)
      fetchAll()
      fetchUnpaid()
    } catch { showToast('Failed.', true) }
  }

  async function handlePayAll() {
    const riderIds = [...new Set(unpaid.map(u => u.rider_id))]
    for (const rid of riderIds) await handlePay(rid)
    setShowPayModal(null)
    showToast(`Paid ${money(totalUnpaid)}`)
  }

  function showToast(msg, isErr) {
    setToast({ msg, isErr })
    setTimeout(() => setToast(''), 2500)
  }

  function changeDate(days) {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + days)
    const str = toDateStr(d)
    if (str > today) { setDateError('Future dates are not allowed'); setDate(today); setDateInput(today); return }
    setDateError('')
    setDate(str)
    setDateInput(str)
  }

  function handleDateInput(val) {
    setDateInput(val)
    if (val > today) { setDateError('Future dates are not allowed'); return }
    setDateError('')
    if (val) setDate(val)
  }

  function logout() { localStorage.clear(); navigate('/login') }

  // group unpaid by rider
  const unpaidByRider = unpaid.reduce((acc, u) => {
    if (!acc[u.rider_id]) acc[u.rider_id] = { name: u.name, rider_id: u.rider_id, records: [], total: 0 }
    acc[u.rider_id].records.push(u)
    acc[u.rider_id].total += Number(u.wage)
    return acc
  }, {})

  const totalUnpaid = unpaid.reduce((s, u) => s + Number(u.wage), 0)
  const presentCount = attendance.filter(a => a.status === 'present').length
  const halfCount = attendance.filter(a => a.status === 'half_day').length
  const absentCount = attendance.filter(a => a.status === 'absent').length
  const notMarkedCount = attendance.filter(a => !a.status && isToday).length

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

      {/* Pay One Modal */}
      {showPayModal?.type === 'one' && (
        <div className="overlay" onClick={() => setShowPayModal(null)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Pay {showPayModal.rider.name}?</h2>
            <p className="sub">{showPayModal.rider.records.length} day{showPayModal.rider.records.length > 1 ? 's' : ''} · {money(showPayModal.rider.total)}</p>
            {showPayModal.rider.records.map((r, i) => (
              <div key={i} className="kv">
                <span>{new Date(r.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} · {r.status === 'present' ? 'Present' : 'Half Day'}</span>
                <span>{money(r.wage)}</span>
              </div>
            ))}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowPayModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handlePay(showPayModal.rider.rider_id)}>Mark as paid</button>
            </div>
          </div>
        </div>
      )}

      {/* Pay All Modal */}
      {showPayModal?.type === 'all' && (
        <div className="overlay" onClick={() => setShowPayModal(null)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Pay all unpaid salaries?</h2>
            <p className="sub">{Object.keys(unpaidByRider).length} riders · {money(totalUnpaid)}</p>
            <p className="small muted">Paid records are locked and can't be changed.</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowPayModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePayAll}>Mark all as paid</button>
            </div>
          </div>
        </div>
      )}

      {/* Rider Record Modal */}
      {showRiderRecord && (
        <div className="overlay" onClick={() => { setShowRiderRecord(null); setRiderRecord(null) }}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="row between" style={{ marginBottom: '16px' }}>
              <div>
                <h2>{showRiderRecord.name}</h2>
                <div className="small muted">Rider Record</div>
              </div>
              <button className="icon-btn" onClick={() => { setShowRiderRecord(null); setRiderRecord(null) }}>
                <SvgIcon paths={['M6 6l12 12M18 6L6 18']} />
              </button>
            </div>
            {!riderRecord ? <p className="muted">Loading...</p> : (
              <>
                <div className="grid-2" style={{ marginBottom: '16px' }}>
                  <div className="card" style={{ padding: '12px 16px' }}>
                    <div className="small muted">Total earned</div>
                    <div style={{ fontWeight: 700 }}>{money(riderRecord.totalEarned)}</div>
                  </div>
                  <div className="card" style={{ padding: '12px 16px' }}>
                    <div className="small muted">Paid</div>
                    <div style={{ fontWeight: 700, color: 'var(--ok)' }}>{money(riderRecord.totalPaid)}</div>
                  </div>
                  <div className="card" style={{ padding: '12px 16px' }}>
                    <div className="small muted">Unpaid</div>
                    <div style={{ fontWeight: 700, color: riderRecord.totalUnpaid > 0 ? 'var(--bad)' : 'var(--ok)' }}>{money(riderRecord.totalUnpaid)}</div>
                  </div>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {riderRecord.records.map((r, i) => (
                    <div key={i} className="list-row">
                      <div className="grow">
                        <div className="t">{new Date(r.date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <div className="s">{r.status === 'present' ? 'Present' : r.status === 'half_day' ? 'Half Day' : r.auto_absent ? 'Absent · auto' : 'Absent'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600 }}>{money(r.wage)}</div>
                        <div className="small" style={{ color: r.paid ? 'var(--ok)' : r.wage > 0 ? 'var(--warn)' : 'var(--muted)' }}>
                          {r.paid ? `Paid ${formatDateTime(r.paid_at)}` : r.wage > 0 ? 'Unpaid' : 'No pay'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
          <Link className="nav-item" to="/admin/orders">
            <SvgIcon paths={['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6', 'M10 16h6']} /><span>Orders</span>
            {newOrdersCount > 0 && <em className="nav-badge">{newOrdersCount}</em>}
          </Link>
          <Link className="nav-item" to="/admin/products"><SvgIcon paths={['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8l9 5 9-5V8', 'M12 13v8']} /><span>Products</span></Link>
          <Link className="nav-item" to="/admin/riders"><SvgIcon paths={['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8']} /><span>Riders</span></Link>
          <Link className="nav-item active" to="/admin/payroll"><SvgIcon paths={['M3 6h18a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2z', 'M3 10h18']} /><span>Payroll</span></Link>
          <Link className="nav-item" to="/admin/reports"><SvgIcon paths={['M5 20V10', 'M12 20V4', 'M19 20v-7']} /><span>Reports</span></Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-brand">ALLMIGHTY</div>
          <button className="btn btn-ghost" onClick={() => setShowLogoutModal(true)}>Log out</button>
          <div className="avatar">{initials(adminName)}</div>
        </header>

        <div className="head">
          <div>
            <div className="eyebrow">Daily Payroll</div>
            <h1>Attendance</h1>
          </div>
        </div>

        {/* Salary rates */}
        <div className="row" style={{ gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span className="badge b-ok">Present = ₱300</span>
          <span className="badge b-preparing">Half Day = ₱150</span>
          <span className="badge b-cancelled">Absent = ₱0</span>
        </div>

        {/* Date selector */}
        <div className="row" style={{ gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => changeDate(-1)}>Prev</button>
          <input type="date" value={dateInput} max={today} onChange={e => handleDateInput(e.target.value)}
            style={{ height: '36px', borderRadius: '10px', padding: '0 12px', fontSize: '14px', border: '1px solid #ccc' }} />
          <button className="btn btn-outline btn-sm" onClick={() => changeDate(1)} disabled={isToday}>Next</button>
          <button className="btn btn-outline btn-sm" onClick={() => { setDate(today); setDateInput(today); setDateError('') }} disabled={isToday}>Today</button>
        </div>
        {dateError && <div className="auth-error" style={{ marginBottom: '10px' }}>{dateError}</div>}
        {isPast && (
          <div style={{ background: 'var(--tint-2)', border: '1px solid #c8e6f8', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--blue)' }}>
            View only. Attendance can only be recorded on the day itself. Unpaid salaries can still be paid.
          </div>
        )}

        {/* Unpaid Salaries Alert */}
        {Object.keys(unpaidByRider).length > 0 ? (
          <div style={{ background: '#fffbea', border: '1.5px solid #f5c842', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px' }}>
            <div className="row between" style={{ marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>Unpaid salaries · {money(totalUnpaid)}</div>
                <div className="small muted">{Object.keys(unpaidByRider).length} rider{Object.keys(unpaidByRider).length > 1 ? 's' : ''} are still owed</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowPayModal({ type: 'all' })}>Pay all</button>
            </div>
            {Object.values(unpaidByRider).map(r => (
              <div key={r.rider_id} className="row between" style={{ padding: '8px 0', borderTop: '1px solid #f5e5a0' }}>
                <div className="row" style={{ gap: '10px' }}>
                  <div className="avatar soft" style={{ width: '34px', height: '34px', fontSize: '11px' }}>{initials(r.name)}</div>
                  <div>
                    <button className="link" style={{ fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                      onClick={() => fetchRiderRecord({ ...r, name: r.name })}>{r.name}</button>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                      {r.records.map((rec, i) => (
                        <span key={i} style={{ background: '#fef3c7', border: '1px solid #f5c842', borderRadius: '6px', padding: '1px 6px', fontSize: '11px' }}>
                          {new Date(rec.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                          {rec.status === 'half_day' ? ' · half' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{money(r.total)}</div>
                  <button className="btn btn-sm btn-primary" style={{ marginTop: '4px' }}
                    onClick={() => setShowPayModal({ type: 'one', rider: r })}>Pay</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'var(--ok-bg)', border: '1px solid #9de5c9', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', color: 'var(--ok)', fontSize: '14px', fontWeight: 600 }}>
            All riders are fully paid. No unpaid salaries.
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid-stat" style={{ marginBottom: '24px' }}>
          <div className="card">
            <div className="eyebrow">Payroll for {isToday ? 'today' : formatDate(date).split(',')[0]}</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{money(summaryCards.dayTotal)}</div>
            <div className="small muted">Paid {money(summaryCards.dayPaid)} · Pending {money(summaryCards.dayPending)}</div>
          </div>
          <div className="card">
            <div className="eyebrow">Total paid (all days)</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ok)' }}>{money(summaryCards.allPaid)}</div>
          </div>
          <div className="card">
            <div className="eyebrow">Total unpaid (all days)</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: totalUnpaid > 0 ? 'var(--warn)' : 'var(--ok)' }}>{money(totalUnpaid)}</div>
            {totalUnpaid > 0 && <div className="small muted">{Object.keys(unpaidByRider).length} rider{Object.keys(unpaidByRider).length > 1 ? 's' : ''} owed</div>}
          </div>
        </div>

        {/* Summary boxes */}
        <div className="grid-stat" style={{ marginBottom: '20px' }}>
          {[
            { label: 'Present', count: presentCount, color: 'var(--ok)', bg: 'var(--ok-bg)' },
            { label: 'Half Day', count: halfCount, color: 'var(--warn)', bg: 'var(--warn-bg)' },
            { label: 'Absent', count: absentCount, color: 'var(--bad)', bg: 'var(--bad-bg)' },
            ...(isToday ? [{ label: 'Not Marked', count: notMarkedCount, color: 'var(--muted)', bg: '#f5f5f5' }] : [])
          ].map(s => (
            <div key={s.label} className="card" style={{ background: s.bg }}>
              <div className="eyebrow">{s.label}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: s.color }}>{s.count}</div>
              <div style={{ marginTop: '6px' }}>
                {attendance.filter(a => s.label === 'Not Marked' ? !a.status && isToday : a.status === s.label.toLowerCase().replace(' ', '_')).map(a => (
                  <div key={a.rider_id} className="small" style={{ color: s.color }}>
                    <button className="link" onClick={() => fetchRiderRecord(a)} style={{ fontSize: '12px', color: s.color }}>{a.name}</button>
                    <div className="small muted" style={{ fontSize: '11px' }}>Rider</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Rider Table */}
        {loading ? <p className="muted">Loading...</p> : attendance.length === 0 ? (
          <div className="empty">
            <h3>No riders found</h3>
            <p>Add delivery staff first in the Riders page.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--tint-2)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Rider</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Attendance</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Salary</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(r => {
                  const riderUnpaid = unpaid.filter(u => u.rider_id === r.rider_id).reduce((s, u) => s + Number(u.wage), 0)
                  return (
                    <tr key={r.rider_id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="row" style={{ gap: '10px' }}>
                          <div className="avatar soft" style={{ width: '36px', height: '36px', fontSize: '11px' }}>{initials(r.name)}</div>
                          <div>
                            <button className="link" style={{ fontWeight: 600, fontSize: '14px' }} onClick={() => fetchRiderRecord(r)}>{r.name}</button>
                            {riderUnpaid > 0 && <div className="small" style={{ color: 'var(--bad)' }}>owed {money(riderUnpaid)}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            className={`btn btn-sm ${r.status === 'present' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ background: r.status === 'present' ? 'var(--ok)' : '', borderColor: r.status === 'present' ? 'var(--ok)' : '' }}
                            onClick={() => handleAttendance(r.rider_id, 'present')}
                            disabled={isPast || r.paid}
                          >Present</button>
                          <button
                            className={`btn btn-sm ${r.status === 'half_day' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ background: r.status === 'half_day' ? 'var(--warn)' : '', borderColor: r.status === 'half_day' ? 'var(--warn)' : '', color: r.status === 'half_day' ? '#fff' : '' }}
                            onClick={() => handleAttendance(r.rider_id, 'half_day')}
                            disabled={isPast || r.paid}
                          >Half Day</button>
                          <button
                            className={`btn btn-sm ${r.status === 'absent' ? 'btn-danger' : 'btn-outline'}`}
                            onClick={() => handleAttendance(r.rider_id, 'absent')}
                            disabled={isPast || r.paid}
                          >Absent</button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                        {r.status ? money(r.wage) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {!r.status ? (
                          <span className="badge" style={{ background: '#f0f0f0', color: '#888' }}>No record</span>
                        ) : r.paid ? (
                          <span className="badge b-ok">Paid</span>
                        ) : r.wage === 0 ? (
                          <span className="badge b-cancelled">No pay</span>
                        ) : (
                          <span className="badge b-preparing">Unpaid</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {r.status && !r.paid && r.wage > 0 ? (
                          <button className="btn btn-primary btn-sm"
                            onClick={() => setShowPayModal({ type: 'one', rider: { rider_id: r.rider_id, name: r.name, records: unpaid.filter(u => u.rider_id === r.rider_id), total: riderUnpaid } })}>
                            Pay {money(riderUnpaid || r.wage)}
                          </button>
                        ) : r.paid ? (
                          <span className="small muted">Paid {r.paid_at ? formatDateTime(r.paid_at) : ''}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {toast && <div className={`toast${toast.isErr ? ' err' : ''}`}>{toast.msg}</div>}
    </div>
  )
}
