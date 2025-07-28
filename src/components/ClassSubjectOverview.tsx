import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Class, Subject, ClassSubject } from '@prisma/client';

type FullSubject = Subject;
type FullClass = Class & { classSubjects: (ClassSubject & { subject: FullSubject })[] };

interface ClassSubjectOverviewProps {
  classes: FullClass[];
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

export const ClassSubjectOverview: React.FC<ClassSubjectOverviewProps> = ({ classes }) => {
  const groupedClasses = React.useMemo(() => groupClassesByGrade(classes), [classes]);

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Class & Subject Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          <ScrollArea className="h-full pr-6">
            <div className="space-y-6">
              {Object.entries(groupedClasses).map(([grade, gradeClasses]) => (
                <div key={grade}>
                  <h3 className="text-xl font-bold text-primary mb-3 sticky top-0 bg-background py-2">{grade}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gradeClasses.map(classItem => (
                      <Card key={classItem.id}>
                        <CardHeader className="p-4">
                          <CardTitle className="text-base">{classItem.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 min-h-[60px]">
                          <div className="flex flex-wrap gap-2">
                            {classItem.classSubjects.length > 0 ? (
                              classItem.classSubjects.map(cs => (
                                <Badge key={cs.id} variant="secondary">
                                  {cs.subject.name}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No subjects assigned.</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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