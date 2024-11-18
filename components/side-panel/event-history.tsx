import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TurbineEvent } from '@/types'

interface EventHistoryProps {
  events: TurbineEvent[];
}

// 將 getEventCounts 定義為內部函數
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

export const EventHistory = ({ events }: EventHistoryProps) => {
  return (
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
  );
};

export const EventHistoryHeader = ({ events }: EventHistoryProps) => {
  const counts = getEventCounts(events);
  
  return (
    <div className="flex items-center space-x-2 text-sm">
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
    </div>
  );
}; 