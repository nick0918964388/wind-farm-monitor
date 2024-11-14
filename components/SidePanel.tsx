import { Button } from "@/components/ui/button"
import { Wind, Battery, Zap, Thermometer, Droplets, X } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { PowerHistoryRecord, SidePanelProps, WindTurbine, PowerData, TurbineEvent } from '@/types'

const SidePanel = ({ selectedItem, setSelectedItem, updateTurbineStatus }: SidePanelProps) => {
  const [powerHistory, setPowerHistory] = useState<PowerData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 從 Supabase 讀取發電歷史數據
  const fetchPowerHistory = async (turbineId: string) => {
    setIsLoadingHistory(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const { data, error } = await supabase
        .from('power_history')
        .select('*')
        .eq('turbine_id', turbineId)
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) {
        console.error('Error fetching power history:', error);
        return;
      }

      if (data) {
        const formattedData = data.map((record: PowerHistoryRecord) => ({
          date: new Date(record.recorded_at).toLocaleDateString(),
          power: record.power
        }));
        setPowerHistory(formattedData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 當選中的風機改變時，讀取新的歷史數據
  useEffect(() => {
    if (selectedItem && 'windSpeed' in selectedItem) {
      fetchPowerHistory(selectedItem.id);
    }
  }, [selectedItem?.id]);

  // 生成並儲存模擬數據（僅用於初始化）
  const generateAndSavePowerHistory = async (turbineId: string, currentPower: number) => {
    const now = new Date();
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const randomVariation = (Math.random() - 0.5) * 2;
      const power = Math.max(0, currentPower + randomVariation);
      
      data.push({
        turbine_id: turbineId,
        power: Number(power.toFixed(2)),
        recorded_at: date.toISOString(),
        created_at: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('power_history')
      .insert(data);

    if (error) {
      console.error('Error saving power history:', error);
    }
  };

  if (!selectedItem) return null

  const renderPowerChart = (turbine: WindTurbine) => {
    if (isLoadingHistory) {
      return <div className="h-[200px] flex items-center justify-center">
        <span>載入中...</span>
      </div>;
    }

    return (
      <div className="space-y-2">
        <h3 className="font-medium text-gray-700">近一週發電趨勢</h3>
        <div className="h-[200px] w-full bg-white rounded-lg border p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={powerHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tick={{ fill: '#6B7280' }}
              />
              <YAxis 
                fontSize={12}
                tick={{ fill: '#6B7280' }}
                label={{ 
                  value: 'MW', 
                  angle: -90, 
                  position: 'insideLeft',
                  fill: '#6B7280'
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="power" 
                stroke="#22C55E"
                strokeWidth={2}
                dot={false}
                name="發電量"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-y-14 left-0 w-96 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-[1000]">
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

              {/* 加入趨勢圖 */}
              {renderPowerChart(selectedItem)}

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
                      {selectedItem.events.map((event: TurbineEvent, index) => (
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
    </div>
  )
}

export default SidePanel 