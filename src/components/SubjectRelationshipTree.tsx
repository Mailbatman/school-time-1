import React from 'react';
import { motion } from 'framer-motion';
import { Subject, Class, ClassSubject } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from './ui/scroll-area';
import { X } from 'lucide-react';

// Define extended types to include relations
type FullSubject = Subject;
type FullClass = Class &amp; { classSubjects: (ClassSubject &amp; { subject: FullSubject })[] };

interface SubjectRelationshipTreeProps {
  subject: FullSubject;
  allClasses: FullClass[];
  onToggleAssignment: (classId: string, isAssigned: boolean) => void;
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
  }, {} as Record&lt;string, FullClass[]&gt;);
};

export const SubjectRelationshipTree: React.FC&lt;SubjectRelationshipTreeProps&gt; = ({
  subject,
  allClasses,
  onToggleAssignment,
  onClose,
}) => {
  const groupedClasses = React.useMemo(() => groupClassesByGrade(allClasses), [allClasses]);
  const assignedClassIds = React.useMemo(() => {
    const assignedIds = new Set&lt;string&gt;();
    allClasses.forEach(c => {
      if (c.classSubjects.some(cs => cs.subjectId === subject.id)) {
        assignedIds.add(c.id);
      }
    });
    return assignedIds;
  }, [allClasses, subject.id]);

  return (
    &lt;motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    &gt;
      &lt;Card className="h-full flex flex-col"&gt;
        &lt;CardHeader className="flex flex-row items-center justify-between"&gt;
          &lt;CardTitle&gt;"{subject.name}" Assignments&lt;/CardTitle&gt;
          &lt;Button variant="ghost" size="icon" onClick={onClose}&gt;
            &lt;X className="h-4 w-4" /&gt;
          &lt;/Button&gt;
        &lt;/CardHeader&gt;
        &lt;CardContent className="flex-grow flex flex-col gap-4"&gt;
          &lt;p className="text-muted-foreground"&gt;Select classes to assign or unassign this subject.&lt;/p&gt;
          &lt;ScrollArea className="flex-grow pr-6"&gt;
            &lt;div className="space-y-4"&gt;
              {Object.entries(groupedClasses).map(([grade, gradeClasses]) => (
                &lt;div key={grade}&gt;
                  &lt;h4 className="font-semibold text-lg mb-2 sticky top-0 bg-background py-1"&gt;{grade}&lt;/h4&gt;
                  &lt;div className="space-y-2"&gt;
                    {gradeClasses.map(classItem => {
                      const isAssigned = assignedClassIds.has(classItem.id);
                      return (
                        &lt;div
                          key={classItem.id}
                          className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted"
                        &gt;
                          &lt;Checkbox
                            id={`class-assign-${classItem.id}`}
                            checked={isAssigned}
                            onCheckedChange={(checked) => {
                              onToggleAssignment(classItem.id, !!checked);
                            }}
                          /&gt;
                          &lt;Label
                            htmlFor={`class-assign-${classItem.id}`}
                            className="flex-grow cursor-pointer"
                          &gt;
                            {classItem.name}
                          &lt;/Label&gt;
                        &lt;/div&gt;
                      );
                    })}
                  &lt;/div&gt;
                &lt;/div&gt;
              ))}
            &lt;/div&gt;
          &lt;/ScrollArea&gt;
        &lt;/CardContent&gt;
      &lt;/Card&gt;
    &lt;/motion.div&gt;
  );
};