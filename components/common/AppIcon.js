'use client'
import {
  Home,
  CalendarCheck2,
  CalendarClock,
  Wrench,
  History,
  User,
  Settings,
  Bell,
  Tag,
  Car,
  Warehouse,
  Droplet,
  Disc,
  ShieldAlert,
  BatteryCharging,
  Gauge,
  SlidersVertical,
  Cog,
  Gift,
  HelpCircle,
} from 'lucide-react'

const ICON_COMPONENTS = {
  // Navigation & Core
  home: Home,
  house: Home,
  book: CalendarCheck2,
  appointment: CalendarCheck2,
  bookings: CalendarClock,
  queue: CalendarClock,
  status: Wrench,
  history: History,
  profile: User,
  user: User,
  setting: Settings,
  settings: Settings,
  bell: Bell,
  alert: Bell,
  notification: Bell,
  notifications: Bell,
  promo: Tag,
  promotion: Tag,
  promotions: Tag,
  gift: Gift,

  // Entities & Brands
  car: Car,
  garage: Warehouse,
  logo: Cog,

  // Vehicle Services
  oil: Droplet,
  'engine-oil': Droplet,
  'น้ำมัน': Droplet,
  'เปลี่ยนน้ำมัน': Droplet,
  tire: Disc,
  'ยาง': Disc,
  brake: ShieldAlert,
  break: ShieldAlert,
  'เบรก': ShieldAlert,
  battery: BatteryCharging,
  batterry: BatteryCharging,
  'แบต': BatteryCharging,
  'แบตเตอรี่': BatteryCharging,
  engine: Gauge,
  'เครื่องยนต์': Gauge,
  'ตรวจ': Gauge,
  'ตรวจเช็ค': Gauge,
  shock: SlidersVertical,
  'shock-up': SlidersVertical,
  'โช้ค': SlidersVertical,
  'โช้คอัพ': SlidersVertical,
  gear: Cog,
  transmission: Cog,
  'เกียร์': Cog,
}

export function getIconComponent(name) {
  if (!name) return HelpCircle
  const key = String(name).trim().toLowerCase()
  if (ICON_COMPONENTS[key]) return ICON_COMPONENTS[key]
  for (const [k, comp] of Object.entries(ICON_COMPONENTS)) {
    if (key.includes(k)) return comp
  }
  return HelpCircle
}

export default function AppIcon({
  name,
  size = 20,
  strokeWidth = 1.85,
  className = '',
  style = {},
  fallback = null,
}) {
  const IconComponent = getIconComponent(name)

  if (!IconComponent) {
    return fallback || null
  }

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={`inline-block flex-shrink-0 transition-colors ${className}`}
      style={style}
    />
  )
}
