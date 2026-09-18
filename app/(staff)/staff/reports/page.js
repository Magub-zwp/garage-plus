'use client'
import { useState, useEffect } from 'react'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { Coins, CheckCircle2, TrendingUp, Calendar, AlertCircle } from 'lucide-react'

function StatCard({ label, value, sub, color, bg, Icon }) {
  return (
    <div className="card p-4 hover:border-token transition-colors">
      <div className="flex justify-between items-start mb-2">
        <span className="text-t2 text-xs uppercase tracking-wider font-medium">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg || 'var(--s2)', color: color || 'var(--t1)' }}>
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="font-syne text-2xl font-extrabold" style={{ color: color||'var(--t1)' }}>{value}</div>
      {sub && <div className="text-t3 text-xs mt-1">{sub}</div>}
    </div>
  )
}

export default function ReportsPage() {
  const [period,   setPeriod]   = useState('month') // 'week' | 'month' | 'year'
  const [repairs,  setRepairs]  = useState([])
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState('')

  useEffect(() => {
    const now = new Date()
    let from = new Date()
    if (period === 'week')  from.setDate(now.getDate() - 7)
    if (period === 'month') from.setMonth(now.getMonth() - 1)
    if (period === 'year')  from.setFullYear(now.getFullYear() - 1)
    from.setHours(0, 0, 0, 0)

    setLoading(true)
    setErr('')
    Promise.all([
      // ไม่ใช้ orderBy('updatedAt') ใน Firestore query เพื่อป้องกันปัญหา index error
      // และทำการ sort เรียงลำดับใน client-side แทน
      getDocs(query(collection(db,'repairs'), where('status','==','done'))),
      getDocs(query(collection(db,'bookings'), orderBy('createdAt','desc'))),
    ]).then(([rSnap, bSnap]) => {
      const filterDate = d => {
        const ts = d.updatedAt?.toDate?.() || d.createdAt?.toDate?.() || null
        return ts ? ts >= from : false
      }
      const doneRepairs = rSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(filterDate)
        .sort((a, b) => {
          const ta = a.updatedAt?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0
          const tb = b.updatedAt?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0
          return tb - ta
        })
      setRepairs(doneRepairs)
      setBookings(bSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.status !== 'cancelled').filter(filterDate))
    }).catch(e => {
      console.error('[Reports Error]', e)
      setErr(e.message)
    }).finally(() => setLoading(false))
  }, [period])
// คำนวณยอดรายได้รวมจากรายการซ่อมที่เสร็จสิ้นในช่วงเวลาที่เลือก และคำนวณค่าเฉลี่ยรายได้ต่อออเดอร์ รวมถึงสรุปยอดรายได้แยกตามช่างเพื่อแสดงในรายงานสถิติ
  const totalRevenue = repairs.reduce((s,r) =>
    s + (r.costItems||[]).reduce((a,i) => a+(i.price||0), 0), 0)
// คำนวณค่าเฉลี่ยรายได้ต่อออเดอร์ โดยหารยอดรายได้รวมด้วยจำนวนงานซ่อมที่เสร็จสิ้นในช่วงเวลาที่เลือก
  const avgRevenue = repairs.length > 0
    ? Math.round(totalRevenue / repairs.length) : 0
// สรุปยอดรายได้แยกตามช่าง เพื่อแสดงในรายงานสถิติ
  const byMechanic = repairs.reduce((acc, r) => {
    const name = r.mechanicName || 'ไม่ระบุ'
    if (!acc[name]) acc[name] = { count:0, revenue:0 }
    acc[name].count++
    acc[name].revenue += (r.costItems||[]).reduce((s,i)=>s+(i.price||0),0)
    return acc
  }, {})
