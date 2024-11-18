export interface HealthScore {
  score: number;
  status: 'good' | 'warning' | 'critical';
  issues: string[];
}

export interface HealthCalculationResult {
  deduction: number;
  issue?: string;
} 