import { useState, useEffect, useCallback } from 'react';
import { School, SchoolEnrollment } from '@prisma/client';

export function useSuperAdminData(initialData: { schools: School[], enrollments: SchoolEnrollment[] }) {
  const [schools, setSchools] = useState<School[]>(initialData.schools);
  const [enrollments, setEnrollments] = useState<SchoolEnrollment[]>(initialData.enrollments);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [schoolsRes, enrollmentsRes] = await Promise.all([
        fetch('/api/schools'),
        fetch('/api/enrollment')
      ]);
      
      if (!schoolsRes.ok || !enrollmentsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const { data: schoolsData } = await schoolsRes.json();
      const { data: enrollmentsData } = await enrollmentsRes.json();
      
      setSchools(schoolsData);
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error("Failed to fetch super admin data:", error);
      // Optionally, handle the error in the UI
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { schools, enrollments, isLoading, refetch: fetchData };
}