'use client'

import dynamic from 'next/dynamic'

const WindFarmMap = dynamic(() => import('@/components/wind-farm-map'), {
  ssr: false
})

export default function Home() {
  return (
    <main>
      <WindFarmMap />
    </main>
  )
}