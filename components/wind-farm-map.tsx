'use client'

import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Wind, Zap, AlertTriangle, Battery, Thermometer, Droplets, X } from 'lucide-react'
import type { LatLngTuple } from 'leaflet'
import type { MapContainerProps } from 'react-leaflet'
import { supabase } from '@/lib/supabase'
import type { 
  WindTurbine, 
  Substation, 
  Connection, 
  WindTurbineRecord, 
  SubstationRecord, 
  ConnectionRecord,
  DraggableMarkerProps 
} from '@/types'
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { TitleBar } from "@/components/ui/title-bar"
import { SidePanel } from '@/components/side-panel'
import { calculateHealthScore } from '@/components/side-panel/utils'

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

// 解析 PostgreSQL point 類型字串
function parsePointString(pointStr: string): [number, number] {
  const [lon, lat] = pointStr.slice(1, -1).split(',').map(Number)
  return [lat, lon]  // 注意：Leaflet 使用 [lat, lon] 格式
}

// 將 MapEvents 改為異步函數
function MapEvents({ setSelectedItem, isAddingTurbine, isAddingSubstation, setTurbines, setSubstations }: {
  setSelectedItem: (item: WindTurbine | Substation | null) => void,
  isAddingTurbine: boolean,
  isAddingSubstation: boolean,
  setTurbines: React.Dispatch<React.SetStateAction<WindTurbine[]>>,
  setSubstations: React.Dispatch<React.SetStateAction<Substation[]>>
}) {
  useMapEvents({
    async click(e) {
      setSelectedItem(null)
      if (isAddingTurbine) {
        const turbineId = `HL30-NEW${Date.now()}`
        const turbineName = `Turbine #${turbineId.slice(-4)}`
        const currentPower = 5 + Math.random() * 3;

        const newTurbine: WindTurbine = {
          id: turbineId,
          name: turbineName,
          position: [e.latlng.lat, e.latlng.lng],
          power: currentPower,
          windSpeed: 5 + Math.random() * 10,
          temperature: 15 + Math.random() * 10,
          humidity: 60 + Math.random() * 20,
          status: 'normal',
          events: [{
            date: new Date().toLocaleString(),
            event: 'Installation Complete'
          }],
        }
        
        try {
          // 先將風機插入到 wind_turbines 表中
          const { error: turbineError } = await supabase
            .from('wind_turbines')
            .insert({
              id: newTurbine.id,
              name: turbineName,
              location: `(${newTurbine.position[1]},${newTurbine.position[0]})`,
              power: newTurbine.power,
              wind_speed: newTurbine.windSpeed,
              temperature: newTurbine.temperature,
              humidity: newTurbine.humidity,
              status: newTurbine.status,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (turbineError) {
            console.error('Error inserting turbine:', turbineError);
            return;
          }

          // 生成並儲存歷史數據
          const now = new Date();
          const historyData = [];

          for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            const randomVariation = (Math.random() - 0.5) * 2;
            const power = Math.max(0, currentPower + randomVariation);
            
            historyData.push({
              turbine_id: newTurbine.id,
              power: Number(power.toFixed(2)),
              expected_power: 8.0,        // 固定的預期發電量
              upper_limit: 12.0,          // 固定的上限警戒值
              lower_limit: 4.0,           // 固定的下限警戒值
              recorded_at: date.toISOString(),
              created_at: new Date().toISOString()
            });
          }

          // 插入初始事件
          const { error: eventError } = await supabase
            .from('turbine_events')
            .insert({
              turbine_id: newTurbine.id,
              event: 'Installation Complete',
              priority: 3,
              created_at: new Date().toISOString()
            });

          if (eventError) {
            console.error('Error inserting event:', eventError);
          }

          // 插入發電歷史數據
          const { error: historyError } = await supabase
            .from('power_history')
            .insert(historyData);

          if (historyError) {
            console.error('Error saving power history:', historyError);
            return;
          }

          // 成功儲存後，更新本地狀態
          setTurbines((prev) => [...prev, newTurbine]);
          
        } catch (error) {
          console.error('Error in creating new turbine:', error);
        }
      } else if (isAddingSubstation) {
        const substationId = `HL30-SUB${Date.now()}`
        const substationName = `Substation #${substationId.slice(-4)}`
        
        const newSubstation: Substation = {
          id: substationId,
          name: substationName, // 加入 name 屬性
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
          const convertedTurbines = await Promise.all(turbines.map(convertToWindTurbine));
          setTurbines(convertedTurbines);
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

  function DraggableMarker({ item, updatePosition, updateStatus }: DraggableMarkerProps) {
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

  // 修改轉換函數
  async function convertToWindTurbine(record: WindTurbineRecord): Promise<WindTurbine> {
    // 讀取該風機的事件歷史
    const { data: events, error } = await supabase
      .from('turbine_events')
      .select('*')
      .eq('turbine_id', record.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching turbine events:', error);
    }

    // 加入除錯訊息
    console.log('Turbine ID:', record.id);
    console.log('Events data:', events);

    return {
      id: record.id,
      name: record.name,
      position: parsePointString(record.location),
      power: record.power,
      windSpeed: record.wind_speed,
      temperature: record.temperature,
      humidity: record.humidity,
      status: record.status,
      events: events ? events.map(event => ({
        date: new Date(event.created_at).toLocaleString(),
        event: event.event
      })) : []
    }
  }

  function convertToSubstation(record: SubstationRecord): Substation {
    return {
      id: record.id,
      name: record.name,
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
          event: `Status changed to ${newStatus}`,
          created_at: new Date().toISOString(),
          priority: newStatus === 'error' ? 1 : 
                   newStatus === 'warning' ? 2 : 3
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
                { date: new Date().toLocaleString(), event: `Status changed to ${newStatus}` },
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
    const [time, setTime] = useState(0);

    // 添加動畫效果
    useEffect(() => {
      const timer = setInterval(() => {
        setTime(prev => prev + 1);
      }, 50);  // 每 50ms 更新一次

      return () => clearInterval(timer);
    }, []);

    const handleConnectionClick = async (id: number) => {
      const connection = connections.find(conn => conn.id === id)
      if (connection) {
        const newStatus = connection.status === 'normal' ? 'warning' : 
                         connection.status === 'warning' ? 'error' : 'normal'
        await updateConnectionStatus(id, newStatus)
      }
    }

    return (
      <>
        {connections.map((connection) => {
          const fromItem = turbines.find((t) => t.id === connection.from) || 
                          substations.find((s) => s.id === connection.from)
          const toItem = turbines.find((t) => t.id === connection.to) || 
                        substations.find((s) => s.id === connection.to)
          
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
                  // 只有正常狀態的連接線才有動畫效果
                  dashArray: connection.status === 'normal' ? '10, 10' : undefined,
                  dashOffset: connection.status === 'normal' ? 
                            String(-time % 20) : undefined,  // 使用負值使動畫向右移動
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

  // 修改刪除風機的函數
  async function deleteTurbine(id: string) {
    setIsLoading(true);
    try {
      // 按照正確的順序刪除相關數據
      
      // 1. 先刪除連接線
      const { error: connError } = await supabase
        .from('connections')
        .delete()
        .or(`from_id.eq.${id},to_id.eq.${id}`);

      if (connError) {
        console.error('Error deleting connections:', connError);
        return;
      }

      // 2. 刪除健康狀況歷史記錄
      const { error: healthError } = await supabase
        .from('health_history')
        .delete()
        .eq('turbine_id', id);

      if (healthError) {
        console.error('Error deleting health history:', healthError);
        return;
      }

      // 3. 刪除發電歷史記錄
      const { error: powerError } = await supabase
        .from('power_history')
        .delete()
        .eq('turbine_id', id);

      if (powerError) {
        console.error('Error deleting power history:', powerError);
        return;
      }

      // 4. 刪除事件記錄
      const { error: eventError } = await supabase
        .from('turbine_events')
        .delete()
        .eq('turbine_id', id);

      if (eventError) {
        console.error('Error deleting events:', eventError);
        return;
      }

      // 5. 最後刪除風機本身
      const { error: turbineError } = await supabase
        .from('wind_turbines')
        .delete()
        .eq('id', id);

      if (turbineError) {
        console.error('Error deleting turbine:', turbineError);
        return;
      }

      // 6. 更新本地狀態
      setTurbines(prev => prev.filter(t => t.id !== id));
      setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
      setSelectedItem(null);

    } catch (error) {
      console.error('Error in deleting turbine:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // 新增刪除變電站的函數
  const deleteSubstation = async (id: string) => {
    setIsLoading(true);
    try {
      // 先刪除相關的連接線
      const relatedConnections = connections.filter(
        conn => conn.from === id || conn.to === id
      );
      
      for (const conn of relatedConnections) {
        await supabase
          .from('connections')
          .delete()
          .eq('id', conn.id);
      }

      // 刪除變電站
      const { error } = await supabase
        .from('substations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting substation:', error);
        return;
      }

      // 更新本地狀態
      setSubstations(prev => prev.filter(s => s.id !== id));
      setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
      setSelectedItem(null);
    } catch (error) {
      console.error('Error in deleting substation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 新增刪除連接線的函數
  const deleteConnection = async (id: number) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting connection:', error);
        return;
      }

      // 更新本地狀態
      setConnections(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error in deleting connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 新增計算風機狀態數量的函數
  const getTurbineStatusCounts = () => {
    return turbines.reduce(
      (acc, turbine) => {
        acc[turbine.status]++;
        return acc;
      },
      { normal: 0, warning: 0, error: 0 }
    );
  };

  return (
    <div className="flex flex-col h-screen">
      <TitleBar username="系統管理員" />
      <div className="flex flex-1 pt-14">
        {isLoading && <LoadingSpinner />}
        <SidePanel 
          selectedItem={selectedItem} 
          setSelectedItem={setSelectedItem}
          updateTurbineStatus={updateTurbineStatus}
          deleteTurbine={deleteTurbine}
          deleteSubstation={deleteSubstation}
          deleteConnection={deleteConnection}
        />
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-9 gap-4 m-4">
            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <Wind className="w-6 h-6 text-blue-500 mb-2" />
                  <p className="text-sm text-gray-500">Total Turbines</p>
                  <p className="text-lg font-bold">{turbines.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-green-500 mb-2 flex items-center justify-center text-white">
                    <Wind className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-gray-500">Normal Operation</p>
                  <p className="text-lg font-bold text-green-600">{getTurbineStatusCounts().normal}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-blue-500 mb-2 flex items-center justify-center text-white">
                    <Wind className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-gray-500">Maintenance Required</p>
                  <p className="text-lg font-bold text-blue-600">{getTurbineStatusCounts().warning}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-red-500 mb-2 flex items-center justify-center text-white">
                    <Wind className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-gray-500">Fault Shutdown</p>
                  <p className="text-lg font-bold text-red-600">{getTurbineStatusCounts().error}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <Zap className="w-6 h-6 text-green-500 mb-2" />
                  <p className="text-sm text-gray-500">Total Power Output</p>
                  <p className="text-lg font-bold">{totalPower.toFixed(1)}<span className="text-sm">MW</span></p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <Wind className="w-6 h-6 text-cyan-500 mb-2" />
                  <p className="text-sm text-gray-500">Average Wind Speed</p>
                  <p className="text-lg font-bold">{averageWindSpeed.toFixed(1)}<span className="text-sm">m/s</span></p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <Thermometer className="w-6 h-6 text-red-500 mb-2" />
                  <p className="text-sm text-gray-500">Average Temperature</p>
                  <p className="text-lg font-bold">{averageTemperature.toFixed(1)}<span className="text-sm">°C</span></p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <Droplets className="w-6 h-6 text-blue-500 mb-2" />
                  <p className="text-sm text-gray-500">Average Humidity</p>
                  <p className="text-lg font-bold">{averageHumidity.toFixed(1)}<span className="text-sm">%</span></p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <Battery className="w-6 h-6 text-yellow-500 mb-2" />
                  <p className="text-sm text-gray-500">Total Substations</p>
                  <p className="text-lg font-bold">{substations.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex-grow m-4 rounded-lg overflow-hidden mb-14">
            <MapContainer
              center={[24.0056628, 119.9879360] as LatLngTuple}
              zoom={12}
              style={{ height: 'calc(100% - 1rem)', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapEvents 
                setSelectedItem={setSelectedItem}
                isAddingTurbine={isAddingTurbine}
                isAddingSubstation={isAddingSubstation}
                setTurbines={setTurbines}
                setSubstations={setSubstations}
              />
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
          <div className="fixed bottom-6 right-6 z-[1002]">
            <div className="relative">
              <button
                onClick={() => setIsControlsOpen(!isControlsOpen)}
                className={`w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:bg-blue-600 ${
                  isControlsOpen ? 'rotate-45' : ''
                }`}
              >
                <Plus className="w-6 h-6" />
              </button>

              {isControlsOpen && (
                <div className="absolute bottom-full right-1 mb-3 space-y-3">
                  <button
                    onClick={() => {
                      setIsAddingTurbine(!isAddingTurbine);
                      setIsAddingSubstation(false);
                      setIsConnecting(false);
                    }}
                    className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
                      isAddingTurbine 
                        ? 'bg-green-500 hover:bg-green-600 text-white' 
                        : 'bg-white hover:bg-gray-100 text-green-500'
                    }`}
                    title={isAddingTurbine ? 'Cancel Add' : 'Add Turbine'}
                  >
                    <Wind className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => {
                      setIsAddingSubstation(!isAddingSubstation);
                      setIsAddingTurbine(false);
                      setIsConnecting(false);
                    }}
                    className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
                      isAddingSubstation 
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                        : 'bg-white hover:bg-gray-100 text-yellow-500'
                    }`}
                    title={isAddingSubstation ? 'Cancel Add' : 'Add Substation'}
                  >
                    <Battery className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => {
                      setIsConnecting(!isConnecting);
                      setConnectingFrom(null);
                    }}
                    className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
                      isConnecting 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                        : 'bg-white hover:bg-gray-100 text-blue-500'
                    }`}
                    title={isConnecting ? 'Cancel Connection' : 'Add Connection'}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M13 10V3L4 14h7v7l9-11h-7z" 
                      />
                    </svg>
                  </button>

                  <button
                    onClick={() => {
                      setTurbines([]);
                      setSubstations([]);
                      setConnections([]);
                    }}
                    className="w-12 h-12 rounded-full bg-white hover:bg-gray-100 shadow-lg flex items-center justify-center transition-all duration-300 text-red-500"
                    title="Reset All"
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WindFarmMap