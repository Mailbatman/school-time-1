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

interface ScheduleDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  event: {
    title: string;
    start: Date;
    end: Date;
    extendedProps: {
      className: string;
      teacher: string;
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

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{event.title}</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-2 mt-4 text-sm">
              <p><strong>Class:</strong> {event.extendedProps.className}</p>
              <p><strong>Teacher:</strong> {event.extendedProps.teacher}</p>
              <p>
                <strong>Time:</strong>{" "}
                {event.start.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                -{" "}
                {event.end.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
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