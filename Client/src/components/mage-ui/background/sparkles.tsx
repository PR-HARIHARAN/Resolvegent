import React, { useId, useEffect, useState } from 'react'
import Particles from '@tsparticles/react'
import { tsParticles, type Container, type Engine } from '@tsparticles/engine'
import { loadSlim } from '@tsparticles/slim'
import { cn } from '@/lib/utils'
import { motion, useAnimation } from 'framer-motion'

export type ParticlesProps = {
  id?: string
  className?: string
  background?: string
  minSize?: number
  maxSize?: number
  speed?: number
  particleColor?: string
  particleDensity?: number
}

export const initParticlesEngine = async (cb: (engine: Engine) => Promise<void>) => {
  await cb(tsParticles)
}

export const SparklesCore: React.FC<ParticlesProps> = (props) => {
  const {
    id,
    className,
    background,
    minSize,
    maxSize,
    speed,
    particleColor,
    particleDensity,
  } = props

  const [init, setInit] = useState(false)

  useEffect(() => {
    loadSlim(tsParticles).then(() => {
      setInit(true)
    })
  }, [])

  const controls = useAnimation()

  const particlesLoaded = async (container?: Container) => {
    if (container) {
      controls.start({ opacity: 1, transition: { duration: 0.3 } })
    }
  }

  const generatedId = useId()

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={controls}
      className={cn('h-full w-full relative z-10', className)}
    >
      {init && (
        <Particles
          id={id || generatedId}
          className="h-full w-full"
          particlesLoaded={particlesLoaded}
          options={{
            background: { color: { value: background || 'transparent' } },
            fullScreen: { enable: false, zIndex: 1 },
            fpsLimit: 120,
            interactivity: {
              events: {
                onClick: { enable: false },
                resize: { enable: true },
              },
            },
            particles: {
              color: { value: particleColor || '#FFFFFF' },
              move: {
                enable: true,
                speed: speed || 0.8,
                direction: 'bottom',
                random: true,
                straight: false,
                outModes: { default: 'out' },
              },
              number: {
                value: particleDensity || 120,
                density: { enable: true },
              },
              opacity: {
                value: { min: 0.2, max: 1 },
                animation: { enable: true, speed: 1.2, sync: false },
              },
              size: {
                value: { min: minSize || 0.6, max: maxSize || 2.0 },
              },
              shape: { type: 'circle' },
            },
            detectRetina: true,
          }}
        />
      )}
    </motion.div>
  )
}

export const SparklesPreview: React.FC = () => {
  return (
    <div className="h-[40rem] w-full bg-black flex flex-col items-center justify-center overflow-hidden rounded-md">
      <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-white relative z-20">
        Resolvegent
      </h1>
      <div className="w-[40rem] h-40 relative">
        {/* Gradients */}
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-neutral-500 to-transparent h-[2px] w-3/4 blur-sm" />
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-neutral-500 to-transparent h-px w-3/4" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-neutral-400 to-transparent h-[5px] w-1/4 blur-sm" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-neutral-400 to-transparent h-px w-1/4" />

        {/* Core component */}
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1.4}
          particleDensity={1000}
          speed={0.8}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />

        {/* Radial Gradient to prevent sharp edges */}
        <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]" />
      </div>
    </div>
  )
}

export default SparklesPreview
