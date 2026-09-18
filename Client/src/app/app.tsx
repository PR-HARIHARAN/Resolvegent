import * as React from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'

export const AppShell: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen w-full bg-black text-white selection:bg-white selection:text-black">
      {/* Top Header with Logo & Centered NavTabs */}
      <Header />

      {/* Main Routed Content Area */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  )
}

export default AppShell