// ช่วงเวลาที่ใช้แสดงในรายงานสถิติ (7 วัน, 30 วัน, 1 ปี)
  const PERIOD_LABEL = { week:'7 วัน', month:'30 วัน', year:'1 ปี' }

  return (
    <DashboardShell requiredRole="admin">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <h1 className="font-syne text-xl font-bold text-t1">รายงานสถิติ</h1>
        <div className="flex gap-2">
          {Object.entries(PERIOD_LABEL).map(([k,l]) => (
            <button key={k} onClick={() => setPeriod(k)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border-none cursor-pointer"
              style={{ background:period===k?'var(--acc)':'var(--surf)', color:period===k?'#fff':'var(--t2)', border:`0.5px solid ${period===k?'var(--acc)':'var(--brd2)'}` }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div className="mb-4 p-3 rounded-xl text-xs text-err bg-errdim flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center pt-16">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatCard label="รายได้รวม" value={`฿${totalRevenue.toLocaleString()}`}
              sub={`ใน ${PERIOD_LABEL[period]}`} color="var(--acc)" bg="var(--adim)" Icon={Coins} />
            <StatCard label="งานซ่อม" value={repairs.length}
              sub="เสร็จสิ้น" color="var(--grn)" bg="var(--gdim)" Icon={CheckCircle2} />
            <StatCard label="เฉลี่ย/งาน" value={`฿${avgRevenue.toLocaleString()}`}
              sub="ต่อออเดอร์" color="var(--t1)" bg="var(--s2)" Icon={TrendingUp} />
            <StatCard label="การจอง" value={bookings.length}
              sub="ไม่รวมยกเลิก" color="var(--blue,#185FA5)" bg="rgba(24,95,165,0.12)" Icon={Calendar} />
          </div>

          {/* By mechanic */}
          {Object.keys(byMechanic).length > 0 && (
            <div className="card p-4 mb-4">
              <h2 className="font-syne text-sm font-bold text-t1 mb-3">รายได้แยกตามช่าง</h2>
              {Object.entries(byMechanic)
                .sort((a,b) => b[1].revenue - a[1].revenue)
                .map(([name, data]) => (
                  <div key={name} className="flex justify-between items-center py-2.5"
                    style={{ borderBottom:'0.5px solid var(--brd)' }}>
                    <div>
                      <p className="text-sm font-semibold text-t1">{name}</p>
                      <p className="text-xs text-t2 mt-0.5">{data.count} งาน</p>
                    </div>
                    <p className="font-syne text-base font-bold text-acc">
                      ฿{data.revenue.toLocaleString()}
                    </p>
                  </div>
                ))}
            </div>
          )}

          {/* Recent repairs */}
          {repairs.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3" style={{ borderBottom:'0.5px solid var(--brd)' }}>
                <h2 className="font-syne text-sm font-bold text-t1">รายการซ่อมล่าสุด ({repairs.length})</h2>
              </div>
              <table className="data-table" style={{ tableLayout:'fixed', width:'100%' }}>
                <colgroup><col style={{ width:80 }}/><col/><col style={{ width:90 }}/><col style={{ width:80 }}/></colgroup>
                <thead><tr><th>ทะเบียน</th><th>งาน</th><th>ช่าง</th><th>ราคา</th></tr></thead>
                <tbody>
                  {repairs.slice(0,20).map(r => {
                    const total = (r.costItems||[]).reduce((s,i)=>s+(i.price||0),0)
                    return (
                      <tr key={r.id}>
                        <td><span className="plate">{r.plate||r.carPlate||'-'}</span></td>
                        <td className="text-xs text-t1">{r.jobDetail||'-'}</td>
                        <td className="text-xs text-t2">{r.mechanicName||'-'}</td>
                        <td className="text-sm font-bold" style={{ color:'var(--acc)' }}>
                          {total>0?`฿${total.toLocaleString()}`:'-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {repairs.length > 20 && (
                <div className="p-3 text-center text-xs text-t3">
                  แสดง 20 รายการล่าสุด จาก {repairs.length} ทั้งหมด
                </div>
              )}
            </div>
          )}

          {repairs.length === 0 && (
            <div className="card p-10 text-center">
              <span className="text-4xl mb-3 block">📈</span>
              <p className="font-syne text-sm font-bold text-t1 mb-1">ยังไม่มีข้อมูล</p>
              <p className="text-xs text-t2">ข้อมูลรายได้จะแสดงเมื่อมีงานซ่อมที่เสร็จสิ้น</p>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  )
}
