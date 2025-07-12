import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import prisma from '@/lib/prisma';
import { GetServerSideProps } from 'next';
import { School, SchoolEnrollment } from '@prisma/client';
import { Badge } from '@/components/ui/badge';

interface SuperAdminDashboardProps {
  schools: School[];
  enrollments: SchoolEnrollment[];
}

const SuperAdminDashboard = ({ schools: initialSchools, enrollments: initialEnrollments }: SuperAdminDashboardProps) => {
  const { userProfile } = useAuth();
  const [schools, setSchools] = useState<School[]>(initialSchools);
  const [enrollments, setEnrollments] = useState<SchoolEnrollment[]>(initialEnrollments);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [assigningAdmin, setAssigningAdmin] = useState<School | null>(null);
  const [adminEmail, setAdminEmail] = useState('');

  const handleCreateSchool = async () => {
    if (!newSchoolName.trim()) return;
    try {
      const response = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSchoolName }),
      });
      if (response.ok) {
        const newSchool = await response.json();
        setSchools([...schools, newSchool]);
        setNewSchoolName('');
        toast({ title: 'Success', description: 'School created successfully.' });
      } else {
        toast({ title: 'Error', description: 'Failed to create school.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An error occurred.', variant: 'destructive' });
    }
  };

  const handleUpdateSchool = async (school: School) => {
    try {
      const response = await fetch(`/api/schools/${school.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: school.name, isActive: school.isActive }),
      });
      if (response.ok) {
        const updatedSchool = await response.json();
        setSchools(schools.map(s => s.id === updatedSchool.id ? updatedSchool : s));
        setEditingSchool(null);
        toast({ title: 'Success', description: 'School updated successfully.' });
      } else {
        toast({ title: 'Error', description: 'Failed to update school.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An error occurred.', variant: 'destructive' });
    }
  };

  const handleToggleActive = (school: School) => {
    const updatedSchool = { ...school, isActive: !school.isActive };
    handleUpdateSchool(updatedSchool);
  };

  const handleAssignAdmin = async () => {
    if (!assigningAdmin || !adminEmail.trim()) return;
    try {
      const response = await fetch('/api/schools/assign-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: assigningAdmin.id, adminEmail }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'School admin assigned successfully.' });
        setAssigningAdmin(null);
        setAdminEmail('');
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to assign admin.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An error occurred.', variant: 'destructive' });
    }
  };

  const handleUpdateEnrollmentStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(`/api/enrollment/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        const updatedEnrollment = await response.json();
        setEnrollments(enrollments.map(e => e.id === id ? updatedEnrollment : e));
        toast({ title: 'Success', description: `Enrollment ${status.toLowerCase()}.` });
        if (status === 'APPROVED') {
          // The school is created on the backend. A page refresh will show the new school in the list below.
        }
      } else {
        toast({ title: 'Error', description: 'Failed to update enrollment.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An error occurred.', variant: 'destructive' });
    }
  };

  return (
    <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN']}>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow p-4 md:p-8 space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary">Super Admin Dashboard</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Welcome, {userProfile?.firstName} {userProfile?.lastName}!
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Enrollment Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>{enrollment.schoolName}</TableCell>
                      <TableCell>{enrollment.contactName} ({enrollment.contactEmail})</TableCell>
                      <TableCell><Badge variant={enrollment.status === 'PENDING' ? 'secondary' : enrollment.status === 'APPROVED' ? 'default' : 'destructive'}>{enrollment.status}</Badge></TableCell>
                      <TableCell className="flex gap-2">
                        {enrollment.status === 'PENDING' && (
                          <>
                            <Button size="sm" onClick={() => handleUpdateEnrollmentStatus(enrollment.id, 'APPROVED')}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleUpdateEnrollmentStatus(enrollment.id, 'REJECTED')}>Reject</Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage Schools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="New school name"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                />
                <Button onClick={handleCreateSchool}>Add School</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>
                        {editingSchool?.id === school.id ? (
                          <Input
                            value={editingSchool.name}
                            onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                            onBlur={() => handleUpdateSchool(editingSchool)}
                          />
                        ) : (
                          <span onDoubleClick={() => setEditingSchool(school)}>{school.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={school.isActive}
                          onCheckedChange={() => handleToggleActive(school)}
                        />
                        <span className="ml-2">{school.isActive ? 'Active' : 'Disabled'}</span>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingSchool(school)}>Edit</Button>
                        <Dialog open={!!assigningAdmin && assigningAdmin.id === school.id} onOpenChange={(isOpen) => !isOpen && setAssigningAdmin(null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setAssigningAdmin(school)}>Assign Admin</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign Admin to {assigningAdmin?.name}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <Input
                                placeholder="Admin email"
                                value={adminEmail}
                                onChange={(e) => setAdminEmail(e.target.value)}
                              />
                              <Button onClick={handleAssignAdmin}>Assign</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
        <Toaster />
      </div>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  const [schools, enrollments] = await Promise.all([
    prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.schoolEnrollment.findMany({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    props: {
      schools: JSON.parse(JSON.stringify(schools)),
      enrollments: JSON.parse(JSON.stringify(enrollments)),
    },
  };
};

export default SuperAdminDashboard;