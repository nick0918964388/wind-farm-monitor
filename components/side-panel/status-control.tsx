import { Button } from "@/components/ui/button";

interface StatusControlProps {
  status: 'normal' | 'warning' | 'error';
  onStatusChange: (status: 'normal' | 'warning' | 'error') => void;
}

export const StatusControl = ({ status, onStatusChange }: StatusControlProps) => {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={status === 'normal' ? 'default' : 'outline'}
        className={`flex-1 ${status === 'normal' ? 'bg-green-500 hover:bg-green-600' : ''}`}
        onClick={() => onStatusChange('normal')}
      >
        <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
        Normal
      </Button>
      <Button
        size="sm"
        variant={status === 'warning' ? 'default' : 'outline'}
        className={`flex-1 ${status === 'warning' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
        onClick={() => onStatusChange('warning')}
      >
        <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
        Warning
      </Button>
      <Button
        size="sm"
        variant={status === 'error' ? 'default' : 'outline'}
        className={`flex-1 ${status === 'error' ? 'bg-red-500 hover:bg-red-600' : ''}`}
        onClick={() => onStatusChange('error')}
      >
        <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
        Error
      </Button>
    </div>
  );
}; 