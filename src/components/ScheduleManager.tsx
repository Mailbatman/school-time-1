import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

  const events = useMemo(() => {
    return schedules
      .filter((s) => !selectedClass || s.classId === selectedClass)
      .map(
        (s) =>
          ({
            id: s.id,
            title: `${s.subject.name} - ${s.teacher.firstName}`,
            start: `${s.dayOfWeek.toLowerCase()}T${s.startTime}`,
            end: `${s.dayOfWeek.toLowerCase()}T${s.endTime}`,
            classId: s.classId,
            subjectId: s.subjectId,
            teacherId: s.teacherId,
            allDay: false,
          } as EventInput)
      );
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

    if (!classId || !selectedSubject || !selectedTeacher) {
      toast({
        title: 'Missing Information',
        description: 'Please select a class, subject, and teacher.',
        variant: 'destructive',
      });
      return;
    }

    let dayOfWeek: string, startTime: string, endTime: string;

    if (isNew && selectedDateInfo) {
      const startDate = new Date(selectedDateInfo.startStr);
      dayOfWeek = startDate.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();
      startTime = startDate.toTimeString().slice(0, 5);
      const endDate = new Date(selectedDateInfo.endStr);
      endTime = endDate.toTimeString().slice(0, 5);
    } else if (selectedEvent) {
      const startDate = new Date(selectedEvent.event.startStr);
      dayOfWeek = startDate.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();
      startTime = startDate.toTimeString().slice(0, 5);
      const endDate = new Date(selectedEvent.event.endStr);
      endTime = endDate.toTimeString().slice(0, 5);
    } else {
      return;
    }

    const scheduleData = {
      id: selectedEvent?.event.id,
      classId,
      dayOfWeek,
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
      const updatedSchedule = await res.json();
      if (isNew) {
        setSchedules([...schedules, updatedSchedule]);
      } else {
        setSchedules(
          schedules.map((s) =>
            s.id === updatedSchedule.id ? updatedSchedule : s
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
              <Label htmlFor="class" className="text-right">
                Class
              </Label>
              <Select
                value={selectedClass}
                onValueChange={setSelectedClass}
                disabled={!!selectedEvent}
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