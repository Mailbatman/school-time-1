import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Class, Subject, User as DbUser, Schedule } from '@prisma/client';
import { toast } from '@/components/ui/use-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput, EventClickArg, DateSelectArg } from '@fullcalendar/core';

type ScheduleManagerProps = {
  classes: (Class & { subjects: { subject: Subject }[] })[];
  subjects: Subject[];
  teachers: DbUser[];
  initialSchedules: (Schedule & {
    class: Class;
    subject: Subject;
    teacher: DbUser;
  })[];
};

const dayMapping: { [key: number]: string } = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

const ScheduleManager = ({
  classes,
  subjects,
  teachers,
  initialSchedules,
}: ScheduleManagerProps) => {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventClickArg | null>(
    null
  );
  const [selectedDateInfo, setSelectedDateInfo] = useState<DateSelectArg | null>(
    null
  );
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  useEffect(() => {
    if (isDialogOpen) {
      if (selectedEvent) {
        const eventDate = selectedEvent.event.start;
        if (eventDate) {
          setSelectedDays([dayMapping[eventDate.getDay()]]);
        }
      } else if (selectedDateInfo) {
        const startDate = new Date(selectedDateInfo.startStr);
        setSelectedDays([dayMapping[startDate.getDay()]]);
      }
    }
  }, [isDialogOpen, selectedEvent, selectedDateInfo]);

  const events = useMemo(() => {
    const eventInputs: EventInput[] = [];
    schedules
      .filter((s) => !selectedClass || s.classId === selectedClass)
      .forEach((s) => {
        eventInputs.push({
          id: s.id,
          title: `${s.subject.name} - ${s.teacher.firstName}`,
          start: `${s.dayOfWeek.toLowerCase()}T${s.startTime}`,
          end: `${s.dayOfWeek.toLowerCase()}T${s.endTime}`,
          classId: s.classId,
          subjectId: s.subjectId,
          teacherId: s.teacherId,
          allDay: false,
        });
      });
    return eventInputs;
  }, [schedules, selectedClass]);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo);
    setSelectedSubject(clickInfo.event.extendedProps.subjectId);
    setSelectedTeacher(clickInfo.event.extendedProps.teacherId);
    setSelectedClass(clickInfo.event.extendedProps.classId);
    setDialogOpen(true);
  }, []);

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
    setSelectedDateInfo(selectInfo);
    setSelectedSubject('');
    setSelectedTeacher('');
    setDialogOpen(true);
  }, [selectedClass]);

  const handleDialogSave = async () => {
    const isNew = !selectedEvent;
    const classId = selectedClass;

    if (!classId || !selectedSubject || !selectedTeacher || selectedDays.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please select a class, subject, teacher, and at least one day.',
        variant: 'destructive',
      });
      return;
    }

    let startTime: string, endTime: string;

    if (isNew && selectedDateInfo) {
      startTime = new Date(selectedDateInfo.startStr).toTimeString().slice(0, 5);
      endTime = new Date(selectedDateInfo.endStr).toTimeString().slice(0, 5);
    } else if (selectedEvent) {
      startTime = new Date(selectedEvent.event.startStr).toTimeString().slice(0, 5);
      endTime = new Date(selectedEvent.event.endStr).toTimeString().slice(0, 5);
    } else {
      return;
    }

    const scheduleData = {
      id: selectedEvent?.event.id,
      classId,
      daysOfWeek: selectedDays,
      startTime,
      endTime,
      subjectId: selectedSubject,
      teacherId: selectedTeacher,
    };

    const res = await fetch('/api/schedules', {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduleData),
    });

    if (res.ok) {
      const updatedSchedules = await res.json();
      if (isNew) {
        setSchedules([...schedules, ...updatedSchedules]);
      } else {
        setSchedules(
          schedules.map((s) =>
            s.id === updatedSchedules.id ? updatedSchedules : s
          )
        );
      }
      toast({ title: 'Schedule saved successfully' });
      closeDialog();
    } else {
      const { error } = await res.json();
      toast({
        title: 'Failed to save schedule',
        description: error,
        variant: 'destructive',
      });
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedEvent(null);
    setSelectedDateInfo(null);
    setSelectedSubject('');
    setSelectedTeacher('');
    setSelectedDays([]);
  };

  const currentClassSubjects = useMemo(() => {
    const classData = classes.find((c) => c.id === selectedClass);
    if (!classData) return [];
    return classData.subjects.map((s) => s.subject);
  }, [selectedClass, classes]);

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
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay',
          }}
          initialView="timeGridWeek"
          events={events}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          eventClick={handleEventClick}
          select={handleDateSelect}
          height="auto"
        />
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? 'Edit Schedule' : 'Create Schedule'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Repeat on
              </Label>
              <ToggleGroup
                type="multiple"
                value={selectedDays}
                onValueChange={setSelectedDays}
                className="col-span-3 flex-wrap justify-start"
                disabled={!!selectedEvent}
              >
                {Object.values(dayMapping).map(day => (
                  <ToggleGroupItem key={day} value={day} aria-label={`Toggle ${day}`}>
                    {day.charAt(0)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class" className="text-right">
                Class
              </Label>
              <Select
                value={selectedClass}
                onValueChange={setSelectedClass}
                disabled
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Class" />
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">
                Subject
              </Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {currentClassSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teacher" className="text-right">
                Teacher
              </Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleDialogSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ScheduleManager;