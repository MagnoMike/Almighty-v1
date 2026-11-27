import pool from "../config/db.js";

const WAGES = { present: 300, half_day: 150, absent: 0 };

export const getByDate = async (date) => {
    const riders = await getRiders();
    const [records] = await pool.query(
        `SELECT a.*, u.name FROM attendance a JOIN user u ON a.rider_id = u.id WHERE a.date = ?`,
        [date]
    );

    const today = new Date().toISOString().split('T')[0];
    const isPast = date < today;

    return riders.map(r => {
        const rec = records.find(x => x.rider_id === r.id);
        if (rec) return { rider_id: r.id, name: r.name, phone: r.phone, status: rec.status, wage: rec.wage, paid: rec.paid, paid_at: rec.paid_at, paid_by: rec.paid_by, attendance_id: rec.id, auto_absent: rec.auto_absent };
        // auto-absent for past days
        if (isPast) return { rider_id: r.id, name: r.name, phone: r.phone, status: 'absent', wage: 0, paid: 0, auto_absent: 1, attendance_id: null };
        return { rider_id: r.id, name: r.name, phone: r.phone, status: null, wage: 0, paid: 0, auto_absent: 0, attendance_id: null };
    });
}

export const getRiders = async () => {
    const [rows] = await pool.query("SELECT id, name, phone FROM user WHERE role = 'delivery' ORDER BY name ASC");
    return rows;
}

export const saveAttendance = async (riderId, date, status) => {
    const wage = WAGES[status] ?? 0;
    await pool.query(
        `INSERT INTO attendance (rider_id, date, status, wage) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = ?, wage = ?`,
        [riderId, date, status, wage, status, wage]
    );
}

export const getUnpaid = async () => {
    const [rows] = await pool.query(
        `SELECT a.*, u.name FROM attendance a JOIN user u ON a.rider_id = u.id
         WHERE a.paid = 0 AND a.wage > 0 ORDER BY u.name ASC, a.date ASC`
    );
    return rows;
}

export const markAllPaid = async (riderId, paidBy) => {
    await pool.query(
        `UPDATE attendance SET paid = 1, paid_at = NOW(), paid_by = ? WHERE rider_id = ? AND paid = 0 AND wage > 0`,
        [paidBy || 'Admin', riderId]
    );
}

export const getSummary = async (date) => {
    const [dayStats] = await pool.query(
        `SELECT SUM(wage) as total, SUM(CASE WHEN paid=1 THEN wage ELSE 0 END) as paid FROM attendance WHERE date = ?`,
        [date]
    );
    const [allStats] = await pool.query(
        `SELECT SUM(CASE WHEN paid=1 THEN wage ELSE 0 END) as allPaid, SUM(CASE WHEN paid=0 AND wage>0 THEN wage ELSE 0 END) as allUnpaid FROM attendance`
    );
    return {
        dayTotal: dayStats[0]?.total || 0,
        dayPaid: dayStats[0]?.paid || 0,
        dayPending: (dayStats[0]?.total || 0) - (dayStats[0]?.paid || 0),
        allPaid: allStats[0]?.allPaid || 0,
        allUnpaid: allStats[0]?.allUnpaid || 0
    };
}

export const getRiderRecord = async (riderId) => {
    const [records] = await pool.query(
        `SELECT * FROM attendance WHERE rider_id = ? ORDER BY date DESC`,
        [riderId]
    );
    const totalEarned = records.reduce((s, r) => s + Number(r.wage), 0);
    const totalPaid = records.filter(r => r.paid).reduce((s, r) => s + Number(r.wage), 0);
    const totalUnpaid = records.filter(r => !r.paid && r.wage > 0).reduce((s, r) => s + Number(r.wage), 0);
    return { records, totalEarned, totalPaid, totalUnpaid };
}
