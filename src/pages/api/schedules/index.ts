import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { z } from 'zod';

const scheduleSchema = z.object({
  id: z.string().optional(),
  classId: z.string(),
  subjectId: z.string(),
  teacherId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isAllDay: z.boolean().optional(),
  rrule: z.string().optional(),
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
      const { id, classId, subjectId, teacherId, startDate, endDate, isAllDay, rrule } = parsedData;

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

      // TODO: Add conflict detection logic for the new structure

      const data = {
        schoolId: dbUser.schoolId,
        classId,
        subjectId,
        teacherId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isAllDay,
        rrule,
      };

      if (req.method === 'PUT' && id) {
        const schedule = await prisma.schedule.update({
          where: { id },
          data,
          include: { class: true, subject: true, teacher: true },
        });
        return res.status(200).json(schedule);
      } else if (req.method === 'POST') {
        const schedule = await prisma.schedule.create({
          data,
          include: { class: true, subject: true, teacher: true },
        });
        return res.status(201).json(schedule);
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