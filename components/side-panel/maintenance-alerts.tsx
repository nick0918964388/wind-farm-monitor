import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, CheckCircle, Clock, Tool } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface MaintenanceAlert {
  id: number;
  turbine_id: string;
  alert_type: 'health_score' | 'scheduled' | 'emergency';
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  health_score?: number;
  assigned_to?: string;
  created_at: string;
}

interface MaintenanceAlertsProps {
  turbineId: string;
  healthScore: number;
}

export const MaintenanceAlerts = ({ turbineId, healthScore }: MaintenanceAlertsProps) => {
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_alerts')
        .select('*')
        .eq('turbine_id', turbineId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAlertStatus = async (alertId: number, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      const { error } = await supabase
        .from('maintenance_alerts')
        .update({ status: newStatus })
        .eq('id', alertId);

      if (error) throw error;
      await fetchAlerts();
    } catch (error) {
      console.error('Error updating alert status:', error);
    }
  };

  // 當健康分數低於閾值時自動創建警報
  useEffect(() => {
    const createHealthAlert = async () => {
      if (healthScore < 60 && !alerts.some(a => 
        a.alert_type === 'health_score' && 
        a.status !== 'completed' &&
        a.health_score === healthScore
      )) {
        try {
          const { error } = await supabase
            .from('maintenance_alerts')
            .insert({
              turbine_id: turbineId,
              alert_type: 'health_score',
              status: 'pending',
              description: `Low health score detected: ${healthScore}`,
              health_score: healthScore,
              created_at: new Date().toISOString()
            });

          if (error) throw error;
          await fetchAlerts();
        } catch (error) {
          console.error('Error creating health alert:', error);
        }
      }
    };

    createHealthAlert();
  }, [healthScore, turbineId]);

  useEffect(() => {
    fetchAlerts();
  }, [turbineId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <Tool className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/6">Status</TableHead>
              <TableHead className="w-1/6">Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-1/6">Created At</TableHead>
              <TableHead className="w-1/6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(alert.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      alert.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      alert.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {alert.alert_type === 'health_score' ? 'Health Score Alert' :
                   alert.alert_type === 'scheduled' ? 'Scheduled Maintenance' :
                   'Emergency Maintenance'}
                </TableCell>
                <TableCell>{alert.description}</TableCell>
                <TableCell>
                  {new Date(alert.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  {alert.status !== 'completed' && (
                    <div className="flex space-x-2">
                      {alert.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => updateAlertStatus(alert.id, 'in_progress')}
                        >
                          Service Request
                        </Button>
                      )}
                      {alert.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => updateAlertStatus(alert.id, 'completed')}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}; 