import React, { useState, useEffect, useMemo } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { Class, Subject, ClassSubject } from '@prisma/client';

// Define extended types to include relations
type FullSubject = Subject;
type FullClass = Class & { classSubjects: (ClassSubject & { subject: FullSubject })[] };

// Group classes by grade level
const groupClassesByGrade = (classes: FullClass[]) => {
  return classes.reduce((acc, currentClass) => {
    const grade = currentClass.gradeLevel || 'Ungraded';
    if (!acc[grade]) {
      acc[grade] = [];
    }
    acc[grade].push(currentClass);
    return acc;
  }, {} as Record<string, FullClass[]>);
};

// Draggable Subject Item
const DraggableSubject = ({ subject }: { subject: FullSubject }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `subject-${subject.id}`,
    data: { type: 'subject', subject },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 100,
    cursor: 'grabbing',
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card className="mb-2 cursor-grab active:cursor-grabbing">
        <CardContent className="p-3">
          <p className="font-semibold">{subject.name}</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Droppable Class Item
const DroppableClass = ({ classItem }: { classItem: FullClass }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `class-${classItem.id}`,
    data: { type: 'class', classItem },
  });

  return (
    <div ref={setNodeRef} className={`p-2 rounded-lg transition-colors ${isOver ? 'bg-primary/20' : ''}`}>
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-base">{classItem.name}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 min-h-[50px]">
          <div className="flex flex-wrap gap-1">
            {classItem.classSubjects.map(cs => (
              <Badge key={cs.subject.id} variant="secondary">{cs.subject.name}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Droppable Grade Group
const DroppableGrade = ({ grade, classes }: { grade: string; classes: FullClass[] }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `grade-${grade}`,
        data: { type: 'grade', classes },
    });

    return (
        <div ref={setNodeRef} className={`p-4 rounded-lg transition-colors ${isOver ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-muted/40'}`}>
            <h3 className="text-lg font-bold mb-2 text-primary">{grade}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map(classItem => (
                    <DroppableClass key={classItem.id} classItem={classItem} />
                ))}
            </div>
        </div>
    );
};


interface SubjectManagerProps {
  initialSubjects: FullSubject[];
  initialClasses: FullClass[];
  onAssignmentChange: () => void; // Callback to refresh data on the parent page
}

const SubjectManager = ({ initialSubjects, initialClasses, onAssignmentChange }: SubjectManagerProps) => {
  const [subjects, setSubjects] = useState<FullSubject[]>(initialSubjects);
  const [classes, setClasses] = useState<FullClass[]>(initialClasses);

  useEffect(() => {
    setSubjects(initialSubjects);
    setClasses(initialClasses);
  }, [initialSubjects, initialClasses]);

  const groupedClasses = useMemo(() => groupClassesByGrade(classes), [classes]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { over, active } = event;
    if (!over || !active) return;

    const subject = active.data.current?.subject as FullSubject;
    const isGradeDrop = over.data.current?.type === 'grade';
    const isClassDrop = over.data.current?.type === 'class';

    if (!subject || (!isClassDrop && !isGradeDrop)) return;

    let targetClassIds: string[] = [];

    if (isClassDrop) {
        const classItem = over.data.current?.classItem as FullClass;
        if (classItem.classSubjects.some(cs => cs.subjectId === subject.id)) {
            toast({ title: 'Already Assigned', description: `"${subject.name}" is already assigned to "${classItem.name}".` });
            return;
        }
        targetClassIds.push(classItem.id);
    } else if (isGradeDrop) {
        const gradeClasses = over.data.current?.classes as FullClass[];
        targetClassIds = gradeClasses.map(c => c.id).filter(classId => {
            const classItem = classes.find(c => c.id === classId);
            return !classItem?.classSubjects.some(cs => cs.subjectId === subject.id);
        });

        if (targetClassIds.length === 0) {
            toast({ title: 'Already Assigned', description: `"${subject.name}" is already assigned to all classes in this grade.` });
            return;
        }
    }

    if (targetClassIds.length === 0) return;

    try {
      const response = await fetch('/api/subjects/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: subject.id, classIds: targetClassIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign subject');
      }

      // Optimistic UI update
      const updatedClasses = classes.map(c => {
        if (targetClassIds.includes(c.id)) {
          // Create a mock ClassSubject to add to the class
          const newClassSubject: ClassSubject & { subject: FullSubject } = {
            id: `temp-${Date.now()}`, // Temporary unique ID
            classId: c.id,
            subjectId: subject.id,
            teacherId: null,
            subject: subject,
          };
          return {
            ...c,
            classSubjects: [...c.classSubjects, newClassSubject],
          };
        }
        return c;
      });
      setClasses(updatedClasses);

      toast({ title: 'Success', description: `Assigned "${subject.name}" successfully.` });
      
      // Still call the parent refresh to ensure data consistency in the background
      onAssignmentChange(); 
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      // Revert optimistic update on failure
      setClasses(initialClasses);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 p-4">
        {/* Subjects Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                {subjects.length > 0 ? (
                  subjects.map(subject => <DraggableSubject key={subject.id} subject={subject} />)
                ) : (
                  <p>No subjects found. Please create subjects first.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Classes Panel */}
        <div className="lg:col-span-3">
            <ScrollArea className="h-[75vh] p-4">
                <div className="space-y-6">
                    {Object.keys(groupedClasses).sort().map(grade => (
                        <DroppableGrade key={grade} grade={grade} classes={groupedClasses[grade]} />
                    ))}
                </div>
            </ScrollArea>
        </div>
      </div>
    </DndContext>
  );
};

export default SubjectManager;