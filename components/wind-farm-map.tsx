'use client'

import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Wind, Zap, AlertTriangle, Battery, Thermometer, Droplets, X } from 'lucide-react'
import type { LatLngTuple } from 'leaflet'
import type { MapContainerProps } from 'react-leaflet'
import { supabase, type WindTurbineRecord, type SubstationRecord, type ConnectionRecord } from '@/lib/supabase'
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { TitleBar } from "@/components/ui/title-bar"

// 風機圖標 SVG
const windTurbineSvg = (color: string) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="32" height="32">
  <circle cx="12" cy="12" r="3"/>
  <path d="M12 2v4"/>
  <path d="M12 18v4"/>
  <path d="M4.93 4.93l2.83 2.83"/>
  <path d="M16.24 16.24l2.83 2.83"/>
  <path d="M2 12h4"/>
  <path d="M18 12h4"/>
  <path d="M4.93 19.07l2.83-2.83"/>
  <path d="M16.24 7.76l2.83-2.83"/>
</svg>
`

// 變電站圖標 SVG
const substationSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="32" height="32">
  <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
  <path d="M17 22v-5"/>
  <path d="M7 22v-5"/>
  <path d="M12 7V2"/>
  <path d="M12 12v-2"/>
</svg>
`

// 創建自定義圖標
const createWindTurbineIcon = (status: string, id: string) => {
  const color = status === 'normal' ? '#22c55e' : status === 'warning' ? '#3b82f6' : '#ef4444'
  return new L.DivIcon({
    html: `<div style="color: ${color};" data-id="${id}">${windTurbineSvg(color)}</div>`,
    className: 'wind-turbine-icon',
    iconSize: [32, 32],
  })
}

const createSubstationIcon = (id: string) => {
  return new L.DivIcon({
    html: `<div style="color: #6b7280;" data-id="${id}">${substationSvg}</div>`,
    className: 'substation-icon',
    iconSize: [32, 32],
  })
}

interface WindTurbine {
  id: string
  position: [number, number]
  power: number
  windSpeed: number
  temperature: number
  humidity: number
  status: 'normal' | 'warning' | 'error'
  events: { date: string; event: string }[]
}

interface Substation {
  id: string
  position: [number, number]
  capacity: number
  load: number
}

interface Connection {
  id: number
  from: string
  to: string
  status: 'normal' | 'warning' | 'error'
  type: 'turbine-turbine' | 'turbine-substation'
}

// 解析 PostgreSQL point 類型字串
function parsePointString(pointStr: string): [number, number] {
  const [lon, lat] = pointStr.slice(1, -1).split(',').map(Number)
  return [lat, lon]  // 注意：Leaflet 使用 [lat, lon] 格式
}

