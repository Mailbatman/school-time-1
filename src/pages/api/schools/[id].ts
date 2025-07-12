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

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { name } = req.body;
    try {
      const school = await prisma.school.update({
        where: { id: String(id) },
        data: { name },
      });
      res.status(200).json(school);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update school' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.school.delete({
        where: { id: String(id) },
      });
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete school' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}