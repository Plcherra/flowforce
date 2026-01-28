import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { LearningEnrollment } from "@/types/learning";

interface LearningAdminProps {
  enrollments: LearningEnrollment[];
  loading: boolean;
}

export function LearningAdmin({ enrollments, loading }: LearningAdminProps) {
  if (!loading && enrollments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Admin enrollments</CardTitle>
          <CardDescription>No enrollments found</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          As soon as employees enroll, you will see progress and status here.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Admin enrollments</CardTitle>
        <CardDescription>Company-wide learning progress</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading && enrollments.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enrollment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.slice(0, 20).map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell className="font-medium">
                    {enrollment.courseId}
                  </TableCell>
                  <TableCell className="capitalize">
                    {enrollment.status.replace("_", " ")}
                  </TableCell>
                  <TableCell>
                    {Math.round(enrollment.progressPercent)}%
                  </TableCell>
                  <TableCell>{enrollment.hoursCompleted.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default LearningAdmin;
