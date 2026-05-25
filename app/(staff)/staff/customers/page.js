'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore'

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
// Fetch customers from Firestore on component mount
  useEffect(() => {
    getDocs(query(collection(db,'users'), orderBy('memberSince','desc'), limit(200)))
      .then(snap => setCustomers(snap.docs.map(d => ({uid:d.id,...d.data()}))))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? customers.filter(c =>
        (c.name||'').includes(search) ||
        (c.phone||'').includes(search) ||
        (c.email||'').includes(search)
      )
    : customers
// Main render function with loading, error, and empty states
  return (
    <DashboardShell requiredRole="admin">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="font-syne text-xl font-bold text-t1">ข้อมูลลูกค้า</h1>
          <p className="text-xs text-t2 mt-0.5">{customers.length} คนทั้งหมด</p>
        </div>
      </div>

      <input className="input-field mb-4"
        placeholder="ค้นหาชื่อ, เบอร์โทร, หรืออีเมล..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ fontSize:13 }}
      />

      {loading ? (
        <div className="flex justify-center pt-16">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <span className="text-4xl mb-3 block">👤</span>
          <p className="font-syne text-sm font-bold text-t1 mb-1">
            {search ? 'ไม่พบลูกค้าที่ค้นหา' : 'ยังไม่มีลูกค้า'}
          </p>
          <p className="text-xs text-t2">ลูกค้าที่สมัครสมาชิกจะแสดงที่นี่</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table" style={{ tableLayout:'fixed', width:'100%' }}>
            <colgroup>
              <col/><col style={{ width:120 }}/><col style={{ width:80 }}/><col style={{ width:80 }}/>
            </colgroup>
            <thead>
              <tr><th>ชื่อ</th><th>เบอร์โทร</th><th>คะแนน</th><th>ใช้บริการ</th></tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.uid}>
                  <td>
                    <p className="text-sm font-semibold text-t1 truncate">{c.name||'-'}</p>
                    <p className="text-xs text-t2 truncate">{c.email||''}</p>
                  </td>
                  <td className="text-xs text-t2">{c.phone||'-'}</td>
                  <td className="text-xs font-bold text-acc">{c.points||0} pt</td>
                  <td className="text-xs text-t2 text-center">{c.usageCount||0} ครั้ง</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}
