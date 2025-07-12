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

  const userRole = (await prisma.user.findUnique({ where: { id: user.id } }))?.role;

  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { schoolId, adminEmail } = req.body;

  if (!schoolId || !adminEmail) {
    return res.status(400).json({ error: 'School ID and admin email are required' });
  }

  try {
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!adminUser) {
      return res.status(404).json({ error: 'User not found. Please ask them to sign up first.' });
    }

    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        schoolId: schoolId,
        role: 'SCHOOL_ADMIN',
      },
    });

    res.status(200).json({ message: 'School admin assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign school admin' });
  }
}