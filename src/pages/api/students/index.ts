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

  if (req.method === 'POST') {
    const { firstName, lastName, classId, parentEmail } = req.body;

    if (!firstName || !lastName || !classId || !parentEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const parent = await prisma.user.findUnique({ where: { email: parentEmail } });
      if (!parent) {
        return res.status(404).json({ error: 'Parent user not found. Please ask them to sign up first.' });
      }
      if (parent.role !== 'PARENT_STUDENT') {
        return res.status(400).json({ error: 'User is not a parent/student.' });
      }

      const newStudent = await prisma.student.create({
        data: {
          firstName,
          lastName,
          classId,
          parentId: parent.id,
          schoolId: dbUser.schoolId,
        },
      });
      res.status(201).json(newStudent);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create student' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}