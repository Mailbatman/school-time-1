import { useState, useEffect, useCallback } from 'react';
import { SchoolEnrollment } from '@prisma/client';
import { toast } from '@/components/ui/use-toast';
import { SchoolWithAdmin } from '@/types/schools';

export const useSuperAdminData = () => {
  const [schools, setSchools] = useState<SchoolWithAdmin[]>([]);
  const [enrollments, setEnrollments] = useState<SchoolEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [schoolsResponse, enrollmentsResponse] = await Promise.all([
        fetch('/api/schools'),
        fetch('/api/enrollment'),
      ]);

      if (!schoolsResponse.ok || !enrollmentsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const schoolsData = await schoolsResponse.json();
      const enrollmentsData = await enrollmentsResponse.json();

      setSchools(schoolsData.data);
      setEnrollments(enrollmentsData.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const performAsyncAction = async (
    id: string,
    action: () => Promise<Response>,
    successMessage: string,
    errorMessage: string
  ) => {
    setUpdatingIds((prev) => new Set(prev).add(id));
    try {
      const response = await action();
      if (response.ok) {
        toast({ title: 'Success', description: successMessage });
        await fetchData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || errorMessage);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUpdatingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const approveEnrollment = (id: string) =>
    performAsyncAction(
      id,
      () =>
        fetch(`/api/enrollment/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        }),
      'Enrollment approved successfully.',
      'Failed to approve enrollment.'
    );

  const declineEnrollment = (id: string) =>
    performAsyncAction(
      id,
      () =>
        fetch(`/api/enrollment/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'REJECTED' }),
        }),
      'Enrollment declined successfully.',
      'Failed to decline enrollment.'
    );

  const updateSchoolStatus = (id: string, isActive: boolean) =>
    performAsyncAction(
      id,
      () =>
        fetch(`/api/schools/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive }),
        }),
      `School status updated to ${isActive ? 'Active' : 'Inactive'}.`,
      'Failed to update school status.'
    );

  const assignSchoolAdmin = (schoolId: string, adminEmail: string) =>
    performAsyncAction(
      schoolId,
      () =>
        fetch('/api/schools/assign-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId, adminEmail }),
        }),
      'School admin assigned successfully.',
      'Failed to assign school admin.'
    );

  return {
    schools,
    enrollments,
    loading,
    error,
    isUpdating: (id: string) => updatingIds.has(id),
    approveEnrollment,
    declineEnrollment,
    updateSchoolStatus,
    assignSchoolAdmin,
  };
};