import { useState } from 'react';
import { GetServerSideProps } from 'next';
import { createClient } from '@/util/supabase/server-props';
import prisma from '@/lib/prisma';
import { Class, Student, User as DbUser } from '@prisma/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ManagePageProps = {
  initialClasses: (Class & { teachers: DbUser[] })[];
  initialStudents: (Student & { class: Class })[];
  teachers: DbUser[];
};

const ManagePage = ({ initialClasses, initialStudents, teachers }: ManagePageProps) => {
  const [classes, setClasses] = useState(initialClasses);
  const [students, setStudents] = useState(initialStudents);
  const [newClassName, setNewClassName] = useState('');
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', classId: '', parentEmail: '' });

  const handleCreateClass = async () => {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClassName }),
    });
    if (res.ok) {
      const createdClass = await res.json();
      setClasses([...classes, { ...createdClass, teachers: [] }]);
      setNewClassName('');
      toast({ title: 'Class created' });
    } else {
      toast({ title: 'Error creating class', variant: 'destructive' });
    }
  };

  const handleCreateStudent = async () => {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStudent),
    });
    if (res.ok) {
      const createdStudent = await res.json();
      const studentClass = classes.find(c => c.id === createdStudent.classId);
      setStudents([...students, { ...createdStudent, class: studentClass! }]);
      setNewStudent({ firstName: '', lastName: '', classId: '', parentEmail: '' });
      toast({ title: 'Student created' });
    } else {
      const { error } = await res.json();
      toast({ title: 'Error creating student', description: error, variant: 'destructive' });
    }
  };

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <Header />
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">School Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Manage Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="New class name"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                />
                <Button onClick={handleCreateClass}>Add Class</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Teachers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.teachers.map(t => `${t.firstName} ${t.lastName}`).join(', ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Manage Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <Input placeholder="First Name" value={newStudent.firstName} onChange={(e) => setNewStudent({...newStudent, firstName: e.target.value})} />
                <Input placeholder="Last Name" value={newStudent.lastName} onChange={(e) => setNewStudent({...newStudent, lastName: e.target.value})} />
                <Input placeholder="Parent's Email" value={newStudent.parentEmail} onChange={(e) => setNewStudent({...newStudent, parentEmail: e.target.value})} />
                <Select onValueChange={(value) => setNewStudent({...newStudent, classId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={handleCreateStudent} className="w-full">Add Student</Button>
              </div>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.firstName} {s.lastName}</TableCell>
                      <TableCell>{s.class.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
      <Toaster />
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (dbUser?.role !== 'SCHOOL_ADMIN' || !dbUser.schoolId) {
    return { redirect: { destination: '/unauthorized', permanent: false } };
  }

  const [initialClasses, initialStudents, teachers] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: dbUser.schoolId }, include: { teachers: true } }),
    prisma.student.findMany({ where: { schoolId: dbUser.schoolId }, include: { class: true } }),
    prisma.user.findMany({ where: { schoolId: dbUser.schoolId, role: 'TEACHER' } }),
  ]);

  return {
    props: {
      initialClasses: JSON.parse(JSON.stringify(initialClasses)),
      initialStudents: JSON.parse(JSON.stringify(initialStudents)),
      teachers: JSON.parse(JSON.stringify(teachers)),
    },
  };
};

export default ManagePage;