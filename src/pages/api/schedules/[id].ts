import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { User } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid schedule ID' });
  }

  if (req.method === 'DELETE') {
    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id },
        include: {
          class: {
            include: {
              school: true,
            },
          },
        },
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser || dbUser.schoolId !== schedule.class.schoolId) {
        return res.status(403).json({ error: 'You do not have permission to delete this schedule.' });
      }

      await prisma.schedule.delete({
        where: { id },
      });

      res.status(200).json({ message: 'Schedule deleted successfully' });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}