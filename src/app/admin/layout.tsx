import { Sidebar } from '../components/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-nrlx-bg">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
