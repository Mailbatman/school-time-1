import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { z } from 'zod';

const scheduleSchema = z.object({
  id: z.string().optional(),
  classId: z.string(),
  daysOfWeek: z.array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])).min(1),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  subjectId: z.string(),
  teacherId: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.role !== 'SCHOOL_ADMIN' || !dbUser.schoolId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const parsedData = scheduleSchema.parse(req.body);
      const { id, classId, daysOfWeek, startTime, endTime, subjectId, teacherId } = parsedData;

      // Validate that the class, subject, and teacher belong to the same school
      const [classData, subjectData, teacherData] = await Promise.all([
        prisma.class.findUnique({ where: { id: classId } }),
        prisma.subject.findUnique({ where: { id: subjectId } }),
        prisma.user.findUnique({ where: { id: teacherId } }),
      ]);

      if (!classData || !subjectData || !teacherData ||
        classData.schoolId !== dbUser.schoolId ||
        subjectData.schoolId !== dbUser.schoolId ||
        teacherData.schoolId !== dbUser.schoolId) {
        return res.status(400).json({ error: 'Invalid class, subject, or teacher for this school.' });
      }

      if (req.method === 'POST') {
        // Handle creation of potentially multiple schedules for recurring events
        const schedulesToCreate = daysOfWeek.map(dayOfWeek => ({
          classId,
          dayOfWeek,
          startTime,
          endTime,
          subjectId,
          teacherId,
          schoolId: dbUser.schoolId,
        }));

        // TODO: Add conflict check for multiple creations

        const newSchedules = await prisma.$transaction(
          schedulesToCreate.map(data => prisma.schedule.create({ 
            data,
            include: { class: true, subject: true, teacher: true } 
          }))
        );
        return res.status(201).json(newSchedules);

      } else if (req.method === 'PUT' && id) {
        // Handle update of a single schedule event. Recurring updates are not supported in this simplified version.
        if (daysOfWeek.length > 1) {
          return res.status(400).json({ error: "Updating recurring events is not supported. Please delete and create a new one." });
        }
       
        const dayOfWeek = daysOfWeek[0];
        
        const conflictingSchedule = await prisma.schedule.findFirst({
            where: {
                schoolId: dbUser.schoolId,
                dayOfWeek,
                startTime,
                endTime,
                id: { not: id },
                OR: [{ classId }, { teacherId }],
            },
        });

        if (conflictingSchedule) {
            const conflictType = conflictingSchedule.classId === classId ? 'class' : 'teacher';
            return res.status(409).json({ error: `A schedule conflict exists for this ${conflictType} at the specified time.` });
        }

        const updatedSchedule = await prisma.schedule.update({
          where: { id },
          data: { classId, dayOfWeek, startTime, endTime, subjectId, teacherId },
          include: { class: true, subject: true, teacher: true },
        });
        return res.status(200).json(updatedSchedule);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  res.setHeader('Allow', ['POST', 'PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}