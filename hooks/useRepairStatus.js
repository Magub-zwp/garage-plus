'use client'
import { useEffect, useState } from 'react'
import { listenActiveRepairByUser } from '@/lib/firebase/firestore'
import { useAuthContext } from '@/context/AuthContext'

// Map Firestore status → step index (1-based)
export const STATUS_STEP = {
  waiting:    1,
  diagnosing: 2,
  awaiting_approval: 3,
  repairing:  4,
  qc:         5,
  done:       6,
}

export const STATUS_LABEL = {
  waiting:    'รับรถเข้าอู่',
  diagnosing: 'ตรวจวินิจฉัยสภาพรถ',
  awaiting_approval: 'รอการอนุมัติซ่อม',
  repairing:  'กำลังดำเนินการซ่อม',
  qc:         'ตรวจสอบคุณภาพ (QC)',
  done:       'ส่งมอบรถ',
}

export const STATUS_BADGE = {
  waiting:    { text: 'รอรับรถ',    color: 'var(--blue)' },
  diagnosing: { text: 'กำลังตรวจ', color: 'var(--acc)'  },
  awaiting_approval: { text: 'รออนุมัติ', color: 'var(--err)' },
  repairing:  { text: 'กำลังซ่อม', color: 'var(--acc)'  },
  qc:         { text: 'ตรวจ QC',   color: 'var(--acc)'  },
  done:       { text: 'เสร็จแล้ว', color: 'var(--grn)'  },
}

export function useRepairStatus() {
  const { uid }           = useAuthContext()
  const [repair, setRepair] = useState(undefined) // undefined = loading
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setRepair(null); setLoading(false); return }

    const unsub = listenActiveRepairByUser(uid, (r) => {
      setRepair(r)
      setLoading(false)
    })
    return () => unsub()
  }, [uid])

  const currentStep = repair ? (STATUS_STEP[repair.status] || 0) : 0

  return { repair, loading, currentStep }
}
