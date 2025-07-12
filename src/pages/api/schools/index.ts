import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userRole = (await prisma.user.findUnique({ where: { id: user.id } }))?.role;

  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'POST') {
    const { name } = req.body;
    try {
      const school = await prisma.school.create({
        data: { name },
      });
      res.status(201).json(school);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create school' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}