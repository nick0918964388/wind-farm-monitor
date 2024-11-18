import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { HealthData } from '@/types';

interface HealthTrendProps {
  healthHistory: HealthData[];
  timeRange: 'week' | 'month' | 'year';
  onTimeRangeChange: (range: 'week' | 'month' | 'year') => void;
  isLoading: boolean;
}

export const HealthTrend = ({
  healthHistory,
  timeRange,
  onTimeRangeChange,
  isLoading
}: HealthTrendProps) => {
  if (isLoading) {
    return <div className="h-[200px] flex items-center justify-center">
      <span>Loading...</span>
    </div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-gray-700">Health Score History</h3>
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
          <LineChart data={healthHistory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              fontSize={12}
              tick={{ fill: '#6B7280' }}
            />
            <YAxis 
              fontSize={12}
              tick={{ fill: '#6B7280' }}
              domain={[0, 100]}
              label={{ 
                value: 'Health Score', 
                angle: -90, 
                position: 'insideLeft',
                fill: '#6B7280'
              }}
            />
            <RechartsTooltip
              contentStyle={{ 
                backgroundColor: 'white',
                border: '1px solid #E5E7EB'
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="Health Score"
            />
            {/* 臨界值線 */}
            <Line
              type="monotone"
              dataKey={() => 80}
              stroke="#22C55E"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="Good Threshold"
            />
            <Line
              type="monotone"
              dataKey={() => 60}
              stroke="#EAB308"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="Warning Threshold"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}; 