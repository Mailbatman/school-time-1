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
import { Pencil, ChevronRight } from 'lucide-react';
import { SubjectRelationshipTree } from './SubjectRelationshipTree';

// Define extended types to include relations
type FullSubject = Subject;
type FullClass = Class &amp; { classSubjects: (ClassSubject &amp; { subject: FullSubject })[] };

// Subject Card Item
const SubjectCard = React.memo(({ subject, onSelect, onEdit, assignedClassCount }: { subject: FullSubject; onSelect: (subject: FullSubject) => void; onEdit: (subject: FullSubject) => void; assignedClassCount: number; }) => {
  return (
    &lt;Card className="mb-2 group transition-shadow hover:shadow-md"&gt;
      &lt;CardContent className="p-3 flex items-center justify-between"&gt;
        &lt;div onClick={() => onSelect(subject)} className="flex-grow cursor-pointer flex items-center gap-4"&gt;
          &lt;div&gt;
            &lt;p className="font-semibold"&gt;{subject.name}&lt;/p&gt;
            &lt;p className="text-sm text-muted-foreground"&gt;{assignedClassCount} class(es) assigned&lt;/p&gt;
          &lt;/div&gt;
        &lt;/div&gt;
        &lt;div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity"&gt;
          &lt;Button variant="ghost" size="icon" onClick={() => onEdit(subject)} aria-label="Edit subject"&gt;
            &lt;Pencil className="h-4 w-4" /&gt;
          &lt;/Button&gt;
          &lt;Button variant="ghost" size="icon" onClick={() => onSelect(subject)} aria-label="Manage assignments"&gt;
            &lt;ChevronRight className="h-4 w-4" /&gt;
          &lt;/Button&gt;
        &lt;/div&gt;
      &lt;/CardContent&gt;
    &lt;/Card&gt;
  );
});

interface SubjectManagerProps {
  initialSubjects: FullSubject[];
  initialClasses: FullClass[];
  onAssignmentChange: () => void; // Callback to refresh data on the parent page
}

