import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface TabItem {
  name: string
  path?: string
}

interface TabProps {
  text: string
  selected: boolean
  onSelect: (text: string) => void
}

export interface NavTabsProps {
  tabs: (string | TabItem)[]
  activeTab?: string
  onTabChange?: (tab: string) => void
  className?: string
}

export function NavTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: NavTabsProps) {
  const tabObjects: TabItem[] = tabs.map((t) =>
    typeof t === 'string' ? { name: t } : t
  )

  const [internalSelected, setInternalSelected] = useState<string>(
    activeTab || tabObjects[0]?.name || ''
  )

  const selected = activeTab !== undefined ? activeTab : internalSelected

  const handleSelect = (tabName: string) => {
    setInternalSelected(tabName)
    onTabChange?.(tabName)
  }

  return (
    <nav
      className={cn(
        'inline-flex items-center gap-2 rounded-lg bg-[#0F0F0F] p-1.5 border border-[#262626]',
        className
      )}
      aria-label="Main Navigation"
    >
      {tabObjects.map((tab) => (
        <Tab
          text={tab.name}
          selected={selected === tab.name}
          onSelect={handleSelect}
          key={tab.name}
        />
      ))}
    </nav>
  )
}

const Tab = ({ text, selected, onSelect }: TabProps) => {
  return (
    <button
      onClick={() => onSelect(text)}
      className={cn(
        'relative rounded-md px-5 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer select-none whitespace-nowrap min-w-[80px]',
        selected ? 'text-black font-semibold' : 'text-[#A3A3A3] hover:text-white'
      )}
    >
      <span className="relative z-30 flex items-center justify-center">
        {text}
      </span>
      {selected && (
        <motion.span
          layoutId="tabs"
          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
          className="absolute inset-0 rounded-md bg-white shadow-xs"
        />
      )}
    </button>
  )
}

export default NavTabs
