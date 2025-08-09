import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Class, Subject, User as DbUser, Schedule } from '@prisma/client';
import { toast } from '@/components/ui/use-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import rrulePlugin from '@fullcalendar/rrule';
import { EventClickArg, DateSelectArg } from '@fullcalendar/core';

type ScheduleManagerProps = {
  classes: (Class & { subjects: { subject: Subject }[] })[];
  schedules: (Schedule & {
    class: Class;
    subject: Subject;
    teacher: DbUser;
  })[];
  onEventClick: (event: EventClickArg) => void;
  onDateSelect: (selection: DateSelectArg, classId: string) => void;
};

const ScheduleManager = ({
  classes,
  schedules,
  onEventClick,
  onDateSelect,
}: ScheduleManagerProps) => {
  const [selectedClass, setSelectedClass] = useState<string>('');

  const events = useMemo(() => {
    return schedules
      .filter((s) => !selectedClass || s.classId === selectedClass)
      .map((s) => ({
        id: s.id,
        title: `${s.subject.name} - ${s.teacher.firstName}`,
        start: s.startDate,
        end: s.endDate,
        allDay: s.isAllDay,
        rrule: s.rrule ?? undefined,
        classId: s.classId,
        subjectId: s.subjectId,
        teacherId: s.teacherId,
      }));
  }, [schedules, selectedClass]);

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    if (!selectedClass) {
      toast({
        title: 'Please select a class first',
        description: 'You must select a class before creating a new schedule.',
        variant: 'destructive',
      });
      selectInfo.view.calendar.unselect();
      return;
    }
    onDateSelect(selectInfo, selectedClass);
  }, [selectedClass, onDateSelect]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manage Schedule</CardTitle>
        <div className="w-[280px]">
          <Select onValueChange={setSelectedClass} value={selectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select a class to view schedule" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, rrulePlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay,dayGridMonth',
          }}
          initialView="timeGridWeek"
          events={events}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          eventClick={onEventClick}
          select={handleDateSelect}
          height="auto"
        />
      </CardContent>
    </Card>
  );
};

export default ScheduleManager;