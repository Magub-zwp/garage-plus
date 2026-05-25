// Staff session — ใช้ localStorage เพื่อคงสถานะข้ามการเปิด tab
export const saveSession = (user) => {
  if (typeof window === 'undefined') return
  localStorage.setItem('gp_staff', JSON.stringify(user))
}
export const getSession = () => {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem('gp_staff')) } catch { return null }
}
export const clearSession = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('gp_staff')
}
