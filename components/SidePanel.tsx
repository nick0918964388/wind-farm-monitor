import { Button } from "@/components/ui/button"
import { Wind, Battery, Zap, Thermometer, Droplets, X, Trash2, Pencil, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { PowerHistoryRecord, SidePanelProps, WindTurbine, PowerData, TurbineEvent } from '@/types'
import { Modal } from '@/components/ui/modal'

type TimeRange = 'week' | 'month' | 'year';

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
  const [events, setEvents] = useState<TurbineEvent[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sections, setSections] = useState({
    metrics: true,
    powerTrend: true,
    eventHistory: true,
    statusControl: false,
    smartMonitoring: true
  });
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  // 從 Supabase 讀取發電歷史數據
  const fetchPowerHistory = async (turbineId: string) => {
    setIsLoadingHistory(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // 根據選擇的時間範圍設定起始日期
      switch (timeRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

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

  // Add new function to fetch events
  const fetchTurbineEvents = async (turbineId: string) => {
    try {
      const { data, error } = await supabase
        .from('turbine_events')
        .select('*')
        .eq('turbine_id', turbineId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching turbine events:', error);
        return;
      }

      if (data) {
        const formattedEvents = data.map(event => ({
          date: new Date(event.created_at).toLocaleString(),
          event: event.event,
          priority: event.priority
        }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Modify useEffect to fetch both power history and events when dialog opens
  useEffect(() => {
    if (selectedItem && 'windSpeed' in selectedItem) {
      fetchPowerHistory(selectedItem.id);
      fetchTurbineEvents(selectedItem.id);
    }
  }, [selectedItem?.id, timeRange]);

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
    const threshold = 0.1; // Set threshold to 10%
    const upperDiff = (upperLimit - power) / upperLimit;
    const lowerDiff = (power - lowerLimit) / lowerLimit;
    
    if (upperDiff < threshold) {
      return 'Near upper limit, please check';
    } else if (lowerDiff < threshold) {
      return 'Near lower limit, please check';
    }
    return null;
  };

  const renderPowerChart = (turbine: WindTurbine) => {
    if (isLoadingHistory) {
      return <div className="h-[200px] flex items-center justify-center">
        <span>Loading...</span>
      </div>;
    }

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-gray-700">Power Generation Trend</h3>
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setTimeRange('week');
                fetchPowerHistory(turbine.id);
              }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === 'week' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => {
                setTimeRange('month');
                fetchPowerHistory(turbine.id);
              }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === 'month'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => {
                setTimeRange('year');
                fetchPowerHistory(turbine.id);
              }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === 'year'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Year
            </button>
          </div>
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
                name="Warning Upper Limit"
              />
              {/* 警戒下限線 */}
              <Line 
                type="monotone"
                dataKey="lowerLimit"
                stroke="#991B1B"
                strokeWidth={1}
                dot={false}
                name="Warning Lower Limit"
              />
              {/* 預計發電量線 */}
              <Line 
                type="monotone"
                dataKey="expectedPower"
                stroke="#22C55E"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Expected Power"
              />
              {/* 實際發電量線 */}
              <Line 
                type="monotone"
                dataKey="power"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="Actual Power"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-end space-x-4 text-sm">
          <div className="flex items-center">
            <span className="w-3 h-0.5 bg-blue-500 mr-1"></span>
            <span>Actual Power</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-0.5 bg-green-500 mr-1 border-dashed border-t-2"></span>
            <span>Expected Power</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-0.5 bg-red-900 mr-1"></span>
            <span>Warning Range</span>
          </div>
        </div>
      </div>
    );
  };

  // 切換區塊展開/收合的函數
  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 修改 SectionTitle 組，使其能夠接受右側內容
  const SectionTitle = ({ 
    title, 
    section,
    children,
    rightContent
  }: { 
    title: string, 
    section: keyof typeof sections,
    children: React.ReactNode,
    rightContent?: React.ReactNode 
  }) => (
    <div className="space-y-2">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => toggleSection(section)}
      >
        <div className="flex items-center space-x-2">
          {sections[section] ? 
            <ChevronDown className="w-5 h-5 text-gray-500" /> : 
            <ChevronRight className="w-5 h-5 text-gray-500" />
          }
          <h3 className="font-medium text-gray-700">{title}</h3>
        </div>
        {rightContent}
      </div>
      {sections[section] && children}
    </div>
  );

  // 新增一個函數來計算不同優先級的事件數量
  const getEventCounts = (events: TurbineEvent[]) => {
    return events.reduce(
      (acc, event) => {
        if (event.priority === 1) acc.high++;
        else if (event.priority === 2) acc.medium++;
        else acc.low++;
        return acc;
      },
      { high: 0, medium: 0, low: 0, total: events.length }
    );
  };

  // 在 SidePanel 組件中添加計算健康度的函數
  const calculateHealthScore = (turbine: WindTurbine): {
    score: number;
    status: 'good' | 'warning' | 'critical';
    issues: string[];
  } => {
    let score = 100;
    const issues: string[] = [];

    // 檢查運行狀態
    if (turbine.status === 'error') {
      score -= 40;
      issues.push('Turbine in error state');
    } else if (turbine.status === 'warning') {
      score -= 20;
      issues.push('Turbine needs maintenance');
    }

    // 檢查發電效率
    const expectedPower = 8.0; // 預期發電量
    const powerEfficiency = (turbine.power / expectedPower) * 100;
    if (powerEfficiency < 60) {
      score -= 20;
      issues.push('Low power generation efficiency');
    } else if (powerEfficiency < 80) {
      score -= 10;
      issues.push('Reduced power generation');
    }

    // 檢查溫度是否在正常範圍
    if (turbine.temperature > 35) {
      score -= 15;
      issues.push('High temperature detected');
    } else if (turbine.temperature > 30) {
      score -= 5;
      issues.push('Temperature slightly elevated');
    }

    // 根據分數決定狀態
    const status = score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical';

    return {
      score: Math.max(0, score),
      status,
      issues
    };
  };

  if (!selectedItem) return null

  return (
    <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)}>
      <div className="h-full flex flex-col max-w-[85vw] w-full mx-auto">
        {/* 標題列 */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-4">
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

              {'windSpeed' in selectedItem! && (
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${
                    selectedItem!.status === 'normal' ? 'bg-green-500' :
                    selectedItem!.status === 'warning' ? 'bg-blue-500' : 'bg-red-500'
                  }`}></span>
                  <span className="font-medium">
                    {selectedItem!.status === 'normal' ? 'Operating Normal' :
                     selectedItem!.status === 'warning' ? 'Maintenance Required' : 'Fault Shutdown'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {'windSpeed' in selectedItem! && (
            <div className="text-xs text-gray-400">
              Last Updated: {new Date().toLocaleString()}
            </div>
          )}
        </div>

        {/* 內容區域 - 修改為兩列布局 */}
        <div className="flex-1 p-4">
          {'windSpeed' in selectedItem! ? (
            <div className="space-y-4">
              {/* 主要數據和趨勢圖並排 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-8">
                  {/* 智能提醒區塊 - 放在 Metrics 區塊之前 */}
                  <SectionTitle title="Smart Monitoring" section="smartMonitoring">
                    {(() => {
                      const health = calculateHealthScore(selectedItem as WindTurbine);
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className={`w-4 h-4 rounded-full ${
                                health.status === 'good' ? 'bg-green-500' :
                                health.status === 'warning' ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}></div>
                              <span className="text-lg font-medium">Health Score: {health.score}</span>
                            </div>
                            <div className="text-sm">
                              {health.status === 'good' ? 'Normal Range (80-100)' :
                               health.status === 'warning' ? 'Warning Range (60-79)' :
                               'Critical Range (0-59)'}
                            </div>
                          </div>
                          
                          {health.issues.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-700 mb-2">
                                Detected Issues:
                              </div>
                              <ul className="space-y-1">
                                {health.issues.map((issue, index) => (
                                  <li key={index} className="text-sm flex items-center space-x-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                    <span>{issue}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                health.status === 'good' ? 'bg-green-500' :
                                health.status === 'warning' ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${health.score}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })()}
                  </SectionTitle>

                  {/* Metrics Section */}
                  <SectionTitle title="Metrics" section="metrics">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Zap className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-600">Power Output</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedItem!.power.toFixed(2)}
                          <span className="text-sm ml-1">MW</span>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Wind className="h-4 w-4 text-gray-600" />
                          <span className="text-sm text-gray-600">Wind Speed</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-600">
                          {selectedItem!.windSpeed.toFixed(1)}
                          <span className="text-sm ml-1">m/s</span>
                        </div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Thermometer className="h-4 w-4 text-orange-600" />
                          <span className="text-sm text-gray-600">Temperature</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-600">
                          {selectedItem!.temperature.toFixed(1)}
                          <span className="text-sm ml-1">°C</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Droplets className="h-4 w-4 text-slate-600" />
                          <span className="text-sm text-gray-600">Humidity</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-600">
                          {selectedItem!.humidity.toFixed(1)}
                          <span className="text-sm ml-1">%</span>
                        </div>
                      </div>
                    </div>
                  </SectionTitle>

                  {/* Event History Section */}
                  <SectionTitle 
                    title="Event History" 
                    section="eventHistory"
                    rightContent={
                      <div className="flex items-center space-x-2 text-sm">
                        {(() => {
                          const counts = getEventCounts(events);
                          return (
                            <>
                              <span className="text-gray-500">Total: {counts.total}</span>
                              {counts.high > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                                  High: {counts.high}
                                </span>
                              )}
                              {counts.medium > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                                  Medium: {counts.medium}
                                </span>
                              )}
                              {counts.low > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                  Low: {counts.low}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    }
                  >
                    <div className="bg-white rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-1/4">Time</TableHead>
                            <TableHead className="w-1/6">Priority</TableHead>
                            <TableHead>Event</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {events.map((event: TurbineEvent, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-sm">{event.date}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  event.priority === 1 ? 'bg-red-100 text-red-800' :
                                  event.priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {event.priority === 1 ? 'High' :
                                   event.priority === 2 ? 'Medium' : 'Low'}
                                </span>
                              </TableCell>
                              <TableCell className={`text-sm ${
                                event.priority === 1 ? 'text-red-600' :
                                event.priority === 2 ? 'text-yellow-600' :
                                'text-gray-600'
                              }`}>
                                {event.event}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </SectionTitle>
                </div>

                <div className="space-y-8">
                  {/* Power Generation Trend Section */}
                  <SectionTitle title="Power Generation Trend" section="powerTrend">
                    {renderPowerChart(selectedItem!)}
                  </SectionTitle>

                  {/* Status Control Section */}
                  <SectionTitle title="Status Control" section="statusControl">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={selectedItem!.status === 'normal' ? 'default' : 'outline'}
                        className={`flex-1 ${selectedItem!.status === 'normal' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                        onClick={() => updateTurbineStatus(selectedItem!.id, 'normal')}
                      >
                        <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                        Normal
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedItem!.status === 'warning' ? 'default' : 'outline'}
                        className={`flex-1 ${selectedItem!.status === 'warning' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                        onClick={() => updateTurbineStatus(selectedItem!.id, 'warning')}
                      >
                        <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                        Warning
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedItem!.status === 'error' ? 'default' : 'outline'}
                        className={`flex-1 ${selectedItem!.status === 'error' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                        onClick={() => updateTurbineStatus(selectedItem!.id, 'error')}
                      >
                        <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                        Error
                      </Button>
                    </div>
                  </SectionTitle>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 變電資訊 */}
              <SectionTitle title="Substation Info" section="metrics">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Battery className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-gray-600">Capacity</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {selectedItem!.capacity.toFixed(2)}
                      <span className="text-sm ml-1">MW</span>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-gray-600">Load</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedItem!.load.toFixed(2)}
                      <span className="text-sm ml-1">%</span>
                    </div>
                  </div>
                </div>
              </SectionTitle>
            </div>
          )}
        </div>

        {/* 底部操作區 */}
        <div className="border-t px-4 py-4 flex justify-end space-x-2">
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
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default SidePanel 