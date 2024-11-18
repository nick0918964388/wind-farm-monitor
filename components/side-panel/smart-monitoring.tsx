import { AlertTriangle } from 'lucide-react';
import { WindTurbine } from '@/types';
import { calculateHealthScore } from './utils';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { useState, useEffect } from 'react';
import { HealthScore } from './types';

interface SmartMonitoringProps {
  turbine: WindTurbine;
  onHealthScoreCalculated?: (score: number) => void;
}

export const SmartMonitoring = ({ turbine, onHealthScoreCalculated }: SmartMonitoringProps) => {
  const [health, setHealth] = useState<HealthScore>({
    score: 100,
    status: 'good',
    issues: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const result = await calculateHealthScore(turbine);
        setHealth(result);
        if (onHealthScoreCalculated) {
          onHealthScoreCalculated(result.score);
        }
      } catch (error) {
        console.error('Error calculating health score:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHealth();
  }, [turbine, onHealthScoreCalculated]);

  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <TooltipPrimitive.Provider>
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
              {health.issues.map((issue: string, index: number) => (
                <li key={index} className="text-sm flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <TooltipPrimitive.Root>
          <TooltipPrimitive.Trigger asChild>
            <div className="w-full bg-gray-200 rounded-full h-2.5 cursor-help">
              <div 
                className={`h-2.5 rounded-full ${
                  health.status === 'good' ? 'bg-green-500' :
                  health.status === 'warning' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${health.score}%` }}
              />
            </div>
          </TooltipPrimitive.Trigger>
          
          <TooltipPrimitive.Content
            className="bg-black/90 text-white text-sm rounded-lg p-4 max-w-sm z-[1002]"
            sideOffset={5}
          >
            <div className="space-y-2">
              <div className="font-medium">Health Score Calculation</div>
              <div className="space-y-1 text-sm">
                <div>Base Score: 100</div>
                <div className="text-gray-300">Deductions:</div>
                <ul className="list-disc pl-4 space-y-1 text-gray-300">
                  <li>Error State: -40</li>
                  <li>Warning State: -20</li>
                  <li>Low Power Efficiency (&lt;60%): -20</li>
                  <li>Reduced Power Efficiency (&lt;80%): -10</li>
                  <li>High Temperature (&gt;35°C): -15</li>
                  <li>Elevated Temperature (&gt;30°C): -5</li>
                </ul>
                <div className="pt-2 border-t border-gray-700">
                  Current Score: {health.score}
                </div>
              </div>
            </div>
            <TooltipPrimitive.Arrow className="fill-black/90" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Root>
      </div>
    </TooltipPrimitive.Provider>
  );
}; 