// Customer mobile layout — max-width 430px, safe-area-inset
export default function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen bg-token" style={{ maxWidth:430, margin:'0 auto', position:'relative' }}>
      {children}
    </div>
  )
}