function WindFarmMap() {
  const [turbines, setTurbines] = useState<WindTurbine[]>([])
  const [substations, setSubstations] = useState<Substation[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [totalPower, setTotalPower] = useState(0)
  const [averageWindSpeed, setAverageWindSpeed] = useState(0)
  const [averageTemperature, setAverageTemperature] = useState(0)
  const [averageHumidity, setAverageHumidity] = useState(0)
  const [isAddingTurbine, setIsAddingTurbine] = useState(false)
  const [isAddingSubstation, setIsAddingSubstation] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectingFrom, setConnectingFrom] = useState<{ id: string; type: 'turbine' | 'substation' } | null>(null)
  
  const [selectedItem, setSelectedItem] = useState<WindTurbine | Substation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isControlsOpen, setIsControlsOpen] = useState(false)

  

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // 讀取風機資料
        const { data: turbines, error: turbineError } = await supabase
          .from('wind_turbines')
          .select('*')
        
        if (turbineError) {
          console.error('Error fetching turbines:', turbineError)
          return
        }

        // 讀取變電站資料
        const { data: substations, error: substationError } = await supabase
          .from('substations')
          .select('*')
        
        if (substationError) {
          console.error('Error fetching substations:', substationError)
          return
        }

        // 讀取連接線資料
        const { data: connections, error: connectionError } = await supabase
          .from('connections')
          .select('*')
        
        if (connectionError) {
          console.error('Error fetching connections:', connectionError)
          return
        }

        // 更新本地狀態
        if (turbines) {
          setTurbines(turbines.map(convertToWindTurbine))
        }
        
        if (substations) {
          setSubstations(substations.map(convertToSubstation))
        }
        
        if (connections) {
          setConnections(connections.map(conn => ({
            id: conn.id,
            from: conn.from_id,
            to: conn.to_id,
            status: conn.status,
            type: conn.type
          })))
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, []) // 只在組件掛載時執行一次

  useEffect(() => {
    setTotalPower(turbines.reduce((sum, turbine) => sum + turbine.power, 0))
    setAverageWindSpeed(turbines.reduce((sum, turbine) => sum + turbine.windSpeed, 0) / (turbines.length || 1))
    setAverageTemperature(turbines.reduce((sum, turbine) => sum + turbine.temperature, 0) / (turbines.length || 1))
    setAverageHumidity(turbines.reduce((sum, turbine) => sum + turbine.humidity, 0) / (turbines.length || 1))
  }, [turbines])

  function MapEvents() {
    useMapEvents({
      click(e) {
        setSelectedItem(null)
        if (isAddingTurbine) {
          const newTurbine: WindTurbine = {
            id: `HL30-NEW${Date.now()}`,
            position: [e.latlng.lat, e.latlng.lng],
            power: 5 + Math.random() * 3,
            windSpeed: 5 + Math.random() * 10,
            temperature: 15 + Math.random() * 10,
            humidity: 60 + Math.random() * 20,
            status: 'normal',
            events: [{ date: new Date().toLocaleString(), event: '安裝完成' }],
          }
          setTurbines((prev) => [...prev, newTurbine])
        } else if (isAddingSubstation) {
          const newSubstation: Substation = {
            id: `HL30-SUB${Date.now()}`,
            position: [e.latlng.lat, e.latlng.lng],
            capacity: 100 + Math.random() * 100,
            load: Math.random() * 100,
          }
          setSubstations((prev) => [...prev, newSubstation])
        }
      },
    })
    return null
  }

  function DraggableMarker({ item, updatePosition, updateStatus }: { 
    item: WindTurbine | Substation; 
    updatePosition: (id: string, pos: [number, number]) => void;
    updateStatus?: (id: string, status: 'normal' | 'warning' | 'error') => void;
  }) {
    const markerRef = useRef(null)
    const map = useMap()

    useEffect(() => {
      if (markerRef.current) {
        const marker = markerRef.current as L.Marker
        marker.on('dragend', () => {
          const newPos = marker.getLatLng()
          updatePosition(item.id, [newPos.lat, newPos.lng])
        })
      }
    }, [item, updatePosition])

    const handleClick = () => {
      setSelectedItem(item)
      if (isConnecting) {
        if (connectingFrom === null) {
          setConnectingFrom({ id: item.id, type: 'windSpeed' in item ? 'turbine' : 'substation' })
        } else if (connectingFrom.id !== item.id) {
          const type = connectingFrom.type === 'turbine' && 'windSpeed' in item ? 
            'turbine-turbine' : 'turbine-substation'
          addConnection(connectingFrom.id, item.id, type)
          setConnectingFrom(null)
          setIsConnecting(false)
        }
      }
    }

    if ('windSpeed' in item) {
      return (
        <Marker
          ref={markerRef}
          position={item.position}
          icon={createWindTurbineIcon(item.status, item.id)}
          draggable={true}
          eventHandlers={{ click: handleClick }}
        />
      )
    } else {
      return (
        <Marker
          ref={markerRef}
          position={item.position}
          icon={createSubstationIcon(item.id)}
          draggable={true}
          eventHandlers={{ click: handleClick
          }}
        />
      )
    }
  }

  // 轉換函數
  function convertToWindTurbine(record: WindTurbineRecord): WindTurbine {
    return {
      id: record.id,
      position: parsePointString(record.location),
      power: record.power,
      windSpeed: record.wind_speed,
      temperature: record.temperature,
      humidity: record.humidity,
      status: record.status,
      events: []
    }
  }

  function convertToSubstation(record: SubstationRecord): Substation {
    return {
      id: record.id,
      position: parsePointString(record.location),
      capacity: record.capacity,
      load: record.load
    }
  }

  // 更新位置的函數
  async function updateTurbinePosition(id: string, newPosition: [number, number]) {
    const [lat, lon] = newPosition
    const { error } = await supabase
      .from('wind_turbines')
      .update({
        location: `(${lon},${lat})`,  // PostgreSQL point 格式
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating turbine position:', error)
      return
    }

    setTurbines((prev) =>
      prev.map((t) => (t.id === id ? { ...t, position: newPosition } : t))
    )
  }

  // 修改更新風機狀態的函數
  async function updateTurbineStatus(id: string, newStatus: 'normal' | 'warning' | 'error') {
    setIsLoading(true)
    try {
      // 先更新資料庫
      const { error } = await supabase
        .from('wind_turbines')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error updating turbine status:', error)
        return
      }

      // 記錄事件
      const { error: eventError } = await supabase
        .from('turbine_events')
        .insert({
          turbine_id: id,
          event: `狀態更改為${newStatus}`,
          created_at: new Date().toISOString()
        })

      if (eventError) {
        console.error('Error inserting event:', eventError)
      }

      // 更新本地狀態
      setTurbines((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            return {
              ...t,
              status: newStatus,
              events: [
                { date: new Date().toLocaleString(), event: `狀態更改為${newStatus}` },
                ...t.events
              ]
            }
          }
          return t
        })
      )
    } finally {
      setIsLoading(false)
    }
  }

  // 新增連接線的函數
  async function addConnection(fromId: string, toId: string, type: 'turbine-turbine' | 'turbine-substation') {
    setIsLoading(true)
    try {
      const fromType = turbines.find(t => t.id === fromId) ? 'turbine' : 'substation'
      const toType = turbines.find(t => t.id === toId) ? 'turbine' : 'substation'

      const newConnection = {
        from_id: fromId,
        to_id: toId,
        from_type: fromType,
        to_type: toType,
        status: 'normal' as const,
        type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('connections')
        .insert(newConnection)
        .select()
        .single()

      if (error) {
        console.error('Error adding connection:', error)
        return
      }

      if (data) {
        setConnections(prev => [...prev, {
          id: data.id,
          from: data.from_id,
          to: data.to_id,
          status: data.status,
          type: data.type
        }])
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 修改更新連接線狀態的函數
  async function updateConnectionStatus(id: number, newStatus: 'normal' | 'warning' | 'error') {
    setIsLoading(true)
    try {
      // 先更新資料庫
      const { error } = await supabase
        .from('connections')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error updating connection status:', error)
        return
      }

      // 更新本地狀態
      setConnections(prev =>
        prev.map(conn =>
          conn.id === id ? { ...conn, status: newStatus } : conn
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  function ConnectionLines() {
    const handleConnectionClick = async (id: number) => {
      const connection = connections.find(conn => conn.id === id)
      if (connection) {
        const newStatus = connection.status === 'normal' ? 'warning' : 
                         connection.status === 'warning' ? 'error' : 'normal'
        await updateConnectionStatus(id, newStatus)  // 確保等待更新完成
      }
    }

    return (
      <>
        {connections.map((connection) => {
          const fromItem = turbines.find((t) => t.id === connection.from) || substations.find((s) => s.id === connection.from)
          const toItem = turbines.find((t) => t.id === connection.to) || substations.find((s) => s.id === connection.to)
          if (fromItem && toItem) {
            return (
              <Polyline
                key={connection.id}
                positions={[fromItem.position, toItem.position]}
                pathOptions={{
                  color: connection.status === 'normal' ? '#22c55e' : 
                         connection.status === 'warning' ? '#3b82f6' : '#ef4444',
                  weight: 3,
                  opacity: 0.8,
                  dashArray: connection.status === 'normal' ? '10, 10' : undefined,
                  dashOffset: connection.status === 'normal' ? String(Date.now() / 100 % 20) : undefined,
                }}
                eventHandlers={{
                  click: () => handleConnectionClick(connection.id),
                }}
              />
            )
          }
          return null
        })}
      </>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <TitleBar username="系統管理員" />
      <div className="flex flex-1 pt-14">
        {isLoading && <LoadingSpinner />}
        <div className={`fixed inset-y-14 left-0 w-96 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-[1000] ${selectedItem ? 'translate-x-0' : '-translate-x-full'}`}>
          {selectedItem && (
            <div className="h-full flex flex-col">
              {/* 標題列 */}
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  {'windSpeed' in selectedItem ? (
                    <Wind className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Battery className="h-5 w-5 text-yellow-500" />
                  )}
                  <h2 className="text-xl font-bold">
                    {'windSpeed' in selectedItem ? `風機 #${selectedItem.id}` : `變電站 #${selectedItem.id}`}
                  </h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 內容區域 */}
              <div className="flex-1 overflow-y-auto">
                {'windSpeed' in selectedItem ? (
                  <div className="p-4 space-y-6">
                    {/* 狀態指示器 */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`w-3 h-3 rounded-full ${
                          selectedItem.status === 'normal' ? 'bg-green-500' :
                          selectedItem.status === 'warning' ? 'bg-blue-500' : 'bg-red-500'
                        }`}></span>
                        <span className="font-medium">
                          {selectedItem.status === 'normal' ? '運轉正常' :
                           selectedItem.status === 'warning' ? '需要維護' : '故障停機'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        上次更新: {new Date().toLocaleString()}
                      </div>
                    </div>

                    {/* 主要數據 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Zap className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-600">發電量</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {selectedItem.power.toFixed(2)}
                          <span className="text-sm ml-1">MW</span>
                        </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Wind className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-gray-600">風速</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedItem.windSpeed.toFixed(1)}
                          <span className="text-sm ml-1">m/s</span>
                        </div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Thermometer className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-gray-600">溫度</span>
                        </div>
                        <div className="text-2xl font-bold text-red-600">
                          {selectedItem.temperature.toFixed(1)}
                          <span className="text-sm ml-1">°C</span>
                        </div>
                      </div>
                      <div className="bg-cyan-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Droplets className="h-4 w-4 text-cyan-500" />
                          <span className="text-sm text-gray-600">濕度</span>
                        </div>
                        <div className="text-2xl font-bold text-cyan-600">
                          {selectedItem.humidity.toFixed(1)}
                          <span className="text-sm ml-1">%</span>
                        </div>
                      </div>
                    </div>

                    {/* 狀態控制 */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-700">狀態控制</h3>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={selectedItem.status === 'normal' ? 'default' : 'outline'}
                          className={`flex-1 ${selectedItem.status === 'normal' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                          onClick={() => updateTurbineStatus(selectedItem.id, 'normal')}
                        >
                          <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                          正常
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedItem.status === 'warning' ? 'default' : 'outline'}
                          className={`flex-1 ${selectedItem.status === 'warning' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                          onClick={() => updateTurbineStatus(selectedItem.id, 'warning')}
                        >
                          <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                          待修
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedItem.status === 'error' ? 'default' : 'outline'}
                          className={`flex-1 ${selectedItem.status === 'error' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                          onClick={() => updateTurbineStatus(selectedItem.id, 'error')}
                        >
                          <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                          異常
                        </Button>
                      </div>
                    </div>

                    {/* 事件歷史 */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-700">事件歷史</h3>
                      <div className="bg-white rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-1/3">時間</TableHead>
                              <TableHead>事件</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedItem.events.map((event, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-sm">{event.date}</TableCell>
                                <TableCell className="text-sm">{event.event}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-6">
                    {/* 變電站資訊 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Battery className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-gray-600">容量</span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {selectedItem.capacity.toFixed(2)}
                          <span className="text-sm ml-1">MW</span>
                        </div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Zap className="h-4 w-4 text-purple-500" />
                          <span className="text-sm text-gray-600">負載</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedItem.load.toFixed(2)}
                          <span className="text-sm ml-1">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${selectedItem ? 'ml-96' : 'ml-0'}`}>
          <Card className="m-4">
            <CardHeader>
              
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center">
                  <Wind className="w-6 h-6 mr-2 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">總風機數量</p>
                    <p className="text-lg font-bold">{turbines.length}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Zap className="w-6 h-6 mr-2 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">總發電量</p>
                    <p className="text-lg font-bold">{totalPower.toFixed(2)} MW</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Wind className="w-6 h-6 mr-2 text-cyan-500" />
                  <div>
                    <p className="text-sm text-gray-500">平均風速</p>
                    <p className="text-lg font-bold">{averageWindSpeed.toFixed(1)} m/s</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Thermometer className="w-6 h-6 mr-2 text-red-500" />
                  <div>
                    <p className="text-sm text-gray-500">平均溫度</p>
                    <p className="text-lg font-bold">{averageTemperature.toFixed(1)} °C</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Droplets className="w-6 h-6 mr-2 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">平均濕度</p>
                    <p className="text-lg font-bold">{averageHumidity.toFixed(1)} %</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Battery className="w-6 h-6 mr-2 text-yellow-500" />
                  <div>
                    <p className="text-sm text-gray-500">變電站數量</p>
                    <p className="text-lg font-bold">{substations.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex-grow m-4 rounded-lg overflow-hidden mb-14">
            <MapContainer
              center={[24.0056628, 119.8879360] as LatLngTuple}
              zoom={11}
              style={{ height: 'calc(100% - 1rem)', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapEvents />
              {turbines.map((turbine) => (
                <DraggableMarker
                  key={turbine.id}
                  item={turbine}
                  updatePosition={updateTurbinePosition}
                  updateStatus={updateTurbineStatus}
                />
              ))}
              {substations.map((substation) => (
                <DraggableMarker
                  key={substation.id}
                  item={substation}
                  updatePosition={updateTurbinePosition}
                />
              ))}
              <ConnectionLines />
            </MapContainer>
          </div>
          <div className={`fixed bottom-0 left-0 right-0 bg-white shadow-lg transform transition-all duration-300 ease-in-out z-[1002]`}>
            {/* 控制列標題 */}
            <div 
              className="h-10 flex items-center justify-between px-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setIsControlsOpen(!isControlsOpen)}
            >
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-700">畫面編輯</span>
                <span className="text-sm text-gray-500">
                  {isControlsOpen ? '點擊收合' : '點擊展開'}
                </span>
              </div>
              <div className={`transform transition-transform duration-300 ${isControlsOpen ? 'rotate-180' : ''}`}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 text-gray-500"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 15l7-7 7 7" 
                  />
                </svg>
              </div>
            </div>

            {/* 按鈕區域 - 使用條件渲染 */}
            {isControlsOpen && (
              <div className="p-4 bg-white border-t">
                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      setIsAddingTurbine(!isAddingTurbine)
                      setIsAddingSubstation(false)
                    }}
                    className={`${isAddingTurbine ? 'bg-green-500 hover:bg-green-600' : ''} transition-colors`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isAddingTurbine ? '取消新增' : '新增風機'}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAddingSubstation(!isAddingSubstation)
                      setIsAddingTurbine(false)
                    }}
                    className={`${isAddingSubstation ? 'bg-yellow-500 hover:bg-yellow-600' : ''} transition-colors`}
                  >
                    <Battery className="w-4 h-4 mr-2" />
                    {isAddingSubstation ? '取消新增' : '新增變電站'}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsConnecting(!isConnecting)
                      setConnectingFrom(null)
                    }}
                    className={`${isConnecting ? 'bg-blue-500 hover:bg-blue-600' : ''} transition-colors`}
                  >
                    {isConnecting ? '取消連接' : '新增連接線'}
                  </Button>
                  <Button 
                    onClick={() => {
                      setTurbines([])
                      setSubstations([])
                      setConnections([])
                    }} 
                    variant="destructive"
                    className="transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    重置所有
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WindFarmMap