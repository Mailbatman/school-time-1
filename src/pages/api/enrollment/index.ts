import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { z } from 'zod';

const enrollmentSchema = z.object({
  schoolName: z.string().min(1, "School name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().min(1, "Contact phone is required"),
  website: z.string().url("Invalid URL").optional().or(z.literal('')),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().length(6, "Pincode must be 6 digits"),
  estimatedStudents: z.number().positive("Must be a positive number"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const supabase = createClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

    if (dbUser?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const enrollments = await prisma.schoolEnrollment.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json({ data: enrollments });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch enrollments' });
    }
  } else if (req.method === 'POST') {
    try {
      const validation = enrollmentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid input', details: validation.error.flatten() });
      }

      const { schoolName, contactName, contactEmail, contactPhone, website, address, city, state, zipCode, estimatedStudents } = validation.data;
      
      const newEnrollment = await prisma.schoolEnrollment.create({
        data: {
          schoolName,
          contactName,
          contactEmail,
          contactPhone,
          website: website || null,
          address,
          city,
          state,
          zipCode,
          estimatedStudents,
        },
      });
      res.status(201).json(newEnrollment);
    } catch (error) {
      console.error('Enrollment API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: 'Failed to submit enrollment application', details: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}