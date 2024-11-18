import { WindTurbine } from '@/types';
import { HealthScore, HealthCalculationResult } from './types';
import { supabase } from '@/lib/supabase';

const checkPowerEfficiency = (power: number, expectedPower: number): HealthCalculationResult => {
  const powerEfficiency = (power / expectedPower) * 100;
  if (powerEfficiency < 60) {
    return {
      deduction: 20,
      issue: 'Low power generation efficiency'
    };
  } else if (powerEfficiency < 80) {
    return {
      deduction: 10,
      issue: 'Reduced power generation'
    };
  }
  return { deduction: 0 };
};

const checkTemperature = (temperature: number): HealthCalculationResult => {
  if (temperature > 35) {
    return {
      deduction: 15,
      issue: 'High temperature detected'
    };
  } else if (temperature > 30) {
    return {
      deduction: 5,
      issue: 'Temperature slightly elevated'
    };
  }
  return { deduction: 0 };
};

export const calculateHealthScore = async (turbine: WindTurbine): Promise<HealthScore> => {
  let score = 100;
  const issues: string[] = [];

  // Check operational status
  if (turbine.status === 'error') {
    score -= 40;
    issues.push('Turbine in error state');
  } else if (turbine.status === 'warning') {
    score -= 20;
    issues.push('Turbine needs maintenance');
  }

  // Check power efficiency
  const powerCheck = checkPowerEfficiency(turbine.power, 8.0);
  score -= powerCheck.deduction;
  if (powerCheck.issue) issues.push(powerCheck.issue);

  // Check temperature
  const tempCheck = checkTemperature(turbine.temperature);
  score -= tempCheck.deduction;
  if (tempCheck.issue) issues.push(tempCheck.issue);

  const status = score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical';

  // 儲存健康分數到歷史記錄
  try {
    const { error } = await supabase
      .from('health_history')
      .insert({
        turbine_id: turbine.id,
        health_score: score,
        status,
        issues,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving health history:', error);
    }
  } catch (error) {
    console.error('Error:', error);
  }

  return {
    score: Math.max(0, score),
    status,
    issues
  };
}; 