import CustomerHeader from '@/components/customer/CustomerHeader'

export default function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen bg-token flex flex-col transition-colors relative">
      <CustomerHeader />
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  )
}
