import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area } from 'recharts';
import { PowerData } from '@/types';

interface PowerTrendProps {
  powerHistory: PowerData[];
  timeRange: 'week' | 'month' | 'year';
  onTimeRangeChange: (range: 'week' | 'month' | 'year') => void;
  isLoading: boolean;
}

export const PowerTrend = ({ 
  powerHistory, 
  timeRange, 
  onTimeRangeChange,
  isLoading 
}: PowerTrendProps) => {
  console.log('Power history data:', powerHistory);

  if (isLoading) {
    return <div className="h-[200px] flex items-center justify-center">
      <span>Loading...</span>
    </div>;
  }

  const formattedData = powerHistory.map(data => ({
    ...data,
    power: Number(data.power),
    expectedPower: Number(data.expectedPower),
    upperLimit: Number(data.upperLimit),
    lowerLimit: Number(data.lowerLimit)
  }));

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-gray-700">Power Generation Trend</h3>
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onTimeRangeChange('week')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              timeRange === 'week' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onTimeRangeChange('month')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              timeRange === 'month'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => onTimeRangeChange('year')}
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
          <LineChart 
            data={formattedData}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          >
            <defs>
              <linearGradient id="powerFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              fontSize={12}
              tick={{ fill: '#6B7280' }}
            />
            <YAxis 
              fontSize={12}
              tick={{ fill: '#6B7280' }}
              domain={['auto', 'auto']}
            />
            <RechartsTooltip
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
            {/* 實際發電量 */}
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
          <div className="w-3 h-3 bg-blue-500 opacity-30 mr-1"></div>
          <span>Actual Power</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-0.5 bg-green-500 mr-1" style={{ borderTop: '2px dashed #22C55E' }}></div>
          <span>Expected Power</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-0.5 bg-red-900 mr-1"></div>
          <span>Warning Range</span>
        </div>
      </div>
    </div>
  );
}; 