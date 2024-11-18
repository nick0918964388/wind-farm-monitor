import { Wind, Zap, Thermometer, Droplets } from 'lucide-react';
import { WindTurbine } from '@/types';

interface MetricsSectionProps {
  turbine: WindTurbine;
}

export const MetricsSection = ({ turbine }: MetricsSectionProps) => {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-1">
          <Zap className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-gray-600">Power Output</span>
        </div>
        <div className="text-2xl font-bold text-blue-600">
          {turbine.power.toFixed(2)}
          <span className="text-sm ml-1">MW</span>
        </div>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-1">
          <Wind className="h-4 w-4 text-gray-600" />
          <span className="text-sm text-gray-600">Wind Speed</span>
        </div>
        <div className="text-2xl font-bold text-gray-600">
          {turbine.windSpeed.toFixed(1)}
          <span className="text-sm ml-1">m/s</span>
        </div>
      </div>
      <div className="bg-orange-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-1">
          <Thermometer className="h-4 w-4 text-orange-600" />
          <span className="text-sm text-gray-600">Temperature</span>
        </div>
        <div className="text-2xl font-bold text-orange-600">
          {turbine.temperature.toFixed(1)}
          <span className="text-sm ml-1">°C</span>
        </div>
      </div>
      <div className="bg-slate-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-1">
          <Droplets className="h-4 w-4 text-slate-600" />
          <span className="text-sm text-gray-600">Humidity</span>
        </div>
        <div className="text-2xl font-bold text-slate-600">
          {turbine.humidity.toFixed(1)}
          <span className="text-sm ml-1">%</span>
        </div>
      </div>
    </div>
  );
}; 