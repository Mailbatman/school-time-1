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

  if (dbUser?.role !== 'SCHOOL_ADMIN' || !dbUser.schoolId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'POST') {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Subject name is required' });
    }

    try {
      const subject = await prisma.subject.create({
        data: {
          name,
          schoolId: dbUser.schoolId,
        },
      });
      res.status(201).json(subject);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'A subject with this name already exists in your school.' });
      }
      console.error(error);
      res.status(500).json({ error: 'Failed to create subject' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}