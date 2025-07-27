import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

  if (dbUser?.role !== 'SCHOOL_ADMIN' || !dbUser.schoolId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.query;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Subject name is required.' });
  }

  try {
    // Verify the subject belongs to the user's school before updating
    const subject = await prisma.subject.findFirst({
      where: {
        id: String(id),
        schoolId: dbUser.schoolId,
      },
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found or you do not have permission to edit it.' });
    }

    const updatedSubject = await prisma.subject.update({
      where: {
        id: String(id),
      },
      data: {
        name: name.trim(),
      },
    });

    res.status(200).json(updatedSubject);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A subject with this name already exists in your school.' });
    }
    console.error('Failed to update subject:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
}