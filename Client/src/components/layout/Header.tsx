import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { NavTabs } from '@/components/mage-ui/container/nav-tabs'

const navTabsData = [
  { name: 'Overview', path: '/overview' },
  { name: 'Incidents', path: '/incidents' },
  { name: 'Alerts', path: '/alerts' },
  { name: 'Memory', path: '/memory' },
  { name: 'Audit', path: '/audit' },
]

export const Header: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  // Determine current active tab from route
  const currentTab = React.useMemo(() => {
    const path = location.pathname
    if (path.startsWith('/incidents')) return 'Incidents'
    if (path.startsWith('/alerts')) return 'Alerts'
    if (path.startsWith('/memory')) return 'Memory'
    if (path.startsWith('/audit')) return 'Audit'
    return 'Overview'
  }, [location.pathname])

  const handleTabChange = (tabName: string) => {
    const match = navTabsData.find((t) => t.name === tabName)
    if (match) {
      navigate(match.path)
    }
  }

  return (
    <header className="relative h-16 w-full border-b border-[#262626] bg-[#000000] px-6 flex items-center justify-between select-none z-30">
      {/* Left: Brand Logo with Sparkles */}
      <div className="flex items-center">
        <Logo size="md" />
      </div>

      {/* Center: Absolute Viewport Centered NavTabs Bar */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:flex items-center">
        <NavTabs
          tabs={navTabsData}
          activeTab={currentTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Right side (clean, zero extra margin) */}
      <div className="flex items-center" />
    </header>
  )
}

export default Header
