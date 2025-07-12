import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useSuperAdminData } from '@/hooks/useSuperAdminData';
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
} from '@/components/ui/dialog';
import prisma from '@/lib/prisma';
import { GetServerSideProps } from 'next';
import { School, SchoolEnrollment, User } from '@prisma/client';
import { Badge } from '@/components/ui/badge';

type SchoolWithAdmin = School & {
  users: Pick<User, 'email'>[];
};

interface SuperAdminDashboardProps {
  schools: SchoolWithAdmin[];
  enrollments: SchoolEnrollment[];
}

const SuperAdminDashboard = ({ schools: initialSchools, enrollments: initialEnrollments }: SuperAdminDashboardProps) => {
  const { userProfile } = useAuth();
  const { schools, enrollments, refetch } = useSuperAdminData({ schools: initialSchools, enrollments: initialEnrollments });
  const [editingSchool, setEditingSchool] = useState<SchoolWithAdmin | null>(null);
  const [assigningAdmin, setAssigningAdmin] = useState<SchoolWithAdmin | null>(null);
  const [adminEmail, setAdminEmail] = useState('');

  const handleUpdateSchool = async () => {
    if (!editingSchool) return;
    try {
      const response = await fetch(`/api/schools/${editingSchool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSchool.name }),
      });
      if (response.ok) {
        setEditingSchool(null);
        toast({ title: 'Success', description: 'School updated successfully.' });
        refetch();
      } else {
        toast({ title: 'Error', description: 'Failed to update school.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An error occurred.', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (school: SchoolWithAdmin) => {
    try {
      const response = await fetch(`/api/schools/${school.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !school.isActive }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: `School ${!school.isActive ? 'enabled' : 'disabled'}.` });
        refetch();
      } else {
        toast({ title: 'Error', description: 'Failed to update school status.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An error occurred.', variant: 'destructive' });
    }
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
        refetch();
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
        toast({ title: 'Success', description: `Enrollment ${status.toLowerCase()}.` });
        refetch();
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
              <CardTitle>All Schools</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School Name</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(schools as SchoolWithAdmin[]).map((school) => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">{school.name}</TableCell>
                      <TableCell>{school.users[0]?.email || 'Not Assigned'}</TableCell>
                      <TableCell>
                        <Badge variant={school.isActive ? 'default' : 'destructive'}>
                          {school.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(school.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setEditingSchool(school)}>
                              Edit School
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setAssigningAdmin(school);
                              setAdminEmail(school.users[0]?.email || '');
                            }}>
                              Assign Admin
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleActive(school)}>
                              {school.isActive ? 'Disable' : 'Enable'} School
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
        <Toaster />

        <Dialog open={!!editingSchool} onOpenChange={(isOpen) => !isOpen && setEditingSchool(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit School</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input
                placeholder="School name"
                value={editingSchool?.name || ''}
                onChange={(e) => setEditingSchool(s => s ? { ...s, name: e.target.value } : null)}
              />
              <Button onClick={handleUpdateSchool}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!assigningAdmin} onOpenChange={(isOpen) => !isOpen && setAssigningAdmin(null)}>
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
      </div>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  const [schools, enrollments] = await Promise.all([
    prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { role: 'SCHOOL_ADMIN' },
          select: { email: true },
        },
      },
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