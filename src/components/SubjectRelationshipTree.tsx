import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Subject, Class, ClassSubject } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from './ui/scroll-area';
import { X, Pencil, Check, X as XIcon } from 'lucide-react';
import { Input } from './ui/input';

// Define extended types to include relations
type FullSubject = Subject;
type FullClass = Class & { classSubjects: (ClassSubject & { subject: FullSubject })[] };

interface SubjectRelationshipTreeProps {
  subject: FullSubject;
  allClasses: FullClass[];
  onToggleAssignment: (classId: string, isAssigned: boolean) => void;
  onUpdateSubject: (subjectId: string, newName: string) => Promise<void>;
  onBulkAssign: (classIds: string[]) => Promise<void>;
  onClose: () => void;
}

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

export const SubjectRelationshipTree: React.FC<SubjectRelationshipTreeProps> = ({
  subject,
  allClasses,
  onToggleAssignment,
  onUpdateSubject,
  onBulkAssign,
  onClose,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(subject.name);

  const handleUpdate = () => {
    if (editingName.trim() && editingName.trim() !== subject.name) {
      onUpdateSubject(subject.id, editingName.trim());
    }
    setIsEditing(false);
  };

  const groupedClasses = React.useMemo(() => groupClassesByGrade(allClasses), [allClasses]);
  
  const { assignedClassIds, unassignedClassIds } = React.useMemo(() => {
    const assignedIds = new Set<string>();
    allClasses.forEach(c => {
      if (c.classSubjects.some(cs => cs.subjectId === subject.id)) {
        assignedIds.add(c.id);
      }
    });
    const unassignedIds = allClasses.filter(c => !assignedIds.has(c.id)).map(c => c.id);
    return { assignedClassIds: assignedIds, unassignedClassIds: unassignedIds };
  }, [allClasses, subject.id]);

  const handleBulkAssign = () => {
    if (unassignedClassIds.length > 0) {
      onBulkAssign(unassignedClassIds);
    }
  };

  const isSubjectSaving = subject.id.startsWith('temp-');

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 flex-grow">
            {isEditing ? (
              <div className="flex items-center gap-2 w-full">
                <Input 
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                  className="text-lg font-semibold"
                  autoFocus
                />
                <Button variant="ghost" size="icon" onClick={handleUpdate}><Check className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setIsEditing(false); setEditingName(subject.name); }}><XIcon className="h-4 w-4" /></Button>
              </div>
            ) : (
              <>
                <CardTitle>"{subject.name}" Assignments</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Select classes to assign or unassign this subject.</p>
            <Button size="sm" onClick={handleBulkAssign} disabled={unassignedClassIds.length === 0 || isSubjectSaving}>
              Assign to All
            </Button>
          </div>
           {isSubjectSaving && (
            <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-md">
              Please wait for the subject to finish saving before assigning it to classes.
            </div>
          )}
          <ScrollArea className="flex-grow pr-6">
            <div className="space-y-4">
              {Object.entries(groupedClasses).map(([grade, gradeClasses]) => (
                <div key={grade}>
                  <h4 className="font-semibold text-lg mb-2 sticky top-0 bg-background py-1">{grade}</h4>
                  <div className="space-y-2">
                    {gradeClasses.map(classItem => {
                      const isAssigned = assignedClassIds.has(classItem.id);
                      return (
                        <div
                          key={classItem.id}
                          className={`flex items-center space-x-3 p-2 rounded-md ${isSubjectSaving ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted'}`}
                        >
                          <Checkbox
                            id={`class-assign-${classItem.id}`}
                            checked={isAssigned}
                            onCheckedChange={(checked) => {
                              if (!isSubjectSaving) {
                                onToggleAssignment(classItem.id, !!checked);
                              }
                            }}
                            disabled={isSubjectSaving}
                          />
                          <Label
                            htmlFor={`class-assign-${classItem.id}`}
                            className={`flex-grow ${isSubjectSaving ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {classItem.name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};