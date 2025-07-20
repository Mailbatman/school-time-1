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

        // Create default classes for the new school
        const defaultGrades = [
          'Pre-K', 'K1', 'K2',
          'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
          'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
          'Grade 11', 'Grade 12'
        ];
        const classesToCreate = defaultGrades.map(grade => ({
          name: `${grade}-A`,
          schoolId: school.id,
        }));

        await prisma.class.createMany({
          data: classesToCreate,
        });

        // 2. Find or create the school admin user
        let authUser;
        const { data: { users: allUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
          throw new Error(`Failed to list users: ${listError.message}`);
        }

        const existingUser = allUsers.find(u => u.email === enrollment.contactEmail);

        if (existingUser) {
          authUser = existingUser;
        } else {
          const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: enrollment.contactEmail,
            email_confirm: true,
          });
          if (createError) {
            throw new Error(`Failed to create auth user: ${createError.message}`);
          }
          if (!newAuthUser?.user) {
            throw new Error('User was not created in Supabase Auth.');
          }
          authUser = newAuthUser.user;
        }

        // 3. Create or update the user in our public.User table
        await prisma.user.upsert({
          where: { id: authUser.id },
          update: {
            schoolId: school.id,
            role: 'SCHOOL_ADMIN',
          },
          create: {
            id: authUser.id,
            email: enrollment.contactEmail,
            firstName: enrollment.contactName,
            role: 'SCHOOL_ADMIN',
            schoolId: school.id,
          },
        });

        // 4. Send the welcome/password setup OTP
        const supabasePublic = createSupabaseAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { error: otpError } = await supabasePublic.auth.signInWithOtp({
          email: enrollment.contactEmail,
          options: {
            shouldCreateUser: false,
          },
        });

        if (otpError) {
          console.error('Failed to send OTP:', otpError);
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