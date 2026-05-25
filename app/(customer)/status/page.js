'use client'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRepairStatus, STATUS_STEP, STATUS_BADGE } from '@/hooks/useRepairStatus'
import BottomNav from '@/components/customer/BottomNav'

const STEPS = [
  { id: 1, status: 'waiting',    label: 'รับรถ',  short: 'รับรถ'  },
  { id: 2, status: 'diagnosing', label: 'ตรวจ',   short: 'ตรวจ'   },
  { id: 3, status: 'repairing',  label: 'ซ่อม',   short: 'ซ่อม'   },
  { id: 4, status: 'qc',         label: 'QC',      short: 'QC'     },
  { id: 5, status: 'done',       label: 'ส่งมอบ', short: 'ส่งมอบ' },
]
// Timeline templates for each repair status
const TIMELINE_TEMPLATES = {
  waiting:    { title: 'รับรถเข้าอู่แล้ว',          icon: '✓' },
  diagnosing: { title: 'ตรวจวินิจฉัยสภาพรถ',         icon: '✓' },
  repairing:  { title: 'กำลังดำเนินการซ่อม',          icon: '🔧' },
  qc:         { title: 'ตรวจสอบคุณภาพหลังซ่อม (QC)', icon: '🔍' },
  done:       { title: 'ส่งมอบรถเรียบร้อย',           icon: '✓' },
}

function buildTimeline(repair) {
  if (!repair) return []
  const currentStep = STATUS_STEP[repair.status] || 0
  return STEPS.map((step) => {
    const stepNum   = step.id
    const isDone    = stepNum < currentStep
    const isActive  = stepNum === currentStep
    const eventData = repair.timeline?.find((t) => t.stepId === stepNum)
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
// Step bar component to show repair progress
function StepBar({ currentStep }) {
  return (
    <div className="flex items-stretch mx-3.5 mb-3.5 rounded-xl overflow-hidden"
      style={{ border: '0.5px solid var(--brd)' }}>
      {STEPS.map((step) => {
        const isDone    = step.id < currentStep
        const isActive  = step.id === currentStep
        return (
          <div key={step.id} className="flex-1 flex flex-col items-center py-2 text-center gap-0.5"
            style={{
              borderRight:  step.id < 5 ? '0.5px solid var(--brd)' : 'none',
              background:   isDone ? 'var(--gdim)' : isActive ? 'var(--adim)' : 'transparent',
            }}>
            <span className="text-xs font-bold"
              style={{ color: isDone ? 'var(--grn)' : isActive ? 'var(--acc)' : 'var(--t3)' }}>
              {isDone ? '✓' : step.short}
            </span>
          </div>
        )
      })}
    </div>
  )
}
// Timeline item component to show each step's details
function TimelineItem({ item }) {
  const isDone    = item.state === 'done'
  const isActive  = item.state === 'active'
  const isPending = item.state === 'pending'
  return (
    <div className="track-step mb-4 relative">
      {item.id < 5 && (
        <div className="track-connector absolute left-4 top-8 bottom-0 w-px"
          style={{ background: isDone ? 'var(--gbrd)' : 'var(--brd2)' }} />
      )}
      <div className={`track-dot ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
        {item.icon}
      </div>
      <div className="track-content ml-4 flex-1">
        <p className={`track-title ${isPending ? 'text-t3' : 'text-t1'}`}>{item.title}</p>
        <p className="track-sub text-t2">{item.desc}</p>
        {item.time && <p className="track-time text-t3">{item.time}</p>}
        {item.location && <p className="track-time text-t3">📍 {item.location}</p>}
      </div>
    </div>
  )
}
// Main status page component to show current repair status and timeline
export default function StatusPage() {
  const { uid } = useAuth()
  const { repair, loading, currentStep } = useRepairStatus()
  const timeline = buildTimeline(repair)
  const badge    = repair ? STATUS_BADGE[repair.status] : null

  return (
    <div className="page-container pb-24">
      <div className="page-header">
        <Link href="/home" className="back-btn">‹</Link>
        <h1 className="page-title">สถานะงานซ่อม</h1>
      </div>

      {loading ? (
        <div className="flex justify-center pt-20">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
        </div>
      ) : !repair ? (
        /* ── Empty State ── */
        <div className="flex flex-col items-center justify-center pt-20 px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4"
            style={{ background: 'var(--s2)' }}>🔧</div>
          <h2 className="font-syne text-base font-bold text-t1 mb-2">ไม่มีงานซ่อมในขณะนี้</h2>
          <p className="text-xs text-t2 leading-relaxed mb-6">
            รถของคุณยังไม่ได้อยู่ในอู่<br />จองคิวเพื่อนัดหมายซ่อมได้เลย
          </p>
          <Link href="/book"
            className="px-8 py-3 rounded-2xl text-sm font-bold text-white mb-3 inline-block"
            style={{ background: 'var(--acc)' }}>
            📅 จองคิวซ่อมรถ
          </Link>
          <Link href="/history" className="text-xs text-acc font-semibold">
            ดูประวัติการซ่อมทั้งหมด →
          </Link>
        </div>
      ) : (
        <>
          {/* Car + Status summary */}
          <div className="mx-4 mb-3 bg-surf rounded-3xl p-4 border-token">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-syne text-base font-bold text-t1">
                  {repair.carName || 'รถของคุณ'}
                </p>
                <p className="text-xs text-t2 mt-0.5">
                  ทะเบียน {repair.plate || repair.carPlate || '-'} · ช่าง {repair.mechanicName || '-'}
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background: (badge?.color || 'var(--acc)') + '22', color: badge?.color || 'var(--acc)', border: `0.5px solid ${badge?.color || 'var(--acc)'}55` }}>
                {badge?.text || repair.status}
              </span>
            </div>

            {/* Step bar */}
            <StepBar currentStep={currentStep} />

            {/* Cost estimate */}
            {repair.costItems && repair.costItems.length > 0 && (
              <div className="mt-2 pt-3" style={{ borderTop: '0.5px solid var(--brd)' }}>
                <p className="text-xs text-t3 mb-1">รายการซ่อม</p>
                {repair.costItems.map((item, i) => (
                  <div key={i} className="flex justify-between py-1">
                    <span className="text-xs text-t2">{item.name}</span>
                    <span className="text-xs font-semibold text-t1">฿{(item.price || 0).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '0.5px solid var(--brd)' }}>
                  <span className="text-xs font-bold text-t1">รวม {repair.isFinalPrice ? '' : '(ประมาณ)'}</span>
                  <span className="text-sm font-extrabold text-acc">
                    ฿{(repair.costItems.reduce((s, i) => s + (i.price || 0), 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="mx-4">
            <p className="text-xs font-bold text-t3 uppercase tracking-widest mb-3">ขั้นตอนการซ่อม</p>
            <div className="flex flex-col">
              {timeline.map((item) => (
                <TimelineItem key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Done CTA */}
          {repair.status === 'done' && (
            <div className="mx-4 mt-4 p-4 rounded-2xl text-center"
              style={{ background: 'var(--gdim)', border: '0.5px solid var(--gbrd)' }}>
              <p className="font-syne text-sm font-bold text-grn mb-1">✅ รถซ่อมเสร็จแล้ว!</p>
              <p className="text-xs text-t2">มารับรถได้ที่ 179 Auto, Doi Saket</p>
            </div>
          )}
        </>
      )}
      <BottomNav />
    </div>
  )
}