const SubjectManager = ({ initialSubjects, initialClasses, onAssignmentChange }: SubjectManagerProps) => {
  const [subjects, setSubjects] = useState&lt;FullSubject[]&gt;(initialSubjects);
  const [classes, setClasses] = useState&lt;FullClass[]&gt;(initialClasses);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isAddSubjectDialogOpen, setIsAddSubjectDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState&lt;FullSubject | null&gt;(null);
  const [editingSubjectName, setEditingSubjectName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState&lt;FullSubject | null&gt;(null);

  useEffect(() => {
    setSubjects(initialSubjects);
    setClasses(initialClasses);
  }, [initialSubjects, initialClasses]);

  const assignedCounts = useMemo(() => {
    const counts = new Map&lt;string, number&gt;();
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
          const newClassSubject: ClassSubject &amp; { subject: FullSubject } = {
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
            // If it's a temp one, we just remove it from state, no API call needed
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
      onAssignmentChange(); // Refresh from server to get real IDs
    } catch (error) {
      toast({ title: 'Update Failed', description: 'Could not update assignment, changes were reverted.', variant: 'destructive' });
      setClasses(originalClasses); // Rollback
    }
  };

  const handleEditSubject = (subject: FullSubject) => {
    setEditingSubject(subject);
    setEditingSubjectName(subject.name);
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !editingSubjectName.trim()) return;

    const originalSubjectName = editingSubject.name;
    const originalSubjects = [...subjects];
    const originalClasses = [...classes];

    // Optimistic UI Update
    const updatedSubject = { ...editingSubject, name: editingSubjectName.trim() };
    setSubjects(subjects.map(s => s.id === editingSubject.id ? updatedSubject : s));
    setClasses(classes.map(c => ({
      ...c,
      classSubjects: c.classSubjects.map(cs => 
        cs.subjectId === editingSubject.id 
        ? { ...cs, subject: { ...cs.subject, name: editingSubjectName.trim() } } 
        : cs
      ),
    })));
    setEditingSubject(null);
    setEditingSubjectName('');

    try {
      const response = await fetch(`/api/subjects/${editingSubject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSubjectName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update subject');
      }
      
      toast({ title: 'Success', description: 'Subject updated successfully.' });
      onAssignmentChange();
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: `Could not update subject. The change has been reverted.`,
        variant: 'destructive',
      });
      // Rollback on failure
      setSubjects(originalSubjects);
      setClasses(originalClasses);
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subject');
      }

      const newSubject = await response.json();
      
      setSubjects(prevSubjects => 
        prevSubjects.map(s => s.id === tempId ? newSubject : s)
      );

      toast({ title: 'Success', description: `Subject "${newSubject.name}" created successfully.` });
      onAssignmentChange();
    } catch (error: any) {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Could not create the subject.',
        variant: 'destructive',
      });
      setSubjects(prevSubjects => prevSubjects.filter(s => s.id !== tempId));
    }
  };

  return (
    &lt;div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 h-[80vh]"&gt;
      {/* Subjects Panel */}
      &lt;div className="md:col-span-1 h-full"&gt;
        &lt;Card className="h-full flex flex-col"&gt;
          &lt;CardHeader className="flex flex-row items-center justify-between pr-4"&gt;
            &lt;CardTitle&gt;Subjects&lt;/CardTitle&gt;
            &lt;Dialog open={isAddSubjectDialogOpen} onOpenChange={setIsAddSubjectDialogOpen}&gt;
              &lt;DialogTrigger asChild&gt;
                &lt;Button size="sm"&gt;Add Subject&lt;/Button&gt;
              &lt;/DialogTrigger&gt;
              &lt;DialogContent&gt;
                &lt;DialogHeader&gt;
                  &lt;DialogTitle&gt;Add New Subject&lt;/DialogTitle&gt;
                &lt;/DialogHeader&gt;
                &lt;div className="grid gap-4 py-4"&gt;
                  &lt;div className="grid grid-cols-4 items-center gap-4"&gt;
                    &lt;Label htmlFor="subject-name" className="text-right"&gt;
                      Name
                    &lt;/Label&gt;
                    &lt;Input
                      id="subject-name"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., Mathematics"
                      autoFocus
                    /&gt;
                  &lt;/div&gt;
                &lt;/div&gt;
                &lt;DialogFooter&gt;
                  &lt;DialogClose asChild&gt;
                    &lt;Button variant="outline" onClick={() => setNewSubjectName('')}&gt;Cancel&lt;/Button&gt;
                  &lt;/DialogClose&gt;
                  &lt;Button onClick={handleCreateSubject}&gt;Create Subject&lt;/Button&gt;
                &lt;/DialogFooter&gt;
              &lt;/DialogContent&gt;
            &lt;/Dialog&gt;
          &lt;/CardHeader&gt;
          &lt;CardContent className="flex-grow overflow-hidden"&gt;
            &lt;ScrollArea className="h-full pr-4"&gt;
              {subjects.length > 0 ? (
                subjects.map(subject => (
                  &lt;SubjectCard
                    key={subject.id}
                    subject={subject}
                    onSelect={setSelectedSubject}
                    onEdit={handleEditSubject}
                    assignedClassCount={assignedCounts.get(subject.id) || 0}
                  /&gt;
                ))
              ) : (
                &lt;p className="text-center text-muted-foreground pt-10"&gt;No subjects found. Please create one.&lt;/p&gt;
              )}
            &lt;/ScrollArea&gt;
          &lt;/CardContent&gt;
        &lt;/Card&gt;
      &lt;/div&gt;

      {/* Relationship Tree Panel */}
      &lt;div className="md:col-span-2 h-full"&gt;
        &lt;AnimatePresence mode="wait"&gt;
          {selectedSubject ? (
            &lt;SubjectRelationshipTree
              key={selectedSubject.id}
              subject={selectedSubject}
              allClasses={classes}
              onToggleAssignment={handleToggleAssignment}
              onClose={() => setSelectedSubject(null)}
            /&gt;
          ) : (
             &lt;motion.div
                key="placeholder"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex items-center justify-center bg-muted/40 rounded-lg"
             &gt;
                &lt;p className="text-muted-foreground text-lg"&gt;Select a subject to manage its class assignments.&lt;/p&gt;
             &lt;/motion.div&gt;
          )}
        &lt;/AnimatePresence&gt;
      &lt;/div&gt;

      {/* Edit Subject Dialog */}
      &lt;Dialog open={!!editingSubject} onOpenChange={(isOpen) => !isOpen && setEditingSubject(null)}&gt;
        &lt;DialogContent&gt;
          &lt;DialogHeader&gt;
            &lt;DialogTitle&gt;Edit Subject&lt;/DialogTitle&gt;
          &lt;/DialogHeader&gt;
          &lt;div className="grid gap-4 py-4"&gt;
            &lt;div className="grid grid-cols-4 items-center gap-4"&gt;
              &lt;Label htmlFor="edit-subject-name" className="text-right"&gt;
                Name
              &lt;/Label&gt;
              &lt;Input
                id="edit-subject-name"
                value={editingSubjectName}
                onChange={(e) => setEditingSubjectName(e.target.value)}
                className="col-span-3"
                autoFocus
              /&gt;
            &lt;/div&gt;
          &lt;/div&gt;
          &lt;DialogFooter&gt;
            &lt;DialogClose asChild&gt;
              &lt;Button variant="outline" onClick={() => setEditingSubject(null)}&gt;Cancel&lt;/Button&gt;
            &lt;/DialogClose&gt;
            &lt;Button onClick={handleUpdateSubject}&gt;Save Changes&lt;/Button&gt;
          &lt;/DialogFooter&gt;
        &lt;/DialogContent&gt;
      &lt;/Dialog&gt;
    &lt;/div&gt;
  );
};

export default SubjectManager;