import { useState } from 'react';
import { GetServerSideProps } from 'next';
import { createClient } from '@/util/supabase/server-props';
import prisma from '@/lib/prisma';
import { Class, Student, Subject, User as DbUser, Schedule, Role } from '@prisma/client';
import ScheduleManager from '@/components/ScheduleManager';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

type ManagePageProps = {
  initialClasses: (Class & { teachers: DbUser[]; isActive: boolean; subjects: { subject: Subject }[] })[];
  initialStudents: (Student & { class: Class })[];
  initialSubjects: Subject[];
  teachers: DbUser[];
  initialSchedules: (Schedule & { class: Class; subject: Subject; teacher: DbUser })[];
};

const ManagePage = ({ initialClasses, initialStudents, initialSubjects, teachers, initialSchedules }: ManagePageProps) => {
  const [classes, setClasses] = useState(() => initialClasses.sort((a, b) => a.name.localeCompare(b.name)));
  const [students, setStudents] = useState(initialStudents);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [newClassName, setNewClassName] = useState('');
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', classId: '', parentEmail: '' });
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [renamingClassName, setRenamingClassName] = useState('');
  const [classToDeactivate, setClassToDeactivate] = useState<Class | null>(null);

  const handleAddSection = async (baseClassName: string) => {
    const parts = baseClassName.split('-');
    if (parts.length < 2) {
      toast({ title: 'Cannot add section', description: 'Class name is not in a Grade-Section format.', variant: 'destructive' });
      return;
    }

    const grade = parts.slice(0, -1).join('-');
    
    const gradeClasses = classes
      .map(c => c.name)
      .filter(name => name.startsWith(grade + '-'));

    const lastSection = gradeClasses
      .map(name => name.split('-').pop()!)
      .filter(section => section.length === 1 && section >= 'A' && section <= 'Z')
      .sort()
      .pop();

    if (!lastSection) {
      toast({ title: 'Cannot add section', description: 'Could not determine the next section.', variant: 'destructive' });
      return;
    }

    const nextSection = String.fromCharCode(lastSection.charCodeAt(0) + 1);
    const newClassName = `${grade}-${nextSection}`;

    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClassName }),
    });

    if (res.ok) {
      const createdClass = await res.json();
      setClasses(prevClasses => [...prevClasses, { ...createdClass, teachers: [] }].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: 'Section created', description: `Successfully created ${newClassName}.` });
    } else {
      toast({ title: 'Error creating section', variant: 'destructive' });
    }
  };

  const handleRenameClass = async () => {
    if (!editingClass || !renamingClassName) return;

    const res = await fetch(`/api/classes/${editingClass.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renamingClassName }),
    });

    if (res.ok) {
      const updatedClass = await res.json();
      setClasses(classes.map(c => c.id === updatedClass.id ? { ...c, name: updatedClass.name } : c).sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: 'Class renamed' });
    } else {
      toast({ title: 'Error renaming class', variant: 'destructive' });
    }
    setEditingClass(null);
    setRenamingClassName('');
  };

  const handleDeactivateClass = async () => {
    if (!classToDeactivate) return;

    const res = await fetch(`/api/classes/${classToDeactivate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    });

    if (res.ok) {
      setClasses(classes.map(c => c.id === classToDeactivate.id ? { ...c, isActive: false } : c));
      toast({ title: 'Class deactivated' });
    } else {
      toast({ title: 'Error deactivating class', variant: 'destructive' });
    }
    setClassToDeactivate(null);
  };

  const handleCreateClass = async () => {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClassName }),
    });
    if (res.ok) {
      const createdClass = await res.json();
      setClasses(prevClasses => [...prevClasses, { ...createdClass, teachers: [] }].sort((a, b) => a.name.localeCompare(b.name)));
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

  const handleCreateSubject = async () => {
    if (!newSubjectName) return;
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSubjectName }),
    });
    if (res.ok) {
      const createdSubject = await res.json();
      setSubjects([...subjects, createdSubject]);
      setNewSubjectName('');
      toast({ title: 'Subject created' });
    } else {
      const { error } = await res.json();
      toast({ title: 'Error creating subject', description: error, variant: 'destructive' });
    }
  };

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <Header />
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">School Admin Dashboard</h1>
        <Tabs defaultValue="classes">
          <TabsList className="mb-4">
            <TabsTrigger value="classes">Manage Classes</TabsTrigger>
            <TabsTrigger value="subjects">Manage Subjects</TabsTrigger>
            <TabsTrigger value="students">Manage Students</TabsTrigger>
            <TabsTrigger value="schedule">Manage Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle>Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="New class name (e.g., Grade 1-A)"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                  />
                  <Button onClick={handleCreateClass}>Create Class</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Teachers</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((c) => (
                      <TableRow key={c.id} className={!c.isActive ? 'text-muted-foreground' : ''}>
                        <TableCell>
                          {editingClass?.id === c.id ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                value={renamingClassName}
                                onChange={(e) => setRenamingClassName(e.target.value)}
                                className="h-8"
                              />
                              <Button size="sm" onClick={handleRenameClass}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingClass(null)}>Cancel</Button>
                            </div>
                          ) : (
                            c.name
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>{c.teachers.map(t => `${t.firstName} ${t.lastName}`).join(', ')}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleAddSection(c.name)}>
                                Add Section
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingClass(c); setRenamingClassName(c.name); }}>
                                Rename
                              </DropdownMenuItem>
                              {c.isActive && (
                                <DropdownMenuItem onClick={() => setClassToDeactivate(c)} className="text-red-600">
                                  Deactivate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects">
            <Card>
              <CardHeader>
                <CardTitle>Subjects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="New subject name"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                  />
                  <Button onClick={handleCreateSubject}>Add Subject</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell className="text-right">
                          {/* Placeholder for future actions */}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Student</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Input placeholder="First Name" value={newStudent.firstName} onChange={(e) => setNewStudent({...newStudent, firstName: e.target.value})} />
                      <Input placeholder="Last Name" value={newStudent.lastName} onChange={(e) => setNewStudent({...newStudent, lastName: e.target.value})} />
                      <Input placeholder="Parent's Email" type="email" value={newStudent.parentEmail} onChange={(e) => setNewStudent({...newStudent, parentEmail: e.target.value})} />
                      <Select onValueChange={(value) => setNewStudent({...newStudent, classId: value})} value={newStudent.classId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.filter(c => c.isActive).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleCreateStudent} className="w-full">Add Student</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>All Students</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>{s.firstName} {s.lastName}</TableCell>
                            <TableCell>{s.class.name}</TableCell>
                            <TableCell className="text-right">
                              {/* Placeholder for future actions */}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <ScheduleManager 
              classes={initialClasses} 
              subjects={initialSubjects} 
              teachers={teachers} 
              initialSchedules={initialSchedules} 
            />
          </TabsContent>
        </Tabs>
      </main>
      <Toaster />
      <AlertDialog open={!!classToDeactivate} onOpenChange={(open) => !open && setClassToDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivating this class will prevent new students from being added.
              This action can be undone later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivateClass}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

  let [initialClasses, initialStudents, initialSubjects, teachers, initialSchedules] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: dbUser.schoolId },
      include: {
        teachers: true,
        classSubjects: {
          include: {
            subject: true
          }
        }
      }
    }),
    prisma.student.findMany({ where: { schoolId: dbUser.schoolId }, include: { class: true } }),
    prisma.subject.findMany({ where: { schoolId: dbUser.schoolId }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { schoolId: dbUser.schoolId, role: 'TEACHER' } }),
    prisma.schedule.findMany({
      where: { schoolId: dbUser.schoolId },
      include: {
        class: true,
        subject: true,
        teacher: true,
      }
    }),
  ]);

  if (teachers.length === 0) {
    const schoolId = dbUser.schoolId!;
    const dummyTeacherEmail = `dummy.teacher@${schoolId}.local`;
    let dummyTeacher = await prisma.user.findUnique({
      where: { email: dummyTeacherEmail },
    });

    if (!dummyTeacher) {
      dummyTeacher = await prisma.user.create({
        data: {
          email: dummyTeacherEmail,
          firstName: 'Dummy',
          lastName: 'Teacher',
          role: 'TEACHER',
          schoolId: schoolId,
          onboarded: true,
          isActive: false, // Keep it inactive to avoid showing up in real teacher lists
          phone: null,
          profileImage: null,
        },
      });
    }
    teachers.push(dummyTeacher);
  }

  const transformedClasses = initialClasses.map(c => ({
    ...c,
    subjects: c.classSubjects.map(cs => ({ subject: cs.subject }))
  }));

  return {
    props: {
      initialClasses: JSON.parse(JSON.stringify(transformedClasses)),
      initialStudents: JSON.parse(JSON.stringify(initialStudents)),
      initialSubjects: JSON.parse(JSON.stringify(initialSubjects)),
      teachers: JSON.parse(JSON.stringify(teachers)),
      initialSchedules: JSON.parse(JSON.stringify(initialSchedules)),
    },
  };
};

export default ManagePage;