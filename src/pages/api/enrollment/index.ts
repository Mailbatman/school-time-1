import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const enrollmentData = req.body;
      const newEnrollment = await prisma.schoolEnrollment.create({
        data: {
          ...enrollmentData,
          estimatedStudents: Number(enrollmentData.estimatedStudents),
        },
      });
      res.status(201).json(newEnrollment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to submit enrollment application' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}