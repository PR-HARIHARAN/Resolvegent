import * as React from 'react'
import { Link } from 'react-router-dom'
import { SparklesCore } from '@/components/mage-ui/background/sparkles'
import { cn } from '@/lib/utils'

export interface LogoProps {
  className?: string
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

export const Logo: React.FC<LogoProps> = ({
  className,
  text = 'Resolvegent',
  size = 'md',
}) => {
  return (
    <Link
      to="/overview"
      className={cn(
        'group relative flex flex-col items-center justify-center bg-transparent border-0 outline-none select-none overflow-visible cursor-pointer py-1',
        size === 'sm' && 'w-36',
        size === 'md' && 'w-48',
        size === 'lg' && 'w-60',
        className
      )}
      title="Resolvegent Operational Command"
    >
      {/* Brand Text */}
      <span
        className={cn(
          'font-sans font-extrabold tracking-tight text-white relative z-20 leading-none drop-shadow-sm',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-base',
          size === 'lg' && 'text-xl'
        )}
      >
        {text}
      </span>

      {/* Glow Beam & Sparkles Container */}
      <div
        className={cn(
          'w-full relative z-10 flex flex-col items-center overflow-visible mt-1',
          size === 'sm' && 'h-6',
          size === 'md' && 'h-8',
          size === 'lg' && 'h-10'
        )}
      >
        {/* Horizontal Cyan & Indigo Glow Beams */}
        <div className="absolute inset-x-2 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-5/6 blur-[2px]" />
        <div className="absolute inset-x-2 top-0 bg-gradient-to-r from-transparent via-sky-400 to-transparent h-px w-5/6" />
        <div className="absolute inset-x-6 top-0 bg-gradient-to-r from-transparent via-sky-300 to-transparent h-[2px] w-1/2 blur-[1px]" />
        <div className="absolute inset-x-6 top-0 bg-gradient-to-r from-transparent via-white to-transparent h-px w-1/2" />

        {/* Dynamic White Sparkles Field Underneath */}
        <div className="w-full h-full relative">
          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1.8}
            particleDensity={180}
            speed={0.6}
            className="w-full h-full"
            particleColor="#FFFFFF"
          />
        </div>
      </div>
    </Link>
  )
}

export default Logo
