import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { Class, Subject, ClassSubject } from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronRight } from 'lucide-react';
import { SubjectRelationshipTree } from './SubjectRelationshipTree';
import { ClassSubjectOverview } from './ClassSubjectOverview';

// Define extended types to include relations
type FullSubject = Subject;
type FullClass = Class & { classSubjects: (ClassSubject & { subject: FullSubject })[] };

// Subject Card Item
const SubjectCard = React.memo(({ subject, onSelect, assignedClassCount, isSelected }: { subject: FullSubject; onSelect: (subject: FullSubject) => void; assignedClassCount: number; isSelected: boolean; }) => {
  return (
    <Card 
      onClick={() => onSelect(subject)}
      className={`mb-2 group transition-all hover:shadow-md cursor-pointer ${isSelected ? 'ring-2 ring-primary shadow-lg' : 'ring-0'}`}
    >
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex-grow flex items-center gap-4">
          <div>
            <p className="font-semibold">{subject.name}</p>
            <p className="text-sm text-muted-foreground">{assignedClassCount} class(es) assigned</p>
          </div>
        </div>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
});

interface SubjectManagerProps {
  initialSubjects: FullSubject[];
  initialClasses: FullClass[];
  onAssignmentChange: () => void; // Callback to refresh data on the parent page
}

const SubjectManager = ({ initialSubjects, initialClasses, onAssignmentChange }: SubjectManagerProps) => {
  const [subjects, setSubjects] = useState<FullSubject[]>(initialSubjects);
  const [classes, setClasses] = useState<FullClass[]>(initialClasses);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isAddSubjectDialogOpen, setIsAddSubjectDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<FullSubject | null>(null);

  useEffect(() => {
    setSubjects(initialSubjects);
    setClasses(initialClasses);
  }, [initialSubjects, initialClasses]);

  const assignedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    classes.forEach(c => {
      c.classSubjects.forEach(cs => {
        counts.set(cs.subjectId, (counts.get(cs.subjectId) || 0) + 1);
      });
    });
    return counts;
  }, [classes]);

  const handleToggleAssignment = async (classId: string, shouldBeAssigned: boolean) => {
    if (!selectedSubject) return;

    const originalClasses = JSON.parse(JSON.stringify(classes)); // Deep copy for rollback
    const subjectId = selectedSubject.id;

    // Optimistic UI Update
    setClasses(prevClasses => prevClasses.map(c => {
      if (c.id === classId) {
        if (shouldBeAssigned) {
          const newClassSubject: ClassSubject & { subject: FullSubject } = {
            id: `temp-${subjectId}-${c.id}-${Date.now()}`,
            classId: c.id,
            subjectId: subjectId,
            teacherId: null,
            subject: selectedSubject,
          };
          return { ...c, classSubjects: [...c.classSubjects, newClassSubject] };
        } else {
          return { ...c, classSubjects: c.classSubjects.filter(cs => cs.subjectId !== subjectId) };
        }
      }
      return c;
    }));

    try {
      if (shouldBeAssigned) {
        const response = await fetch('/api/subjects/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectId, classIds: [classId] }),
        });
        if (!response.ok) throw new Error('Failed to assign subject');
        toast({ title: 'Success', description: `Assigned "${selectedSubject.name}" to class.` });
      } else {
        const classSubject = originalClasses.find((c: FullClass) => c.id === classId)?.classSubjects.find((cs: any) => cs.subjectId === subjectId);
        if (!classSubject || classSubject.id.startsWith('temp-')) {
            toast({ title: 'Success', description: `Unassigned "${selectedSubject.name}" from class.` });
            onAssignmentChange();
            return;
        };
        
        const response = await fetch(`/api/subjects/unassign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classSubjectId: classSubject.id }),
        });
        if (!response.ok) throw new Error('Failed to unassign subject');
        toast({ title: 'Success', description: `Unassigned "${selectedSubject.name}" from class.` });
      }
      onAssignmentChange();
    } catch (error) {
      toast({ title: 'Update Failed', description: 'Could not update assignment, changes were reverted.', variant: 'destructive' });
      setClasses(originalClasses);
    }
  };

  const handleUpdateSubject = async (subjectId: string, newName: string) => {
    const subjectToUpdate = subjects.find(s => s.id === subjectId);
    if (!subjectToUpdate || !newName.trim()) return;

    const originalSubjects = [...subjects];
    const originalClasses = JSON.parse(JSON.stringify(classes));

    const updatedSubject = { ...subjectToUpdate, name: newName.trim() };
    
    // Optimistic UI Update
    setSubjects(prev => prev.map(s => s.id === subjectId ? updatedSubject : s));
    setClasses(prev => prev.map(c => ({
      ...c,
      classSubjects: c.classSubjects.map(cs => 
        cs.subjectId === subjectId 
        ? { ...cs, subject: { ...cs.subject, name: newName.trim() } } 
        : cs
      ),
    })));
    if (selectedSubject?.id === subjectId) {
      setSelectedSubject(updatedSubject);
    }

    try {
      const response = await fetch(`/api/subjects/${subjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!response.ok) throw new Error('Failed to update subject');
      
      toast({ title: 'Success', description: 'Subject updated successfully.' });
      onAssignmentChange(); // Re-fetch data to ensure consistency
    } catch (error: any) {
      toast({ title: 'Update Failed', description: 'Could not update subject.', variant: 'destructive' });
      // Rollback
      setSubjects(originalSubjects);
      setClasses(originalClasses);
      if (selectedSubject?.id === subjectId) {
        setSelectedSubject(originalSubjects.find(s => s.id === subjectId) || null);
      }
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) {
      toast({ title: 'Error', description: 'Subject name cannot be empty.', variant: 'destructive' });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticSubject: FullSubject = {
      id: tempId,
      name: newSubjectName.trim(),
      schoolId: classes[0]?.schoolId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setSubjects(prevSubjects => [...prevSubjects, optimisticSubject].sort((a, b) => a.name.localeCompare(b.name)));
    setNewSubjectName('');
    setIsAddSubjectDialogOpen(false);

    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: optimisticSubject.name }),
      });

      if (!response.ok) throw new Error('Failed to create subject');

      const newSubject = await response.json();
      
      setSubjects(prevSubjects => prevSubjects.map(s => s.id === tempId ? newSubject : s));
      toast({ title: 'Success', description: `Subject "${newSubject.name}" created successfully.` });
      onAssignmentChange();
    } catch (error: any) {
      toast({ title: 'Creation Failed', description: 'Could not create the subject.', variant: 'destructive' });
      setSubjects(prevSubjects => prevSubjects.filter(s => s.id !== tempId));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 h-[80vh]">
      {/* Subjects Panel */}
      <div className="md:col-span-1 h-full">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pr-4">
            <CardTitle>Subjects</CardTitle>
            <Dialog open={isAddSubjectDialogOpen} onOpenChange={setIsAddSubjectDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Add Subject</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Subject</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="subject-name" className="text-right">Name</Label>
                    <Input id="subject-name" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} className="col-span-3" placeholder="e.g., Mathematics" autoFocus />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline" onClick={() => setNewSubjectName('')}>Cancel</Button></DialogClose>
                  <Button onClick={handleCreateSubject}>Create Subject</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-4">
              {subjects.length > 0 ? (
                subjects.map(subject => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    onSelect={setSelectedSubject}
                    assignedClassCount={assignedCounts.get(subject.id) || 0}
                    isSelected={selectedSubject?.id === subject.id}
                  />
                ))
              ) : (
                <p className="text-center text-muted-foreground pt-10">No subjects found. Please create one.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Relationship Panel */}
      <div className="md:col-span-2 h-full">
        <AnimatePresence mode="wait">
          {selectedSubject ? (
            <SubjectRelationshipTree
              key={selectedSubject.id}
              subject={selectedSubject}
              allClasses={classes}
              onToggleAssignment={handleToggleAssignment}
              onUpdateSubject={handleUpdateSubject}
              onClose={() => setSelectedSubject(null)}
            />
          ) : (
            <ClassSubjectOverview classes={classes} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SubjectManager;