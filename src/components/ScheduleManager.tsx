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
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Class, Subject, User as DbUser, Schedule } from '@prisma/client';
import { toast } from '@/components/ui/use-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput, EventClickArg, DateSelectArg } from '@fullcalendar/core';
import { RRule } from 'rrule';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
  const [selectedEvent, setSelectedEvent] = useState<EventClickArg | null>(null);
  const [selectedDateInfo, setSelectedDateInfo] = useState<DateSelectArg | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);

  // Recurrence state
  const [recurrence, setRecurrence] = useState('none'); // none, daily, weekly, monthly, yearly
  const [interval, setInterval] = useState(1);
  const [weekdays, setWeekdays] = useState<string[]>([]); // MO, TU, WE, TH, FR, SA, SU
  const [endType, setEndType] = useState('never'); // never, until, count
  const [untilDate, setUntilDate] = useState('');
  const [count, setCount] = useState(1);

  useEffect(() => {
    const resetRecurrence = () => {
      setRecurrence('none');
      setInterval(1);
      setWeekdays([]);
      setEndType('never');
      setUntilDate('');
      setCount(1);
    };

    if (isDialogOpen) {
      if (selectedEvent) {
        const { start, end, allDay, extendedProps } = selectedEvent.event;
        setStartDate(start?.toISOString().slice(0, 16) || '');
        setEndDate(end?.toISOString().slice(0, 16) || '');
        setIsAllDay(allDay);
        setSelectedClass(extendedProps.classId);
        setSelectedSubject(extendedProps.subjectId);
        setSelectedTeacher(extendedProps.teacherId);

        if (extendedProps.rrule) {
          try {
            const rule = RRule.fromString(extendedProps.rrule);
            const { freq, interval, byweekday, until, count } = rule.options;
            const freqMap = ['yearly', 'monthly', 'weekly', 'daily'];
            setRecurrence(freqMap[freq] || 'none');
            setInterval(interval || 1);
            if (byweekday) {
              // RRule weekday numbers are 0-6 for MO-SU
              const weekdayStrMap = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
              setWeekdays(byweekday.map((day) => weekdayStrMap[day]));
            } else {
              setWeekdays([]);
            }

            if (until) {
              setEndType('until');
              // Format date as YYYY-MM-DD for the input[type=date]
              setUntilDate(new Date(until).toISOString().split('T')[0]);
            } else if (count) {
              setEndType('count');
              setCount(count);
            } else {
              setEndType('never');
            }
          } catch (e) {
            console.error('Error parsing rrule', e);
            resetRecurrence();
          }
        } else {
          resetRecurrence();
        }
      } else if (selectedDateInfo) {
        setStartDate(selectedDateInfo.startStr.slice(0, 16));
        setEndDate(selectedDateInfo.endStr.slice(0, 16));
        setIsAllDay(selectedDateInfo.allDay);
        resetRecurrence();
      }
    }
  }, [isDialogOpen, selectedEvent, selectedDateInfo]);

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

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo);
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
    setDialogOpen(true);
  }, [selectedClass]);

  const handleDialogSave = async () => {
    if (!selectedClass || !selectedSubject || !selectedTeacher) {
      toast({
        title: 'Missing Information',
        description: 'Please select a class, subject, and teacher.',
        variant: 'destructive',
      });
      return;
    }

    let rruleString: string | undefined;
    if (recurrence !== 'none') {
      const freqMap: { [key: string]: any } = {
        daily: RRule.DAILY,
        weekly: RRule.WEEKLY,
        monthly: RRule.MONTHLY,
        yearly: RRule.YEARLY,
      };
      const weekdayMap: { [key: string]: any } = {
        MO: RRule.MO,
        TU: RRule.TU,
        WE: RRule.WE,
        TH: RRule.TH,
        FR: RRule.FR,
        SA: RRule.SA,
        SU: RRule.SU,
      };

      const options: any = {
        freq: freqMap[recurrence],
        dtstart: new Date(startDate),
        interval: Number(interval) || 1,
      };

      if (recurrence === 'weekly' && weekdays.length > 0) {
        options.byweekday = weekdays.map((day) => weekdayMap[day]);
      }

      if (endType === 'until' && untilDate) {
        // Add time from start date to until date to make sure it's inclusive
        const T = 'T23:59:59';
        options.until = new Date(untilDate + T);
      } else if (endType === 'count' && count > 0) {
        options.count = Number(count) || 1;
      }

      try {
        const rule = new RRule(options);
        rruleString = rule.toString();
      } catch (e) {
        console.error('Error creating rrule', e);
        toast({
          title: 'Invalid recurrence rule',
          description: 'Please check your recurrence settings.',
          variant: 'destructive',
        });
        return;
      }
    }

    const scheduleData = {
      id: selectedEvent?.event.id,
      classId: selectedClass,
      subjectId: selectedSubject,
      teacherId: selectedTeacher,
      startDate,
      endDate,
      isAllDay,
      rrule: rruleString,
    };

    const res = await fetch('/api/schedules', {
      method: selectedEvent ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduleData),
    });

    if (res.ok) {
      const updatedSchedule = await res.json();
      if (selectedEvent) {
        setSchedules(schedules.map((s) => (s.id === updatedSchedule.id ? updatedSchedule : s)));
      } else {
        setSchedules([...schedules, updatedSchedule]);
      }
      toast({ title: 'Schedule saved successfully' });
      closeDialog();
    } else {
      const { error } = await res.json();
      toast({ title: 'Failed to save schedule', description: error, variant: 'destructive' });
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedEvent(null);
    setSelectedDateInfo(null);
    setSelectedSubject('');
    setSelectedTeacher('');
    setRecurrence('none');
    setInterval(1);
    setWeekdays([]);
    setEndType('never');
    setUntilDate('');
    setCount(1);
  };

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
            right: 'timeGridWeek,timeGridDay,dayGridMonth',
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
            <DialogTitle>{selectedEvent ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class" className="text-right">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass} disabled>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teacher" className="text-right">Teacher</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start-date" className="text-right">Start Time</Label>
              <Input id="start-date" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end-date" className="text-right">End Time</Label>
              <Input id="end-date" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="all-day" className="text-right">All-day</Label>
              <Switch id="all-day" checked={isAllDay} onCheckedChange={setIsAllDay} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recurrence" className="text-right">
                Repeat
              </Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recurrence !== 'none' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="interval" className="text-right">
                    Repeat every
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      id="interval"
                      type="number"
                      value={interval}
                      onChange={(e) => setInterval(Number(e.target.value))}
                      className="w-20"
                      min="1"
                    />
                    <span>
                      {recurrence === 'daily'
                        ? 'day(s)'
                        : `${recurrence.slice(0, -2)}(s)`}
                    </span>
                  </div>
                </div>

                {recurrence === 'weekly' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Repeat on</Label>
                    <ToggleGroup
                      type="multiple"
                      value={weekdays}
                      onValueChange={setWeekdays}
                      className="col-span-3 flex-wrap justify-start"
                    >
                      <ToggleGroupItem value="MO">Mo</ToggleGroupItem>
                      <ToggleGroupItem value="TU">Tu</ToggleGroupItem>
                      <ToggleGroupItem value="WE">We</ToggleGroupItem>
                      <ToggleGroupItem value="TH">Th</ToggleGroupItem>
                      <ToggleGroupItem value="FR">Fr</ToggleGroupItem>
                      <ToggleGroupItem value="SA">Sa</ToggleGroupItem>
                      <ToggleGroupItem value="SU">Su</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Ends</Label>
                  <div className="col-span-3">
                    <Select value={endType} onValueChange={setEndType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="until">On date</SelectItem>
                        <SelectItem value="count">After occurrences</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {endType === 'until' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="until-date" className="text-right">
                      End date
                    </Label>
                    <Input
                      id="until-date"
                      type="date"
                      value={untilDate}
                      onChange={(e) => setUntilDate(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                )}

                {endType === 'count' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="count" className="text-right">
                      Occurrences
                    </Label>
                    <Input
                      id="count"
                      type="number"
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="col-span-3 w-28"
                      min="1"
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleDialogSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ScheduleManager;