import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

  if (!dbUser || dbUser.role !== 'SCHOOL_ADMIN' || !dbUser.schoolId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.query;

  const student = await prisma.student.findUnique({ where: { id: String(id) } });
  if (!student || student.schoolId !== dbUser.schoolId) {
    return res.status(404).json({ error: 'Student not found' });
  }

  if (req.method === 'PUT') {
    const { firstName, lastName, classId } = req.body;
    try {
      const updatedStudent = await prisma.student.update({
        where: { id: String(id) },
        data: { firstName, lastName, classId },
      });
      res.status(200).json(updatedStudent);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update student' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.student.delete({ where: { id: String(id) } });
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete student' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}