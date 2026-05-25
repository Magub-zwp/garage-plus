'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase/config'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import BottomNav from '@/components/customer/BottomNav'

export default function PromotionsPage() {
  useAuth()
  const [promos,  setPromos]  = useState([])
  const [loading, setLoading] = useState(true)
  // Fetch active promotions from Firestore
  useEffect(() => {
    getDocs(query(
      collection(db, 'promotions'),
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    ))
      .then(snap => setPromos(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => setPromos([]))
      .finally(() => setLoading(false))
  }, [])
  
  return (
    <div className="page-container pb-24">
      <div className="page-header">
        <Link href="/home" className="back-btn">‹</Link>
        <h1 className="page-title">โปรโมชั่น & สิทธิพิเศษ</h1>
      </div>

      {loading ? (
        <div className="flex justify-center pt-20">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
        </div>
      ) : promos.length === 0 ? (
        <div className="flex flex-col items-center pt-20 px-8 text-center">
          <span className="text-5xl mb-4">🎁</span>
          <p className="font-syne text-sm font-bold text-t1 mb-2">ยังไม่มีโปรโมชั่นในขณะนี้</p>
          <p className="text-xs text-t2 leading-relaxed">ติดตามโปรโมชั่นพิเศษได้เร็วๆ นี้</p>
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          {promos.map((promo) => (
            <div key={promo.id}
              className="bg-surf rounded-2xl border-token overflow-hidden">
              {/* Header */}
              <div className="p-4 flex items-start gap-3"
                style={{ background: 'var(--adim)', borderBottom: '0.5px solid var(--abrd)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: 'var(--surf)', border: '0.5px solid var(--abrd)' }}>
                  🎁
                </div>
                <div className="flex-1">
                  <p className="font-syne text-sm font-bold text-t1">{promo.name}</p>
                  {promo.reward && (
                    <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--acc)' }}>
                      รางวัล: {promo.reward}
                    </p>
                  )}
                </div>
              </div>
              {/* Body */}
              <div className="p-4">
                {promo.condition && (
                  <p className="text-xs text-t2 leading-relaxed mb-3">
                    📌 เงื่อนไข: {promo.condition}
                  </p>
                )}
                {promo.description && (
                  <p className="text-xs text-t2 leading-relaxed">{promo.description}</p>
                )}
                {promo.expiredAt && (
                  <p className="text-xs text-t3 mt-2">
                    ⏰ หมดเขต: {new Date(promo.expiredAt?.toDate?.() || promo.expiredAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
