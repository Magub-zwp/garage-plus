'use client'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRepairStatus, STATUS_STEP, STATUS_BADGE } from '@/hooks/useRepairStatus'
import BottomNav from '@/components/customer/BottomNav'
import { db } from '@/lib/firebase/config'
import { doc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore'
import { useState } from 'react'
import { syncBookingStatus } from '@/lib/notify'
import AppIcon from '@/components/common/AppIcon'

const STEPS = [
  { id: 1, status: 'waiting',    label: 'รับรถ',  short: 'รับรถ'  },
  { id: 2, status: 'diagnosing', label: 'ตรวจ',   short: 'ตรวจ'   },
  { id: 3, status: 'awaiting_approval', label: 'รออนุมัติ', short: 'อนุมัติ' },
  { id: 4, status: 'repairing',  label: 'ซ่อม',   short: 'ซ่อม'   },
  { id: 5, status: 'qc',         label: 'QC',      short: 'QC'     },
  { id: 6, status: 'done',       label: 'ส่งมอบ', short: 'ส่งมอบ' },
]

const TIMELINE_TEMPLATES = {
  waiting:    { title: 'รับรถเข้าอู่เรียบร้อย',        icon: '✓' },
  diagnosing: { title: 'ตรวจวินิจฉัยสภาพรถยนต์',     icon: '✓' },
  awaiting_approval: { title: 'ประเมินราคาและรอการอนุมัติ', icon: '📋' },
  repairing:  { title: 'กำลังดำเนินการซ่อมบำรุง',      icon: '⚙️' },
  qc:         { title: 'ตรวจสอบคุณภาพหลังซ่อม (QC)',   icon: '🔍' },
  done:       { title: 'ส่งมอบรถยนต์เรียบร้อย',         icon: '✓' },
}

function buildTimeline(repair) {
  if (!repair) return []
  const currentStep = STATUS_STEP[repair.status] || 0
  return STEPS.map((step) => {
    const stepNum   = step.id
    const isDone    = stepNum < currentStep
    const isActive  = stepNum === currentStep
    const eventData = repair.timeline?.find((t) => t.status === step.status || t.stepId === stepNum)
    const template  = TIMELINE_TEMPLATES[step.status]
    return {
      ...step,
      state:    isDone ? 'done' : isActive ? 'active' : 'pending',
      title:    template.title,
      icon:     isDone || isActive ? template.icon : String(stepNum),
      desc:     eventData?.desc || (isActive ? `กำลังดำเนินการ — ${repair.jobDetail || ''}` : 'รอดำเนินการ'),
      time:     eventData?.time || null,
      location: eventData?.location || (isDone || isActive ? '179 Auto, Doi Saket' : null),
    }
  })
}

function StepBar({ currentStep }) {
  return (
    <div className="flex items-stretch rounded-2xl overflow-hidden border border-token my-3 bg-s2/50">
      {STEPS.map((step) => {
        const isDone    = step.id < currentStep
        const isActive  = step.id === currentStep
        return (
          <div
            key={step.id}
            className="flex-1 flex flex-col items-center py-2.5 text-center gap-0.5 transition-colors"
            style={{
              borderRight: step.id < 6 ? '0.5px solid var(--brd)' : 'none',
              background:  isDone ? 'var(--gdim)' : isActive ? 'var(--adim)' : 'transparent',
            }}
          >
            <span
              className="text-xs font-bold"
              style={{ color: isDone ? 'var(--grn)' : isActive ? 'var(--acc)' : 'var(--t3)' }}
            >
              {isDone ? '✓' : step.short}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function TimelineItem({ item }) {
  const isDone    = item.state === 'done'
  const isActive  = item.state === 'active'
  const isPending = item.state === 'pending'
  return (
    <div className="track-step mb-5 relative flex gap-3.5">
      {item.id < 6 && (
        <div
          className="track-connector absolute left-4 top-8 bottom-0 w-px"
          style={{ background: isDone ? 'var(--gbrd)' : 'var(--brd2)' }}
        />
      )}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold shadow-xs ${
          isDone
            ? 'bg-grn text-white'
            : isActive
            ? 'bg-acc text-white ring-4 ring-acc/20 animate-pulse'
            : 'bg-s2 text-t3 border border-token'
        }`}
      >
        {item.icon}
      </div>
      <div className="track-content flex-1 min-w-0 pb-1">
        <p className={`font-syne text-sm font-bold ${isPending ? 'text-t3' : 'text-t1'}`}>
          {item.title}
        </p>
        <p className="track-sub text-xs text-t2 mt-0.5 leading-relaxed">{item.desc}</p>
        {item.time && <p className="track-time text-[11px] text-t3 mt-1">🕒 {item.time}</p>}
        {item.location && <p className="track-time text-[11px] text-t3 mt-0.5">📍 {item.location}</p>}
      </div>
    </div>
  )
}

export default function StatusPage() {
  const { uid } = useAuth()
  const { repair, loading, currentStep } = useRepairStatus()
  const [saving, setSaving] = useState(false)

  const badge = repair ? STATUS_BADGE[repair.status] : null
  const timeline = buildTimeline(repair)

  const handleApprove = async (isApprove) => {
    if (!repair) return
    setSaving(true)
    try {
      const updates = {
        'approval.state': isApprove ? 'approved' : 'rejected',
        'approval.updatedAt': serverTimestamp(),
      }

      const newTimelineEvents = [
        {
          status: 'awaiting_approval',
          at: Date.now(),
          by: 'customer',
          note: isApprove ? 'ลูกค้ายืนยันอนุมัติการซ่อม' : 'ลูกค้าไม่อนุมัติการซ่อม',
        },
      ]

      if (isApprove) {
        updates.status = 'repairing'
        newTimelineEvents.push({
          status: 'repairing',
          at: Date.now() + 1000,
          by: 'system',
          note: 'เริ่มซ่อม (อัตโนมัติหลังลูกค้ายืนยัน)',
        })
      }

      updates.timeline = arrayUnion(...newTimelineEvents)
      await updateDoc(doc(db, 'repairs', repair.id), updates)

      if (isApprove && repair.bookingId) {
        await syncBookingStatus(repair.bookingId, 'repairing')
      }
    } catch (e) {
      console.error(e)
      alert('บันทึกไม่สำเร็จ: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container pb-24 md:pb-12 pt-2 md:pt-4 px-4 md:px-0">
      
      {/* Header */}
      <div className="page-header px-0 mb-3 flex items-center gap-3">
        <Link href="/home" className="back-btn">‹</Link>
        <h1 className="page-title text-base md:text-xl font-bold">สถานะงานซ่อมแบบเรียลไทม์</h1>
      </div>

      {loading ? (
        <div className="flex justify-center pt-20">
          <span
            className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : !repair ? (
        <div className="flex flex-col items-center justify-center pt-16 px-8 text-center bg-surf/50 rounded-3xl border border-dashed border-token p-10 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-s2 flex items-center justify-center mb-4">
            <AppIcon name="status" size={36} />
          </div>
          <h2 className="font-syne text-base font-bold text-t1 mb-2">ไม่มีงานซ่อมในขณะนี้</h2>
          <p className="text-xs text-t2 leading-relaxed mb-6">
            รถของคุณยังไม่ได้อยู่ในคิวซ่อมของอู่<br />คุณสามารถทำการจองคิวนัดหมายล่วงหน้าได้เลย
          </p>
          <Link
            href="/book"
            className="btn-primary px-8 py-3 rounded-2xl text-sm font-bold text-white mb-3 shadow-md"
          >
            จองคิวซ่อมรถยนต์
          </Link>
          <Link href="/history" className="text-xs text-acc font-semibold hover:underline">
            ดูประวัติการซ่อมทั้งหมด →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column (Desktop: 6 cols): Car Info & Costs */}
          <div className="md:col-span-6 flex flex-col gap-4">
            
            <div className="bg-surf rounded-3xl p-5 border border-token shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-s2 border border-token flex items-center justify-center flex-shrink-0">
                    <AppIcon name="car" size={28} />
                  </div>
                  <div>
                    <h3 className="font-syne text-base md:text-lg font-bold text-t1">
                      {repair.carName || 'รถของคุณ'}
                    </h3>
                    <p className="text-xs text-t2 mt-0.5">
                      ทะเบียน <span className="font-semibold text-t1">{repair.plate || repair.carPlate || '-'}</span> · ช่างผู้ดูแล {repair.mechanicName || '-'}
                    </p>
                  </div>
                </div>
                <span
                  className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 shadow-xs"
                  style={{
                    background: (badge?.color || 'var(--acc)') + '22',
                    color: badge?.color || 'var(--acc)',
                    border: `0.5px solid ${badge?.color || 'var(--acc)'}55`,
                  }}
                >
                  {badge?.text || repair.status}
                </span>
              </div>

              {/* Step bar */}
              <StepBar currentStep={currentStep} />

              {/* Cost estimate table */}
              {repair.costItems && repair.costItems.length > 0 && (
                <div className="mt-3 pt-3 border-t border-token">
                  <p className="text-xs font-bold text-t3 uppercase tracking-wider mb-2">รายการซ่อมและอะไหล่</p>
                  <div className="space-y-1.5">
                    {repair.costItems.map((item, i) => (
                      <div key={i} className="flex justify-between py-1 text-xs">
                        <span className="text-t2">{item.name}</span>
                        <span className="font-semibold text-t1">฿{(item.price || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-3 mt-2 border-t border-token">
                    <span className="text-xs font-bold text-t1">ยอดรวม {repair.isFinalPrice ? 'สุทธิ' : '(ประมาณการ)'}</span>
                    <span className="text-base font-extrabold text-acc">
                      ฿{(repair.costItems.reduce((s, i) => s + (i.price || 0), 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Proposed jobs */}
              {repair.proposedJobs && repair.proposedJobs.length > 0 && (!repair.costItems || repair.costItems.length === 0) && (
                <div className="mt-3 pt-3 border-t border-token">
                  <p className="text-xs font-bold text-t3 uppercase tracking-wider mb-2">รายการที่ช่างตรวจพบ</p>
                  <div className="space-y-1">
                    {repair.proposedJobs.map((item, i) => (
                      <div key={i} className="flex justify-between py-1 text-xs">
                        <span className="text-t2">{item.name}</span>
                        <span className="font-semibold text-t1">จำนวน ×{item.qty || 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approval UI */}
              {repair.status === 'awaiting_approval' && repair.approval?.state === 'pending' && (
                <div className="mt-4 pt-4 border-t border-dashed border-acc/40 bg-adim p-4 rounded-2xl">
                  <p className="text-xs font-bold text-acc mb-1 uppercase tracking-wider">ต้องการการยืนยันจากคุณ</p>
                  <p className="text-xs text-t1 mb-3">กรุณาตรวจสอบรายการประเมินราคาและยืนยันเพื่อให้ช่างเริ่มดำเนินการซ่อม</p>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleApprove(false)}
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-s2 hover:bg-s3 text-err border border-token cursor-pointer"
                    >
                      ไม่อนุมัติ
                    </button>
                    <button
                      onClick={() => handleApprove(true)}
                      disabled={saving}
                      className="flex-[2] py-2.5 rounded-xl text-xs font-bold text-white bg-acc hover:opacity-90 shadow-sm cursor-pointer"
                    >
                      {saving ? 'กำลังบันทึก...' : 'อนุมัติการซ่อม ✓'}
                    </button>
                  </div>
                </div>
              )}

              {repair.approval?.state && repair.approval?.state !== 'pending' && (
                <div className="mt-4 pt-3 border-t border-dashed border-token text-center">
                  <span
                    className={`text-xs font-bold px-3.5 py-1.5 rounded-full inline-block ${
                      repair.approval.state === 'approved' ? 'bg-gdim text-grn border border-grn/30' : 'bg-errdim text-err border border-err/30'
                    }`}
                  >
                    {repair.approval.state === 'approved' ? '✓ คุณอนุมัติการซ่อมแล้ว' : '✕ คุณปฏิเสธการซ่อม'}
                  </span>
                </div>
              )}
            </div>

            {/* Done Banner */}
            {repair.status === 'done' && (
              <div
                className="p-5 rounded-3xl text-center shadow-xs"
                style={{ background: 'var(--gdim)', border: '1px solid var(--gbrd)' }}
              >
                <div className="w-12 h-12 rounded-2xl bg-surf mx-auto flex items-center justify-center text-grn text-2xl font-bold mb-2 shadow-xs">
                  ✓
                </div>
                <p className="font-syne text-sm font-bold text-grn mb-1">รถของคุณซ่อมเสร็จสมบูรณ์แล้ว</p>
                <p className="text-xs text-t2 mb-3">สามารถติดต่อรับรถได้ที่ 179 Auto Doi Saket</p>
                <a
                  href="tel:0812345678"
                  className="inline-block px-4 py-1.5 rounded-xl bg-grn text-white text-xs font-bold shadow-xs hover:opacity-90"
                >
                  📞 ติดต่ออู่
                </a>
              </div>
            )}

          </div>

          {/* Right Column (Desktop: 6 cols): Detailed Timeline Steps */}
          <div className="md:col-span-6">
            <div className="bg-surf rounded-3xl p-5 border border-token shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <p className="font-syne text-xs font-bold text-t3 uppercase tracking-wider">
                  บันทึกขั้นตอนการซ่อม (Timeline)
                </p>
                <span className="text-[11px] text-acc font-semibold">อัปเดตอัตโนมัติ</span>
              </div>
              <div className="flex flex-col">
                {timeline.map((item) => (
                  <TimelineItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      <BottomNav />
    </div>
  )
}
