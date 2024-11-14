import { User, Wind, Leaf } from 'lucide-react'
import { Button } from './button'
import { useEffect, useState } from 'react'

interface TitleBarProps {
  username?: string
}


export function TitleBar({ username = '系統管理員' }: TitleBarProps) {
    const [currentTime, setCurrentTime] = useState(new Date())
    useEffect(() => {
        const timer = setInterval(() => {
          setCurrentTime(new Date())
        }, 1000)
    
        return () => clearInterval(timer)
      }, [])
  return (
    <div className="h-14 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-emerald-100 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-[1001]">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Wind className="h-6 w-6 text-emerald-500 animate-spin-slow" />
          <Leaf className="h-5 w-5 text-green-500" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-emerald-800">離岸風電場監控系統</h1>
          <span className="text-xs text-emerald-600">Offshore Wind Farm Monitoring System</span>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <div>
        
                <span className="text-lg font-normal">{currentTime.toLocaleString()}</span>
        
        </div>
        <div className="flex items-center space-x-2 bg-white/50 px-3 py-1.5 rounded-full">
          <User className="h-4 w-4 text-emerald-600" />
          <span className="text-sm text-emerald-700">{username}</span>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          登出
        </Button>
      </div>
    </div>
  )
} 