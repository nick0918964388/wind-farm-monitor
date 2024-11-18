import { useState, useEffect, useRef, useCallback } from 'react'
import { Wind, Battery, Pencil, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabase'
import type { PowerData, SidePanelProps, TurbineEvent, HealthData } from '@/types'
import { SmartMonitoring } from './smart-monitoring'
import { MetricsSection } from './metrics-section'
import { PowerTrend } from './power-trend'
import { EventHistory, EventHistoryHeader } from './event-history'
import { StatusControl } from './status-control'
import { SectionTitle } from './section-title'
import { HealthTrend } from './health-trend'
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog'
import { MaintenanceAlerts } from './maintenance-alerts'
import { calculateHealthScore } from './utils'
import debounce from 'lodash/debounce'

type TimeRange = 'week' | 'month' | 'year';

// 添加 Loading Skeleton 組件
const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-[200px] bg-gray-200 rounded-lg"></div>
  </div>
);

export const SidePanel = ({ 
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
  const [powerTimeRange, setPowerTimeRange] = useState<TimeRange>('week');
  const [healthTimeRange, setHealthTimeRange] = useState<TimeRange>('week');
  const [sections, setSections] = useState({
    smartMonitoring: true,
    metrics: true,
    powerTrend: true,
    eventHistory: true,
    statusControl: false,
    healthTrend: true,
    maintenanceAlerts: true
  });
  const [healthHistory, setHealthHistory] = useState<HealthData[]>([]);
  const [isLoadingHealthHistory, setIsLoadingHealthHistory] = useState(false);
  const [healthScore, setHealthScore] = useState(0);

  // 使用 useRef 來存儲最新的請求
  const currentRequest = useRef<string | null>(null);

  // 使用 debounce 包裝資料讀取函數
  const debouncedFetchData = useCallback(
    debounce((turbineId: string, timeRange: TimeRange) => {
      fetchPowerHistory(turbineId);
      fetchHealthHistory(turbineId);
    }, 300),  // 300ms 延遲
    []
  );

  const toggleSection = (sectionName: keyof typeof sections) => {
    setSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // 從 Supabase 讀取發電歷史數據
  const fetchPowerHistory = async (turbineId: string) => {
    const requestId = Date.now().toString();
    currentRequest.current = requestId;
    
    setIsLoadingHistory(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (powerTimeRange) {
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

      // 確保這是最新的請求
      if (currentRequest.current !== requestId) return;

      if (error) throw error;

      if (data) {
        const formattedData = data.map(record => ({
          date: new Date(record.recorded_at).toLocaleDateString(),
          power: Number(record.power),
          expectedPower: Number(record.expected_power),
          upperLimit: Number(record.upper_limit),
          lowerLimit: Number(record.lower_limit)
        }));
        
        setPowerHistory(formattedData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      if (currentRequest.current === requestId) {
        setIsLoadingHistory(false);
      }
    }
  };

  const fetchTurbineEvents = async (turbineId: string) => {
    try {
      const { data, error } = await supabase
        .from('turbine_events')
        .select('*')
        .eq('turbine_id', turbineId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setEvents(data.map(event => ({
          date: new Date(event.created_at).toLocaleString(),
          event: event.event,
          priority: event.priority
        })));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchHealthHistory = async (turbineId: string) => {
    setIsLoadingHealthHistory(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (healthTimeRange) {
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
        .from('health_history')
        .select('*')
        .eq('turbine_id', turbineId)
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedData = data.map(record => ({
          date: new Date(record.recorded_at).toLocaleDateString(),
          score: record.health_score,
          status: record.status
        }));
        setHealthHistory(formattedData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoadingHealthHistory(false);
    }
  };

  useEffect(() => {
    if (selectedItem && 'windSpeed' in selectedItem) {
      debouncedFetchData(selectedItem.id, powerTimeRange);
    }
    
    return () => {
      currentRequest.current = null;  // 清理當前請求
    };
  }, [selectedItem?.id, powerTimeRange, healthTimeRange]);

  // 更新名稱的函數
  const updateItemName = async () => {
    if (!selectedItem || !editedName.trim()) return;

    try {
      if ('windSpeed' in selectedItem) {
        const { error } = await supabase
          .from('wind_turbines')
          .update({ 
            name: editedName,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedItem.id);

        if (error) throw error;
        selectedItem.name = editedName;
      } else {
        const { error } = await supabase
          .from('substations')
          .update({ 
            name: editedName,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedItem.id);

        if (error) throw error;
        selectedItem.name = editedName;
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateItemName();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (!selectedItem) return null;

  return (
    <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)}>
      <div className="h-full flex flex-col max-w-[85vw] w-full mx-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-4">
              {/* Title and Edit Section */}
              <div className="flex items-center space-x-2">
                {'windSpeed' in selectedItem ? (
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
                    <h2 className="text-2xl font-bold">{selectedItem.name}</h2>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setEditedName(selectedItem.name);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <Pencil className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>

              {'windSpeed' in selectedItem && (
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${
                    selectedItem.status === 'normal' ? 'bg-green-500' :
                    selectedItem.status === 'warning' ? 'bg-blue-500' : 'bg-red-500'
                  }`}></span>
                  <span className="font-medium">
                    {selectedItem.status === 'normal' ? 'Operating Normal' :
                     selectedItem.status === 'warning' ? 'Maintenance Required' : 'Fault Shutdown'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {'windSpeed' in selectedItem && (
            <div className="text-xs text-gray-400">
              Last Updated: {new Date().toLocaleString()}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4">
          {'windSpeed' in selectedItem ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-8">
                <SectionTitle 
                  title="Smart Monitoring" 
                  isOpen={sections.smartMonitoring}
                  onToggle={() => toggleSection('smartMonitoring')}
                >
                  <SmartMonitoring 
                    turbine={selectedItem} 
                    onHealthScoreCalculated={(score) => {
                      setHealthScore(score);
                    }}
                  />
                </SectionTitle>

                

                <SectionTitle 
                  title="Metrics" 
                  isOpen={sections.metrics}
                  onToggle={() => toggleSection('metrics')}
                >
                  <MetricsSection turbine={selectedItem} />
                </SectionTitle>

                <SectionTitle 
                  title="Event History" 
                  isOpen={sections.eventHistory}
                  onToggle={() => toggleSection('eventHistory')}
                  rightContent={<EventHistoryHeader events={events} />}
                >
                  <EventHistory events={events} />
                </SectionTitle>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                <SectionTitle 
                  title="Power Generation Trend" 
                  isOpen={sections.powerTrend}
                  onToggle={() => toggleSection('powerTrend')}
                >
                  <PowerTrend 
                    powerHistory={powerHistory}
                    timeRange={powerTimeRange}
                    onTimeRangeChange={setPowerTimeRange}
                    isLoading={isLoadingHistory}
                  />
                </SectionTitle>

                <SectionTitle 
                  title="Health Score Trend" 
                  isOpen={sections.healthTrend}
                  onToggle={() => toggleSection('healthTrend')}
                >
                  <HealthTrend 
                    healthHistory={healthHistory}
                    timeRange={healthTimeRange}
                    onTimeRangeChange={setHealthTimeRange}
                    isLoading={isLoadingHealthHistory}
                  />
                </SectionTitle>
                <SectionTitle   
                  title="Maintenance Alerts" 
                  isOpen={sections.maintenanceAlerts}
                  onToggle={() => toggleSection('maintenanceAlerts')}
                >
                  <MaintenanceAlerts 
                    turbineId={selectedItem.id} 
                    healthScore={healthScore}
                  />
                </SectionTitle>
                <SectionTitle 
                  title="Status Control" 
                  isOpen={sections.statusControl}
                  onToggle={() => toggleSection('statusControl')}
                >
                  <StatusControl 
                    status={selectedItem.status}
                    onStatusChange={(status) => updateTurbineStatus(selectedItem.id, status)}
                  />
                </SectionTitle>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <SectionTitle 
                title="Substation Info" 
                isOpen={true}
                onToggle={() => {}}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Battery className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-gray-600">Capacity</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {selectedItem.capacity.toFixed(2)}
                      <span className="text-sm ml-1">MW</span>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Wind className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-gray-600">Load</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedItem.load.toFixed(2)}
                      <span className="text-sm ml-1">%</span>
                    </div>
                  </div>
                </div>
              </SectionTitle>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-4 flex justify-end space-x-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>確認刪除</AlertDialogTitle>
                <AlertDialogDescription>
                  {`確定要刪除${
                    'windSpeed' in selectedItem! ? '風機' : '變電站'
                  } "${selectedItem!.name}" 嗎？此操作無法復原。`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button variant="outline">取消</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button 
                    variant="destructive"
                    onClick={async () => {
                      try {
                        if ('windSpeed' in selectedItem!) {
                          await deleteTurbine(selectedItem!.id);
                          setSelectedItem(null);
                        } else {
                          await deleteSubstation(selectedItem!.id);
                          setSelectedItem(null);
                        }
                      } catch (error) {
                        console.error('Error deleting item:', error);
                      }
                    }}
                  >
                    確認刪除
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Modal>
  );
}; 