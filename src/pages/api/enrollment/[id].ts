import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { EnrollmentStatus } from '@prisma/client';

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

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { status } = req.body as { status: EnrollmentStatus };

    if (!Object.values(EnrollmentStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    try {
      const enrollment = await prisma.schoolEnrollment.findUnique({ where: { id: String(id) } });
      if (!enrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      const updatedEnrollment = await prisma.schoolEnrollment.update({
        where: { id: String(id) },
        data: {
          status,
          approvedById: user.id,
          approvedAt: new Date(),
        },
      });

      if (status === 'APPROVED' && enrollment.status !== 'APPROVED') {
        // Create school and school admin user
        const school = await prisma.school.create({
          data: {
            name: enrollment.schoolName,
          },
        });

        // Note: Supabase admin actions (like creating a user) should be handled in a secure environment.
        // This is a simplified example. In a real app, you'd use a service role key and protect this endpoint.
        // Since we can't create a user in Supabase Auth directly from here without admin privileges,
        // we'll create the user in our DB and the admin will need to complete the setup.
        
        // For now, we'll just mark as approved. The super admin will need to manually create the school admin user.
      }

      res.status(200).json(updatedEnrollment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update enrollment' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}