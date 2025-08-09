import { useState, useEffect, useMemo } from 'react';
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
import { RRule } from 'rrule';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type ScheduleInitialData = {
  id?: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  startDate?: string;
  endDate?: string;
  isAllDay?: boolean;
  rrule?: string;
};

type ScheduleDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: any) => Promise<void>;
  initialData: ScheduleInitialData | null;
  classes: (Class & { subjects: { subject: Subject }[] })[];
  subjects: Subject[];
  teachers: DbUser[];
};

const ScheduleDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  initialData,
  classes,
  subjects,
  teachers,
}: ScheduleDialogProps) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [eventDate, setEventDate] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);

  // Recurrence state
  const [recurrence, setRecurrence] = useState('none');
  const [interval, setInterval] = useState(1);
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [monthlyType, setMonthlyType] = useState('day_of_month');
  const [monthlyWeek, setMonthlyWeek] = useState('1');
  const [monthlyWeekday, setMonthlyWeekday] = useState('MO');
  const [endType, setEndType] = useState('never');
  const [untilDate, setUntilDate] = useState('');
  const [count, setCount] = useState(1);

  useEffect(() => {
    const resetForm = () => {
      setSelectedSubject('');
      setSelectedTeacher('');
      setRecurrence('none');
      setInterval(1);
      setWeekdays([]);
      setMonthlyType('day_of_month');
      setMonthlyWeek('1');
      setMonthlyWeekday('MO');
      setEndType('never');
      setUntilDate('');
      setCount(1);
    };

    if (isOpen && initialData) {
      const startDt = initialData.startDate ? new Date(initialData.startDate) : new Date();
      const endDt = initialData.endDate ? new Date(initialData.endDate) : new Date(startDt.getTime() + 60 * 60 * 1000);

      setEventDate(startDt.toISOString().split('T')[0]);
      setStartTime(initialData.startDate ? startDt.toISOString().split('T')[1].slice(0, 5) : '09:00');
      setEndTime(initialData.endDate ? endDt.toISOString().split('T')[1].slice(0, 5) : '10:00');
      
      setIsAllDay(initialData.isAllDay || false);
      setSelectedClass(initialData.classId || '');
      setSelectedSubject(initialData.subjectId || '');
      setSelectedTeacher(initialData.teacherId || '');

      if (initialData.rrule) {
        try {
          const rule = RRule.fromString(initialData.rrule);
          const { freq, interval, byweekday, bysetpos, until, count } = rule.options;
          const freqMap = ['yearly', 'monthly', 'weekly', 'daily'];
          setRecurrence(freqMap[freq] || 'none');
          setInterval(interval || 1);
          
          if (byweekday) {
            const weekdayStrMap = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
            setWeekdays(byweekday.map((day: number) => weekdayStrMap[day]));
          } else {
            setWeekdays([]);
          }

          if (freq === RRule.MONTHLY && byweekday && bysetpos && bysetpos.length > 0) {
            setMonthlyType('day_of_week');
            setMonthlyWeek(String(bysetpos[0]));
            const weekdayMapFromNum = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
            setMonthlyWeekday(weekdayMapFromNum[byweekday[0] as number]);
          } else {
            setMonthlyType('day_of_month');
          }

          if (until) {
            setEndType('until');
            setUntilDate(new Date(until).toISOString().split('T')[0]);
          } else if (count) {
            setEndType('count');
            setCount(count);
          } else {
            setEndType('never');
          }
        } catch (e) {
          console.error('Error parsing rrule', e);
          resetForm();
        }
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
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
        const freqMap: { [key: string]: any } = { daily: RRule.DAILY, weekly: RRule.WEEKLY, monthly: RRule.MONTHLY, yearly: RRule.YEARLY };
        const weekdayMap: { [key: string]: any } = { MO: RRule.MO, TU: RRule.TU, WE: RRule.WE, TH: RRule.TH, FR: RRule.FR, SA: RRule.SA, SU: RRule.SU };
        const dtStart = new Date(`${eventDate}T${startTime}`);
        const options: any = { freq: freqMap[recurrence], dtstart: dtStart, interval: Number(interval) || 1 };

        if (recurrence === 'weekly' && weekdays.length > 0) options.byweekday = weekdays.map(day => weekdayMap[day]);
        if (recurrence === 'monthly' && monthlyType === 'day_of_week') options.byweekday = [weekdayMap[monthlyWeekday].nth(Number(monthlyWeek))];
        if (endType === 'until' && untilDate) options.until = new Date(untilDate + 'T23:59:59');
        else if (endType === 'count' && count > 0) options.count = Number(count) || 1;

        try {
            rruleString = new RRule(options).toString();
        } catch (e) {
            console.error('Error creating rrule', e);
            toast({ title: 'Invalid recurrence rule', variant: 'destructive' });
            return;
        }
    }

    const scheduleData = {
      id: initialData?.id,
      classId: selectedClass,
      subjectId: selectedSubject,
      teacherId: selectedTeacher,
      startDate: new Date(`${eventDate}T${startTime}`).toISOString(),
      endDate: new Date(`${eventDate}T${endTime}`).toISOString(),
      isAllDay,
      rrule: rruleString,
    };
    onSave(scheduleData);
  };

  const availableSubjects = useMemo(() => {
    if (!selectedClass) return subjects;
    const classInfo = classes.find(c => c.id === selectedClass);
    // Ensure classInfo and classInfo.subjects exist before mapping
    if (classInfo && classInfo.subjects) {
      return classInfo.subjects.map(s => s.subject);
    }
    // Fallback to all subjects or an empty array if the class has no specific subjects
    return subjects || [];
  }, [selectedClass, classes, subjects]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="class" className="text-right">Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!!initialData?.id}>
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
                {availableSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
            <Label htmlFor="start-time" className="text-right">Start Time</Label>
            <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-time" className="text-right">End Time</Label>
            <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="all-day" className="text-right">All-day</Label>
            <Switch id="all-day" checked={isAllDay} onCheckedChange={setIsAllDay} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recurrence" className="text-right">Repeat</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
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
                <Label htmlFor="interval" className="text-right">Repeat every</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input id="interval" type="number" value={interval} onChange={(e) => setInterval(Number(e.target.value))} className="w-20" min="1" />
                  <span>{recurrence === 'daily' ? 'day(s)' : `${recurrence.slice(0, -2)}(s)`}</span>
                </div>
              </div>
              {recurrence === 'weekly' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Repeat on</Label>
                  <ToggleGroup type="multiple" value={weekdays} onValueChange={setWeekdays} className="col-span-3 flex-wrap justify-start">
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
              {recurrence === 'monthly' && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">On</Label>
                    <Select value={monthlyType} onValueChange={setMonthlyType}>
                      <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day_of_month">Day of the month</SelectItem>
                        <SelectItem value="day_of_week">Day of the week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {monthlyType === 'day_of_week' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <div/>
                      <div className="col-span-3 flex gap-2">
                        <Select value={monthlyWeek} onValueChange={setMonthlyWeek}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">First</SelectItem>
                            <SelectItem value="2">Second</SelectItem>
                            <SelectItem value="3">Third</SelectItem>
                            <SelectItem value="4">Fourth</SelectItem>
                            <SelectItem value="-1">Last</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={monthlyWeekday} onValueChange={setMonthlyWeekday}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SU">Sunday</SelectItem>
                            <SelectItem value="MO">Monday</SelectItem>
                            <SelectItem value="TU">Tuesday</SelectItem>
                            <SelectItem value="WE">Wednesday</SelectItem>
                            <SelectItem value="TH">Thursday</SelectItem>
                            <SelectItem value="FR">Friday</SelectItem>
                            <SelectItem value="SA">Saturday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Ends</Label>
                <div className="col-span-3">
                  <Select value={endType} onValueChange={setEndType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Label htmlFor="until-date" className="text-right">End date</Label>
                  <Input id="until-date" type="date" value={untilDate} onChange={(e) => setUntilDate(e.target.value)} className="col-span-3" />
                </div>
              )}
              {endType === 'count' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="count" className="text-right">Occurrences</Label>
                  <Input id="count" type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} className="col-span-3 w-28" min="1" />
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleDialog;