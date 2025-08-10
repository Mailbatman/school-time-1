import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RRule } from 'rrule';
import { format } from 'date-fns';

interface ScheduleDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  event: {
    title: string;
    start: Date;
    end: Date | null;
    allDay: boolean;
    extendedProps: {
      className: string;
      teacher: string;
      rrule?: string;
    };
  } | null;
}

export const ScheduleDetailsDialog = ({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  event,
}: ScheduleDetailsDialogProps) => {
  if (!event) return null;

  const getRecurrenceText = () => {
    if (!event.extendedProps.rrule) {
      return 'Does not repeat';
    }
    try {
      const rule = RRule.fromString('RRULE:' + event.extendedProps.rrule);
      return rule.toText();
    } catch (e) {
      console.error("Error parsing rrule", e);
      return "Invalid recurrence rule";
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{event.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 mt-4 text-sm text-foreground">
              <p><strong>Class:</strong> {event.extendedProps.className}</p>
              <p><strong>Teacher:</strong> {event.extendedProps.teacher}</p>
              <p><strong>Date:</strong> {format(event.start, 'MMMM d, yyyy')}</p>
              {!event.allDay && (
                <p>
                  <strong>Time:</strong>{" "}
                  {event.start.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {event.end && (
                    <>
                      {" - "}
                      {event.end.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  )}
                </p>
              )}
              {event.allDay && <p><strong>Time:</strong> All day</p>}
              <p><strong>Repeats:</strong> {getRecurrenceText()}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
          <AlertDialogAction asChild>
            <Button onClick={onEdit}>Edit</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};