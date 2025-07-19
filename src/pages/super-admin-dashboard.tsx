import { useState } from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSuperAdminData } from '@/hooks/useSuperAdminData';
import { SchoolWithAdmin } from '@/types/schools';
import { EnrollmentDetailsDialog } from '@/components/EnrollmentDetailsDialog';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/ProtectedRoute';

const SuperAdminDashboard = () => {
  const {
    schools,
    enrollments,
    loading,
    error,
    approveEnrollment,
    declineEnrollment,
    updateSchoolStatus,
    assignSchoolAdmin,
    isUpdating,
  } = useSuperAdminData();

  const [isAssignAdminOpen, setIsAssignAdminOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithAdmin | null>(
    null
  );
  const [adminEmail, setAdminEmail] = useState('');

  const handleAssignAdminClick = (school: SchoolWithAdmin) => {
    setSelectedSchool(school);
    setAdminEmail(school.users[0]?.email || '');
    setIsAssignAdminOpen(true);
  };

  const handleStatusToggle = async (school: SchoolWithAdmin) => {
    await updateSchoolStatus(school.id, !school.isActive);
  };

  const handleAssignAdmin = async () => {
    if (selectedSchool && adminEmail) {
      await assignSchoolAdmin(selectedSchool.id, adminEmail);
      setIsAssignAdminOpen(false);
      setAdminEmail('');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="flex justify-center items-center h-screen">Error: {error}</div>;

  return (
    <ProtectedRoute roles={['SUPER_ADMIN']}>
      <div className="flex flex-col h-screen bg-gray-50">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="grid gap-8 md:grid-cols-2">
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
                        <TableCell>{enrollment.contactName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              enrollment.status === 'PENDING'
                                ? 'secondary'
                                : enrollment.status === 'APPROVED'
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {enrollment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {enrollment.status === 'PENDING' && (
                            <EnrollmentDetailsDialog
                              enrollment={enrollment}
                              onApprove={approveEnrollment}
                              onDecline={declineEnrollment}
                              isApproving={isUpdating(enrollment.id)}
                              isDeclining={isUpdating(enrollment.id)}
                            />
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => (
                      <TableRow key={school.id}>
                        <TableCell>{school.name}</TableCell>
                        <TableCell>
                          {school.users[0]?.email || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={school.isActive ? 'default' : 'destructive'}
                          >
                            {school.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(school.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleStatusToggle(school)}
                              >
                                {school.isActive ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAssignAdminClick(school)}
                              >
                                Assign Admin
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
          </div>

          {selectedSchool && (
            <Dialog
              open={isAssignAdminOpen}
              onOpenChange={setIsAssignAdminOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Admin to {selectedSchool.name}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="admin-email" className="text-right">
                      Admin Email
                    </Label>
                    <Input
                      id="admin-email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <Button onClick={handleAssignAdmin} disabled={isUpdating(selectedSchool.id)}>
                  {isUpdating(selectedSchool.id) ? 'Assigning...' : 'Assign'}
                </Button>
              </DialogContent>
            </Dialog>
          )}
        </main>
        <Toaster />
      </div>
    </ProtectedRoute>
  );
};

export default SuperAdminDashboard;