import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Class, Subject, User as DbUser, Schedule } from '@prisma/client';
import { toast } from '@/components/ui/use-toast';

type ScheduleManagerProps = {
  classes: (Class & { subjects: { subject: Subject }[] })[];
  subjects: Subject[];
  teachers: DbUser[];
  initialSchedules: (Schedule & { class: Class; subject: Subject; teacher: DbUser })[];
};

const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const timeSlots = [
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '14:00-15:00',
  '15:00-16:00',
];

const ScheduleManager = ({ classes, subjects, teachers, initialSchedules }: ScheduleManagerProps) => {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [selectedClass, setSelectedClass] = useState<string>('');

  const handleScheduleChange = async (
    day: string,
    time: string,
    subjectId: string,
    teacherId: string
  ) => {
    if (!selectedClass) {
      toast({ title: 'Please select a class first', variant: 'destructive' });
      return;
    }

    const [startTime, endTime] = time.split('-');
    
    const existingSchedule = schedules.find(
      (s) =>
        s.classId === selectedClass &&
        s.dayOfWeek === day &&
        s.startTime === startTime &&
        s.endTime === endTime
    );

    const res = await fetch('/api/schedules', {
      method: existingSchedule ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: existingSchedule?.id,
        classId: selectedClass,
        dayOfWeek: day,
        startTime,
        endTime,
        subjectId,
        teacherId,
      }),
    });

    if (res.ok) {
      const updatedSchedule = await res.json();
      if (existingSchedule) {
        setSchedules(schedules.map((s) => (s.id === updatedSchedule.id ? updatedSchedule : s)));
      } else {
        setSchedules([...schedules, updatedSchedule]);
      }
      toast({ title: 'Schedule updated successfully' });
    } else {
      const { error } = await res.json();
      toast({ title: 'Failed to update schedule', description: error, variant: 'destructive' });
    }
  };

  const scheduleGrid = useMemo(() => {
    if (!selectedClass) return {};
    const grid: { [key: string]: { [key: string]: Schedule & { subject: Subject; teacher: DbUser } } } = {};
    schedules
      .filter((s) => s.classId === selectedClass)
      .forEach((s) => {
        if (!grid[s.dayOfWeek]) grid[s.dayOfWeek] = {};
        grid[s.dayOfWeek][`${s.startTime}-${s.endTime}`] = s as any;
      });
    return grid;
  }, [schedules, selectedClass]);

  const currentClassSubjects = useMemo(() => {
    const classData = classes.find(c => c.id === selectedClass);
    if (!classData) return [];
    // This logic needs to be improved. For now, let's assume all subjects are available.
    return subjects;
  }, [selectedClass, classes, subjects]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Select onValueChange={setSelectedClass} value={selectedClass}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a class to manage schedule" />
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

        {selectedClass && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  {daysOfWeek.map((day) => (
                    <TableHead key={day}>{day}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeSlots.map((time) => (
                  <TableRow key={time}>
                    <TableCell>{time}</TableCell>
                    {daysOfWeek.map((day) => {
                      const schedule = scheduleGrid[day]?.[time];
                      return (
                        <TableCell key={day}>
                          <div className="space-y-2">
                            <Select
                              value={schedule?.subjectId || ''}
                              onValueChange={(subjectId) =>
                                handleScheduleChange(day, time, subjectId, schedule?.teacherId || '')
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Subject" />
                              </SelectTrigger>
                              <SelectContent>
                                {currentClassSubjects.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={schedule?.teacherId || ''}
                              onValueChange={(teacherId) =>
                                handleScheduleChange(day, time, schedule?.subjectId || '', teacherId)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Teacher" />
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
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScheduleManager;