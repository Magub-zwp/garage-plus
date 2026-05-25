// GaragePlus Cloud Functions v3.1
// หมายเหตุ: onRepairStatusChange และ onBookingStatusChange ถูกย้ายไปที่ /api/notify
// เพราะ Firestore asia-southeast3 (Bangkok) ยังไม่รองรับ Cloud Functions trigger
// LINE login callback ยังคงใช้ Cloud Function (HTTP trigger — ไม่ติด region ปัญหา)

const line = require('./line')

// ── Sprint 6: LINE OAuth callback ─────────────────────────────────────────
exports.lineCallback = line.lineCallback
