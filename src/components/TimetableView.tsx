import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RRule } from 'rrule';

// Define types for the component props
interface TimetableViewProps {
  schedules: any[];
  classes: any[];
  teachers: any[];
}

// Define a type for a timetable event
interface TimetableEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  subject: string;
  teacher: string;
  className: string;
  rrule?: string;
}

const TimetableView: React.FC<TimetableViewProps> = ({ schedules, classes, teachers }) => {
  const [viewBy, setViewBy] = useState('class'); // 'class' or 'teacher'
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 8; // 8 AM to 7 PM
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const events: TimetableEvent[] = useMemo(() => {
    return schedules.map(schedule => ({
      id: schedule.id,
      title: schedule.title,
      startTime: new Date(schedule.startTime),
      endTime: new Date(schedule.endTime),
      subject: schedule.subject?.name || 'N/A',
      teacher: schedule.teacher ? `${schedule.teacher.firstName} ${schedule.teacher.lastName}` : 'N/A',
      className: schedule.class?.name || 'N/A',
      rrule: schedule.rrule,
    }));
  }, [schedules]);

  const getEventsForDay = (dayIndex: number) => {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - dayStart.getDay() + dayIndex + 1);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    let filteredEvents = events;

    if (selectedItem) {
      if (viewBy === 'class') {
        filteredEvents = events.filter(e => e.className === selectedItem);
      } else {
        filteredEvents = events.filter(e => e.teacher === selectedItem);
      }
    }

    const occurrences = filteredEvents.flatMap(event => {
      if (event.rrule) {
        const rule = RRule.fromString(event.rrule);
        const dates = rule.between(dayStart, dayEnd);
        return dates.map(date => ({
          ...event,
          startTime: new Date(date),
          endTime: new Date(date.getTime() + (event.endTime.getTime() - event.startTime.getTime())),
        }));
      }
      if (event.startTime >= dayStart && event.startTime <= dayEnd) {
        return [event];
      }
      return [];
    });

    return occurrences;
  };

  const renderEvent = (event: TimetableEvent) => {
    const startHour = event.startTime.getHours();
    const startMinutes = event.startTime.getMinutes();
    const endHour = event.endTime.getHours();
    const endMinutes = event.endTime.getMinutes();

    const top = ((startHour - 8) * 60 + startMinutes) / (12 * 60) * 100;
    const height = ((endHour * 60 + endMinutes) - (startHour * 60 + startMinutes)) / (12 * 60) * 100;

    return (
      <div
        key={event.id + event.startTime.toISOString()}
        className="absolute left-1 right-1 bg-blue-200 p-1 rounded-lg overflow-hidden border border-blue-400"
        style={{ top: `${top}%`, height: `${height}%` }}
      >
        <p className="font-bold text-xs">{event.subject}</p>
        <p className="text-xs">{viewBy === 'class' ? event.teacher : event.className}</p>
      </div>
    );
  };

  const selectOptions = useMemo(() => {
    if (viewBy === 'class') {
      return classes.map(c => ({ id: c.id, name: c.name }));
    }
    return teachers.map(t => ({ id: t.id, name: `${t.firstName} ${t.lastName}` }));
  }, [viewBy, classes, teachers]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Visual Timetable</CardTitle>
        <div className="flex gap-4 mt-4">
          <Select value={viewBy} onValueChange={setViewBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="View by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="class">View by Class</SelectItem>
              <SelectItem value="teacher">View by Teacher</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedItem || ''} onValueChange={setSelectedItem}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder={`Select ${viewBy === 'class' ? 'Class' : 'Teacher'}...`} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((item) => (
                <SelectItem key={item.id} value={item.name}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-1" style={{ minHeight: '720px' }}>
          {/* Time Slot Labels */}
          <div className="col-span-1">
            {timeSlots.map(time => (
              <div key={time} className="h-12 text-right pr-2 border-t border-gray-200 text-xs pt-1">
                {time}
              </div>
            ))}
          </div>
          {/* Day Columns */}
          {days.map((day, dayIndex) => (
            <div key={day} className="col-span-1 relative border-l border-gray-200">
              <h3 className="text-center font-semibold sticky top-0 bg-white z-10 py-2">{day}</h3>
              <div className="relative h-full">
                {/* Background time slots */}
                {timeSlots.slice(1).map(time => (
                  <div key={`${day}-${time}`} className="h-12 border-t border-gray-200"></div>
                ))}
                {/* Events */}
                {getEventsForDay(dayIndex).map(renderEvent)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TimetableView;