'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { getSession } from '@/lib/staff/session'

const BDG = { waiting:'bdg-wait', diagnosing:'bdg-wait', repairing:'bdg-rep', qc:'bdg-hold', done:'bdg-done' }
const BLB = { waiting:'รอรับรถ', diagnosing:'ตรวจ', repairing:'ซ่อม', qc:'QC', done:'เสร็จ' }

export default function MechQueuePage() {
  const [repairs,  setRepairs]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [mechName, setMechName] = useState('')
// Fetch mechanic's assigned repairs on component mount
  useEffect(() => {
    const session = getSession()
    if (!session) return
    setMechName(session.name || '')

    getDocs(query(
      collection(db, 'repairs'),
      where('mechanicId', '==', session.uid),
      where('status', 'in', ['waiting', 'diagnosing', 'repairing', 'qc']),
      orderBy('createdAt', 'desc')
    ))
      .then(snap => setRepairs(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])
// Calculate counts for different repair statuses to display in stats
  const counts = {
    all:       repairs.length,
    repairing: repairs.filter(r => r.status === 'repairing').length,
    waiting:   repairs.filter(r => r.status === 'waiting').length,
    qc:        repairs.filter(r => r.status === 'qc').length,
  }

  return (
    <DashboardShell requiredRole="mechanic">
      <h1 className="font-syne text-xl font-bold text-t1 mb-1">คิวของฉัน</h1>
      {mechName && <p className="text-xs text-t2 mb-5">ช่าง: {mechName}</p>}

      {/* Stats */}
      <div className="flex gap-3 mb-5">
        {[
          { l:'ทั้งหมด',    v:counts.all,       c:'var(--t1)'  },
          { l:'กำลังซ่อม',  v:counts.repairing, c:'var(--acc)' },
          { l:'รอรับรถ',    v:counts.waiting,   c:'var(--blue,#185FA5)' },
          { l:'รอ QC',      v:counts.qc,        c:'#854F0B'    },
        ].map(s => (
          <div key={s.l} className="card px-4 py-3 text-center min-w-16 flex-1">
            <p className="text-t3 text-xs mb-1">{s.l}</p>
            <p className="font-syne text-xl font-extrabold" style={{ color:s.c }}>{s.v}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center pt-16">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
        </div>
      ) : repairs.length === 0 ? (
        <div className="card p-10 text-center">
          <span className="text-4xl mb-3 block">✅</span>
          <p className="font-syne text-sm font-bold text-t1 mb-1">ไม่มีงานค้างอยู่</p>
          <p className="text-xs text-t2">งานซ่อมทั้งหมดเสร็จสิ้นแล้ว</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table" style={{ tableLayout:'fixed', width:'100%' }}>
            <colgroup>
              <col style={{ width:76 }}/><col/><col style={{ width:96 }}/><col style={{ width:72 }}/>
            </colgroup>
            <thead>
              <tr><th>ทะเบียน</th><th>งาน</th><th>สถานะ</th><th></th></tr>
            </thead>
            <tbody>
              {repairs.map(r => (
                <tr key={r.id}>
                  <td><span className="plate">{r.plate||r.carPlate||'-'}</span></td>
                  <td className="text-xs text-t1">{r.jobDetail||'-'}</td>
                  <td><span className={`bdg ${BDG[r.status]||'bdg-wait'}`}>{BLB[r.status]||r.status}</span></td>
                  <td>
                    <Link href={`/staff/mech/repair?id=${r.id}`}>
                      <button className="act">บันทึก</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}
