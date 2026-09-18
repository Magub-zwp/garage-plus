'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase/config'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import BottomNav from '@/components/customer/BottomNav'
import AppIcon from '@/components/common/AppIcon'

export default function PromotionsPage() {
  useAuth()
  const [promos,  setPromos]  = useState([])
  const [loading, setLoading] = useState(true)

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
    <div className="page-container pb-24 md:pb-12 pt-2 md:pt-4 px-4 md:px-0">
      <div className="page-header px-0 mb-3 flex items-center gap-3">
        <Link href="/home" className="back-btn">‹</Link>
        <h1 className="page-title text-base md:text-xl font-bold">โปรโมชั่นและสิทธิพิเศษ</h1>
      </div>

      {loading ? (
        <div className="flex justify-center pt-20">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
        </div>
      ) : promos.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-16 px-8 text-center bg-surf/50 rounded-3xl border border-dashed border-token p-10 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-s2 flex items-center justify-center mb-4">
            <AppIcon name="promo" size={36} />
          </div>
          <p className="font-syne text-base font-bold text-t1 mb-2">ยังไม่มีโปรโมชั่นในขณะนี้</p>
          <p className="text-xs text-t2 leading-relaxed">
            ติดตามโปรโมชั่นพิเศษและส่วนลดค่าบริการจากอู่ได้เร็วๆ นี้
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map((promo) => (
            <div
              key={promo.id}
              className="bg-surf rounded-3xl border border-token overflow-hidden shadow-xs hover:border-acc hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div
                  className="p-4 flex items-start gap-3.5"
                  style={{ background: 'var(--adim)', borderBottom: '1px solid var(--abrd)' }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-surf border border-acc flex items-center justify-center flex-shrink-0 shadow-xs">
                    <AppIcon name="promo" size={26} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-syne text-sm font-bold text-t1 leading-snug">{promo.name}</p>
                    {promo.reward && (
                      <p className="text-xs font-bold text-acc mt-1">
                        🎁 รางวัล: {promo.reward}
                      </p>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-2">
                  {promo.condition && (
                    <p className="text-xs text-t2 leading-relaxed">
                      <span className="font-semibold text-t1">เงื่อนไข:</span> {promo.condition}
                    </p>
                  )}
                  {promo.description && (
                    <p className="text-xs text-t2 leading-relaxed">{promo.description}</p>
                  )}
                </div>
              </div>

              {promo.expiredAt && (
                <div className="px-4 py-2.5 bg-s2/40 border-t border-token text-[11px] text-t3">
                  หมดเขต: {new Date(promo.expiredAt?.toDate?.() || promo.expiredAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
