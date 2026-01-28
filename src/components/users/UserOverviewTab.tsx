import {
  Mail,
  Phone,
  Building2,
  Calendar,
  MapPin,
  User,
  IdCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EngagementPanel } from "@/components/people/EngagementPanel";
import type { Tables } from "@/integrations/supabase/public-types";

type Profile = Tables<"profiles">;

interface UserOverviewTabProps {
  user: Profile;
}

export function UserOverviewTab({ user }: UserOverviewTabProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return "Never";
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "1 day ago";
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  return (
    <div className="space-y-6">
      <EngagementPanel
        employeeId={user.id}
        role={user.role}
        displayName={`${user.first_name} ${user.last_name}`.trim()}
      />

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">
                  {user.phone || "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <IdCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Employee ID</p>
                <p className="text-sm text-muted-foreground">
                  {user.employee_id || "Not assigned"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Birth Date</p>
                <p className="text-sm text-muted-foreground">
                  {user.birth_date
                    ? formatDate(user.birth_date)
                    : "Not provided"}
                </p>
              </div>
            </div>
          </div>

          {user.address && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {typeof user.address === "string"
                      ? user.address
                      : "Not provided"}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Employment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Employment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Role</p>
              <Badge variant="outline" className="mt-1 capitalize">
                {user.role}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium">Employment Status</p>
              <Badge
                variant={
                  user.employment_status === "active" ? "default" : "secondary"
                }
                className="mt-1 capitalize"
              >
                {user.employment_status}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium">Hire Date</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(user.hire_date)}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">Department</p>
              <p className="text-sm text-muted-foreground">
                {user.department_id || "Not assigned"}
              </p>
            </div>
          </div>

          {user.emergency_contact && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Emergency Contact</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {typeof user.emergency_contact === "string"
                    ? user.emergency_contact
                    : "Not provided"}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Account Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Created</span>
            <span className="text-sm text-muted-foreground">
              {formatDate(user.created_at)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Last Updated</span>
            <span className="text-sm text-muted-foreground">
              {getTimeAgo(user.updated_at)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Last Login</span>
            <span className="text-sm text-muted-foreground">Not tracked</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
