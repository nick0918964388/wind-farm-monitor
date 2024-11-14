// 基本事件類型
export interface Event {
  date: string
  event: string
}

// 發電歷史數據類型
export interface PowerData {
  date: string
  power: number
}

// 風機類型
export interface WindTurbine {
  id: string
  position: [number, number]
  status: 'normal' | 'warning' | 'error'
  power: number
  windSpeed: number
  temperature: number
  humidity: number
  events: Event[]
  powerHistory?: PowerData[]
}

// 變電站類型
export interface Substation {
  id: string
  position: [number, number]
  capacity: number
  load: number
}

// 連接線類型
export interface Connection {
  id: number
  from: string
  to: string
  status: 'normal' | 'warning' | 'error'
  type: 'turbine-turbine' | 'turbine-substation'
}

// 資料庫記錄類型
export interface WindTurbineRecord {
  id: string
  name: string
  location: string
  power: number
  wind_speed: number
  temperature: number
  humidity: number
  status: 'normal' | 'warning' | 'error'
  created_at: string
  updated_at: string
}

export interface SubstationRecord {
  id: string
  name: string
  location: string
  capacity: number
  load: number
  created_at: string
  updated_at: string
}

export interface ConnectionRecord {
  id: number
  from_id: string
  to_id: string
  from_type: 'turbine' | 'substation'
  to_type: 'turbine' | 'substation'
  status: 'normal' | 'warning' | 'error'
  type: 'turbine-turbine' | 'turbine-substation'
  created_at: string
  updated_at: string
}

export interface PowerHistoryRecord {
  id: number
  turbine_id: string
  power: number
  recorded_at: string
  created_at: string
}

// Props 類型
export interface SidePanelProps {
  selectedItem: WindTurbine | Substation | null
  setSelectedItem: (item: WindTurbine | Substation | null) => void
  updateTurbineStatus: (id: string, status: 'normal' | 'warning' | 'error') => void
}

export interface DraggableMarkerProps {
  item: WindTurbine | Substation
  updatePosition: (id: string, pos: [number, number]) => void
  updateStatus?: (id: string, status: 'normal' | 'warning' | 'error') => void
} 