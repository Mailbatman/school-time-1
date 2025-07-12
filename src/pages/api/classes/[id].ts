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

  const classItem = await prisma.class.findUnique({ where: { id: String(id) } });
  if (!classItem || classItem.schoolId !== dbUser.schoolId) {
    return res.status(404).json({ error: 'Class not found' });
  }

  if (req.method === 'PUT') {
    const { name, teacherIds } = req.body;
    try {
      const updatedClass = await prisma.class.update({
        where: { id: String(id) },
        data: {
          name,
          teachers: teacherIds ? { set: teacherIds.map((id: string) => ({ id })) } : undefined,
        },
      });
      res.status(200).json(updatedClass);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update class' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.class.delete({ where: { id: String(id) } });
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete class' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}