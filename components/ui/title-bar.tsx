import { User, Wind, Leaf, Menu, Settings, BarChart2, FileText, HelpCircle } from 'lucide-react'
import { Button } from './button'
import { useEffect, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import Link from 'next/link'

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
    <div className="h-14 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-emerald-100 flex items-center px-4 fixed top-0 left-0 right-0 z-[1001]">
      {/* 主選單 - 移到最左邊 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="mr-4">
            <Menu className="h-5 w-5 text-emerald-600" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuItem>
            <BarChart2 className="mr-2 h-4 w-4" />
            <Link href="/dashboard">儀表板</Link>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FileText className="mr-2 h-4 w-4" />
              <span>報表</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>
                <Link href="/reports/daily">每日報表</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/reports/weekly">週報表</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/reports/monthly">月報表</Link>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <Link href="/settings">系統設定</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HelpCircle className="mr-2 h-4 w-4" />
            <Link href="/help">使用說明</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Logo 和標題 */}
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

      {/* 右側內容 */}
      <div className="flex items-center space-x-4 ml-auto">
        {/* 時間顯示 */}
        <div>
          <span className="text-lg font-normal">{currentTime.toLocaleString()}</span>
        </div>

        {/* 使用者資訊 */}
        <div className="flex items-center space-x-2 bg-white/50 px-3 py-1.5 rounded-full">
          <User className="h-4 w-4 text-emerald-600" />
          <span className="text-sm text-emerald-700">{username}</span>
        </div>

        {/* 登出按鈕 */}
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