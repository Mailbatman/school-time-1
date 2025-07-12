import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

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
      const { schoolName, contactName, contactEmail, contactPhone, website, address, city, state, zipCode, estimatedStudents } = req.body;

      if (!schoolName || !contactName || !contactEmail || !contactPhone || !address || !city || !state || !zipCode || !estimatedStudents) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
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
          estimatedStudents: Number(estimatedStudents),
        },
      });
      res.status(201).json(newEnrollment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to submit enrollment application' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}