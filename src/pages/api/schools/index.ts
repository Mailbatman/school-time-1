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

  if (dbUser?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    try {
      const schools = await prisma.school.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json({ data: schools });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch schools' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}