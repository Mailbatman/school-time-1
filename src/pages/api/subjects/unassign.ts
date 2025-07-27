import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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

  const { classSubjectId } = req.body;

  if (!classSubjectId) {
    return res.status(400).json({ error: 'Class-Subject ID is required.' });
  }

  try {
    // Verify the ClassSubject record belongs to a class within the user's school
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        id: String(classSubjectId),
        class: {
          schoolId: dbUser.schoolId,
        },
      },
    });

    if (!classSubject) {
      return res.status(404).json({ error: 'Assignment not found or you do not have permission to modify it.' });
    }

    await prisma.classSubject.delete({
      where: {
        id: String(classSubjectId),
      },
    });

    res.status(200).json({ message: 'Subject unassigned successfully.' });
  } catch (error) {
    console.error('Failed to unassign subject:', error);
    res.status(500).json({ error: 'Failed to unassign subject' });
  }
}