import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/util/supabase/api';
import { EnrollmentStatus } from '@prisma/client';

// Initialize Supabase client with service role key for admin actions
const supabaseAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
        // 1. Create the school
        const school = await prisma.school.create({
          data: {
            name: enrollment.schoolName,
            enrollmentId: enrollment.id,
          },
        });

        // 2. Create the school admin user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: enrollment.contactEmail,
          email_confirm: true, // Automatically confirm the email
        });

        if (authError) {
          // If user already exists, we can try to find them and assign them.
          // For now, we'll throw an error to keep it simple.
          throw new Error(`Failed to create auth user: ${authError.message}`);
        }

        if (!authData.user) {
          throw new Error('User was not created in Supabase Auth.');
        }

        // 3. Create the user in our public.User table
        await prisma.user.create({
          data: {
            id: authData.user.id,
            email: enrollment.contactEmail,
            firstName: enrollment.contactName,
            role: 'SCHOOL_ADMIN',
            schoolId: school.id,
          },
        });

        // 4. Send the welcome/password setup email
        const { error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: enrollment.contactEmail,
        });

        if (inviteError) {
            console.error('Failed to send magic link email:', inviteError);
            // Continue even if email fails, as the accounts are created.
        }
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