import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SchoolEnrollment } from "@prisma/client";

interface EnrollmentDetailsDialogProps {
  enrollment: SchoolEnrollment;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  isApproving: boolean;
  isDeclining: boolean;
}

export function EnrollmentDetailsDialog({
  enrollment,
  onApprove,
  onDecline,
  isApproving,
  isDeclining,
}: EnrollmentDetailsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enrollment Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="col-span-1 font-semibold">School Name</p>
            <p className="col-span-3">{enrollment.schoolName}</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="col-span-1 font-semibold">Contact Name</p>
            <p className="col-span-3">{enrollment.contactName}</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="col-span-1 font-semibold">Contact Email</p>
            <p className="col-span-3">{enrollment.contactEmail}</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="col-span-1 font-semibold">Contact Phone</p>
            <p className="col-span-3">{enrollment.contactPhone}</p>
          </div>
          {enrollment.website && (
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="col-span-1 font-semibold">Website</p>
              <p className="col-span-3">{enrollment.website}</p>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="col-span-1 font-semibold">Address</p>
            <p className="col-span-3">{enrollment.address}</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="col-span-1 font-semibold">City</p>
            <p className="col-span-3">{enrollment.city}</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="col-span-1 font-semibold">State</p>
            <p className="col-span-3">{enrollment.state}</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="col-span-1 font-semibold">ZIP Code</p>
            <p className="col-span-3">{enrollment.zipCode}</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="col-span-1 font-semibold">Est. Students</p>
            <p className="col-span-3">{enrollment.estimatedStudents}</p>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => onDecline(enrollment.id)}
            disabled={isDeclining || isApproving}
          >
            {isDeclining ? "Declining..." : "Decline"}
          </Button>
          <Button
            onClick={() => onApprove(enrollment.id)}
            disabled={isApproving || isDeclining}
          >
            {isApproving ? "Approving..." : "Approve"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}