import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { getUserFromRequest } from '@/util/supabase/server-props';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const supabase = createClient(req, res);
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if the user is a school admin
  const dbUser = await prisma.dbUser.findUnique({
    where: { id: user.id },
    include: { school: true },
  });

  if (!dbUser || dbUser.role !== 'SCHOOL_ADMIN' || !dbUser.schoolId) {
    return res.status(403).json({ error: 'Forbidden: User is not a school admin.' });
  }

  const { subjectId, classIds } = req.body;

  if (!subjectId || !Array.isArray(classIds) || classIds.length === 0) {
    return res.status(400).json({ error: 'Invalid request body. subjectId and classIds are required.' });
  }

  try {
    // Verify that the subject and classes belong to the admin's school
    const subject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId: dbUser.schoolId,
      },
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found or does not belong to this school.' });
    }

    const classes = await prisma.class.findMany({
      where: {
        id: { in: classIds },
        schoolId: dbUser.schoolId,
      },
    });

    if (classes.length !== classIds.length) {
      return res.status(404).json({ error: 'One or more classes not found or do not belong to this school.' });
    }

    // Create the associations in the join table
    const assignments = classIds.map(classId => ({
      classId: classId,
      subjectId: subjectId,
    }));

    // Use createMany to bulk insert the new associations
    // Note: createMany with a many-to-many relation needs to be done on the join table model if it's explicit.
    // Prisma's implicit M2M tables are named `_ClassToSubject`. Let's check schema.
    
    // The relation is explicit through `ClassSubject`. We create new entries there.
    const assignments = classIds.map(classId => ({
      classId: classId,
      subjectId: subjectId,
    }));

    await prisma.classSubject.createMany({
      data: assignments,
      skipDuplicates: true, // Avoid errors if the assignment already exists
    });

    return res.status(200).json({ message: 'Subject assigned successfully.' });
  } catch (error) {
    console.error('Error assigning subject:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}