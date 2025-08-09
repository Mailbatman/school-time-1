import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays, subDays, addWeeks, subWeeks } from 'date-fns';
import { RRule, rrulestr } from 'rrule';
import { toast } from './ui/use-toast';

// Define types for the component props
interface TimetableViewProps {
  schedules: any[];
  classes: any[];
  teachers: any[];
  onSelectSlot: (slot: { start: Date; end: Date, classId?: string }) => void;
  onSelectEvent: (event: any) => void;
}

const formatLocalDate = (date: Date) => {
  const Y = date.getFullYear();
  const M = (date.getMonth() + 1).toString().padStart(2, '0');
  const D = date.getDate().toString().padStart(2, '0');
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${Y}${M}${D}T${h}${m}${s}`;
};

// Define a type for a timetable event
interface TimetableEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  subject: string;
  teacher: string;
  className: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  rrule?: string;
  isAllDay: boolean;
}

const TimetableView: React.FC<TimetableViewProps> = ({ schedules, classes, teachers, onSelectSlot, onSelectEvent }) => {
  const [viewBy, setViewBy] = useState('class'); // 'class' or 'teacher'
  const [selectedFilterItem, setSelectedFilterItem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 8; // 8 AM to 7 PM
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const visibleDays = useMemo(() => {
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
      return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
    }
    return [currentDate]; // For 'day' view
  }, [currentDate, viewMode]);

  const events: TimetableEvent[] = useMemo(() => {
    return schedules.map(schedule => ({
      id: schedule.id,
      title: schedule.title,
      startTime: new Date(schedule.startDate),
      endTime: new Date(schedule.endDate),
      subject: schedule.subject?.name || 'N/A',
      teacher: schedule.teacher ? `${schedule.teacher.firstName} ${schedule.teacher.lastName}` : 'N/A',
      className: schedule.class?.name || 'N/A',
      classId: schedule.classId,
      subjectId: schedule.subjectId,
      teacherId: schedule.teacherId,
      rrule: schedule.rrule,
      isAllDay: schedule.isAllDay,
    }));
  }, [schedules]);

  const getEventsForDay = (day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    let filteredEvents = events;

    if (selectedFilterItem) {
      if (viewBy === 'class') {
        const selectedClass = classes.find(c => c.name === selectedFilterItem);
        if (selectedClass) {
          filteredEvents = events.filter(e => e.classId === selectedClass.id);
        }
      } else {
        const selectedTeacher = teachers.find(t => `${t.firstName} ${t.lastName}` === selectedFilterItem);
        if (selectedTeacher) {
          filteredEvents = events.filter(e => e.teacherId === selectedTeacher.id);
        }
      }
    }

    const occurrences = filteredEvents.flatMap(event => {
      if (event.rrule) {
        try {
          const rfcString = `DTSTART:${formatLocalDate(event.startTime)}\nRRULE:${event.rrule}`;
          const rule = rrulestr(rfcString);
          const dates = rule.between(dayStart, dayEnd);
          return dates.map(date => ({
            ...event,
            startTime: new Date(date),
            endTime: new Date(date.getTime() + (event.endTime.getTime() - event.startTime.getTime())),
          }));
        } catch (error) {
          console.error("Error parsing rrule:", event.rrule, error);
          return [];
        }
      }
      if (event.startTime >= dayStart && event.startTime <= dayEnd) {
        return [event];
      }
      return [];
    });

    return occurrences;
  };

  const handleSlotClick = (day: Date, time: string) => {
    if (viewBy === 'class' && !selectedFilterItem) {
      toast({
        title: 'Please select a class',
        description: 'You must select a class before creating a new schedule.',
        variant: 'destructive',
      });
      return;
    }
    
    const start = new Date(day);
    start.setHours(Number(time.split(':')[0]), 0, 0, 0);
    
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration
    
    const selectedClass = classes.find(c => c.name === selectedFilterItem);

    onSelectSlot({ start, end, classId: selectedClass?.id });
  };

  const renderEvent = (event: TimetableEvent) => {
    const startHour = event.startTime.getHours();
    const startMinutes = event.startTime.getMinutes();
    const endHour = event.endTime.getHours();
    const endMinutes = event.endTime.getMinutes();

    const top = ((startHour - 8) * 60 + startMinutes) / (12 * 60) * 100;
    const height = Math.max(0, ((endHour * 60 + endMinutes) - (startHour * 60 + startMinutes)) / (12 * 60) * 100);

    return (
      <div
        key={event.id + event.startTime.toISOString()}
        className="absolute left-1 right-1 bg-blue-200 p-1 rounded-lg overflow-hidden border border-blue-400 cursor-pointer hover:bg-blue-300"
        style={{ top: `${top}%`, height: `${height}%` }}
        onClick={() => onSelectEvent(event)}
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

  const handleViewByChange = (value: string) => {
    setViewBy(value);
    setSelectedFilterItem(null);
  };

  const handlePrev = () => {
    setCurrentDate(prev => viewMode === 'week' ? subWeeks(prev, 1) : subDays(prev, 1));
  };

  const handleNext = () => {
    setCurrentDate(prev => viewMode === 'week' ? addWeeks(prev, 1) : addDays(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleViewModeChange = (value: 'week' | 'day' | null) => {
    if (value) {
      setViewMode(value);
    }
  };

  const gridColsClass = viewMode === 'week' ? 'grid-cols-6' : 'grid-cols-2';
  const dateRangeDisplay = useMemo(() => {
    if (viewMode === 'week') {
      const start = visibleDays[0];
      const end = visibleDays[visibleDays.length - 1];
      return `${format(start, 'd MMM yyyy')} - ${format(end, 'd MMM yyyy')}`;
    }
    return format(currentDate, 'd MMMM yyyy');
  }, [visibleDays, viewMode, currentDate]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Visual Timetable</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleToday}>Today</Button>
              <Button variant="outline" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <span className="font-semibold">{dateRangeDisplay}</span>
            <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange}>
              <ToggleGroupItem value="day">Day</ToggleGroupItem>
              <ToggleGroupItem value="week">Week</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <Select value={viewBy} onValueChange={handleViewByChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="View by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="class">View by Class</SelectItem>
              <SelectItem value="teacher">View by Teacher</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedFilterItem || ''} onValueChange={setSelectedFilterItem}>
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
        <div className={`grid ${gridColsClass} gap-1`} style={{ minHeight: '720px' }}>
          {/* Time Slot Labels */}
          <div className="col-span-1">
            {timeSlots.map(time => (
              <div key={time} className="h-12 text-right pr-2 border-t border-gray-200 text-xs pt-1">
                {time}
              </div>
            ))}
          </div>
          {/* Day Columns */}
          {visibleDays.map((day) => (
            <div key={day.toISOString()} className="col-span-1 relative border-l border-gray-200">
              <h3 className="text-center font-semibold sticky top-0 bg-white z-10 py-2">
                {format(day, 'EEE, d MMM')}
              </h3>
              <div className="relative">
                {/* Background time slots with click handlers */}
                {timeSlots.map(time => (
                  <div 
                    key={`${day.toISOString()}-${time}`} 
                    className="h-12 border-t border-gray-200 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSlotClick(day, time)}
                  ></div>
                ))}
                {/* Events */}
                {getEventsForDay(day).map(renderEvent)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TimetableView;