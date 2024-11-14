import { Button } from "@/components/ui/button"
import { Wind, Battery, Zap, Thermometer, Droplets, X, Trash2, Pencil, AlertTriangle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { PowerHistoryRecord, SidePanelProps, WindTurbine, PowerData, TurbineEvent } from '@/types'
import { Modal } from '@/components/ui/modal'

const SidePanel = ({ 
  selectedItem, 
  setSelectedItem, 
  updateTurbineStatus,
  deleteTurbine,
  deleteSubstation,
  deleteConnection 
}: SidePanelProps) => {
  const [powerHistory, setPowerHistory] = useState<PowerData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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
          power: record.power,
          expectedPower: record.expected_power,
          upperLimit: record.upper_limit,
          lowerLimit: record.lower_limit
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

  // 當選中項目改變時，重置編輯狀態
  useEffect(() => {
    setIsEditing(false);
    setEditedName('');
  }, [selectedItem?.id]);

  // 更新名稱的函數
  const updateItemName = async () => {
    if (!selectedItem || !editedName.trim()) return;

    try {
      if ('windSpeed' in selectedItem) {
        // 更新風機名稱
        const { error } = await supabase
          .from('wind_turbines')
          .update({ 
            name: editedName,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedItem.id);

        if (error) throw error;
        
        // 更新本地狀態
        selectedItem.name = editedName;
      } else {
        // 更新變電站名稱
        const { error } = await supabase
          .from('substations')
          .update({ 
            name: editedName,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedItem.id);

        if (error) throw error;
        
        // 更新本地狀態
        selectedItem.name = editedName;
      }

      // 更新成功後關閉編輯模式
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  // 處理按鍵事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateItemName();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  // 檢查是否接近警戒值
  const checkWarningLimits = (power: number, upperLimit: number, lowerLimit: number) => {
    const threshold = 0.1; // 設定閾值為 10%
    const upperDiff = (upperLimit - power) / upperLimit;
    const lowerDiff = (power - lowerLimit) / lowerLimit;
    
    if (upperDiff < threshold) {
      return '接近上限，請進行檢查';
    } else if (lowerDiff < threshold) {
      return '接近下限，請進行檢查';
    }
    return null;
  };

  const renderPowerChart = (turbine: WindTurbine) => {
    if (isLoadingHistory) {
      return <div className="h-[200px] flex items-center justify-center">
        <span>載入中...</span>
      </div>;
    }

    // 檢查最新數據是否接近警戒值
    const latestData = powerHistory[powerHistory.length - 1];
    const warningMessage = latestData ? 
      checkWarningLimits(latestData.power, latestData.upperLimit, latestData.lowerLimit) : 
      null;

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-gray-700">近一週發電趨勢</h3>
          {warningMessage && (
            <div className="text-red-500 text-sm font-medium flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {warningMessage}
            </div>
          )}
        </div>
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
              {/* 警戒上限線 */}
              <Line 
                type="monotone"
                dataKey="upperLimit"
                stroke="#991B1B"
                strokeWidth={1}
                dot={false}
                name="警戒上限"
              />
              {/* 警戒下限線 */}
              <Line 
                type="monotone"
                dataKey="lowerLimit"
                stroke="#991B1B"
                strokeWidth={1}
                dot={false}
                name="警戒下限"
              />
              {/* 預計發電量線 */}
              <Line 
                type="monotone"
                dataKey="expectedPower"
                stroke="#22C55E"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="預計發電量"
              />
              {/* 實際發電量線 */}
              <Line 
                type="monotone"
                dataKey="power"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="實際發電量"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-end space-x-4 text-sm">
          <div className="flex items-center">
            <span className="w-3 h-0.5 bg-blue-500 mr-1"></span>
            <span>實際發電量</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-0.5 bg-green-500 mr-1 border-dashed border-t-2"></span>
            <span>預計發電量</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-0.5 bg-red-900 mr-1"></span>
            <span>警戒範圍</span>
          </div>
        </div>
      </div>
    );
  };

  if (!selectedItem) return null

  return (
    <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)}>
      <div className="h-full flex flex-col">
        {/* 標題列 */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-2">
            {'windSpeed' in selectedItem! ? (
              <Wind className="h-6 w-6 text-blue-500" />
            ) : (
              <Battery className="h-6 w-6 text-yellow-500" />
            )}
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={updateItemName}
                className="text-2xl font-bold bg-white border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold">
                  {selectedItem!.name}
                </h2>
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditedName(selectedItem!.name);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <Pencil className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 內容區域 */}
        <div className="flex-1 p-6">
          {'windSpeed' in selectedItem! ? (
            <div className="space-y-6">
              {/* 狀態指示器 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`w-3 h-3 rounded-full ${
                    selectedItem!.status === 'normal' ? 'bg-green-500' :
                    selectedItem!.status === 'warning' ? 'bg-blue-500' : 'bg-red-500'
                  }`}></span>
                  <span className="font-medium">
                    {selectedItem!.status === 'normal' ? '運轉正常' :
                     selectedItem!.status === 'warning' ? '需要維護' : '故障停機'}
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
                    {selectedItem!.power.toFixed(2)}
                    <span className="text-sm ml-1">MW</span>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Wind className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">風速</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedItem!.windSpeed.toFixed(1)}
                    <span className="text-sm ml-1">m/s</span>
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Thermometer className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-gray-600">溫度</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {selectedItem!.temperature.toFixed(1)}
                    <span className="text-sm ml-1">°C</span>
                  </div>
                </div>
                <div className="bg-cyan-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Droplets className="h-4 w-4 text-cyan-500" />
                    <span className="text-sm text-gray-600">濕度</span>
                  </div>
                  <div className="text-2xl font-bold text-cyan-600">
                    {selectedItem!.humidity.toFixed(1)}
                    <span className="text-sm ml-1">%</span>
                  </div>
                </div>
              </div>

              {/* 加入趨勢圖 */}
              {renderPowerChart(selectedItem!)}

              {/* 狀態控制 */}
              <div className="space-y-2">
                <h3 className="font-medium text-gray-700">狀態控制</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedItem!.status === 'normal' ? 'default' : 'outline'}
                    className={`flex-1 ${selectedItem!.status === 'normal' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                    onClick={() => updateTurbineStatus(selectedItem!.id, 'normal')}
                  >
                    <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                    正常
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedItem!.status === 'warning' ? 'default' : 'outline'}
                    className={`flex-1 ${selectedItem!.status === 'warning' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                    onClick={() => updateTurbineStatus(selectedItem!.id, 'warning')}
                  >
                    <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                    待修
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedItem!.status === 'error' ? 'default' : 'outline'}
                    className={`flex-1 ${selectedItem!.status === 'error' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                    onClick={() => updateTurbineStatus(selectedItem!.id, 'error')}
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
                      {selectedItem!.events.map((event: TurbineEvent, index) => (
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
            <div className="space-y-6">
              {/* 變電站資訊 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Battery className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">容量</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {selectedItem!.capacity.toFixed(2)}
                    <span className="text-sm ml-1">MW</span>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Zap className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-gray-600">負載</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedItem!.load.toFixed(2)}
                    <span className="text-sm ml-1">%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作區 */}
        <div className="border-t p-6 flex justify-end space-x-2">
          <Button 
            variant="destructive"
            onClick={() => {
              if ('windSpeed' in selectedItem!) {
                deleteTurbine(selectedItem!.id);
              } else {
                deleteSubstation(selectedItem!.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            刪除
          </Button>
          <Button variant="outline" onClick={() => setSelectedItem(null)}>
            關閉
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default SidePanel 