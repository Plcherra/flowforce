import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Coffee,
  ShoppingCart,
  Eye,
  UserCheck,
  Download,
  Share,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Role {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  responsibilities: string[];
  minShiftHours: number;
  maxShiftHours: number;
}

const roleTemplates: Role[] = [
  {
    id: "barista",
    name: "Barista",
    icon: <Coffee className="h-4 w-4" />,
    color: "bg-amber-500 text-white",
    description: "Coffee preparation and customer service",
    responsibilities: [
      "Prepare beverages",
      "Maintain equipment",
      "Customer interaction",
    ],
    minShiftHours: 4,
    maxShiftHours: 8,
  },
  {
    id: "runner",
    name: "Runner",
    icon: <UserCheck className="h-4 w-4" />,
    color: "bg-blue-500 text-white",
    description: "Food delivery and table service",
    responsibilities: ["Deliver orders", "Clear tables", "Assist customers"],
    minShiftHours: 3,
    maxShiftHours: 6,
  },
  {
    id: "cashier",
    name: "Cashier",
    icon: <ShoppingCart className="h-4 w-4" />,
    color: "bg-green-500 text-white",
    description: "Point of sale and customer checkout",
    responsibilities: ["Process payments", "Handle orders", "Manage register"],
    minShiftHours: 4,
    maxShiftHours: 8,
  },
  {
    id: "foh-supervisor",
    name: "FOH Supervisor",
    icon: <Eye className="h-4 w-4" />,
    color: "bg-purple-500 text-white",
    description: "Front of house management and oversight",
    responsibilities: [
      "Supervise staff",
      "Handle escalations",
      "Ensure quality",
    ],
    minShiftHours: 6,
    maxShiftHours: 10,
  },
];

export function RoleTemplates() {
  const { toast } = useToast();

  const handleExportTemplate = () => {
    const templateData = roleTemplates.map((role) => ({
      role: role.name,
      minHours: role.minShiftHours,
      maxHours: role.maxShiftHours,
      responsibilities: role.responsibilities.join(", "),
    }));

    const csv = [
      "Role,Min Hours,Max Hours,Responsibilities",
      ...templateData.map(
        (row) =>
          `${row.role},${row.minHours},${row.maxHours},"${row.responsibilities}"`,
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "role-templates.csv";
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Template exported",
      description: "Role templates have been exported as CSV",
    });
  };

  const handleShareTemplate = () => {
    if (navigator.share) {
      navigator.share({
        title: "Scheduling Role Templates",
        text: "Color-coded role templates for weekly scheduling",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Template link has been copied to clipboard",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Color-Coded Role Templates
          </CardTitle>
          <CardDescription>
            Standardized roles for consistent scheduling
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareTemplate}
            className="flex items-center gap-2"
          >
            <Share className="h-4 w-4" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roleTemplates.map((role) => (
            <div
              key={role.id}
              className="p-4 rounded-lg border bg-background hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-full ${role.color}`}>
                  {role.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{role.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {role.description}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Shift Hours:</span>
                  <Badge variant="secondary">
                    {role.minShiftHours}-{role.maxShiftHours}h
                  </Badge>
                </div>

                <div>
                  <h4 className="text-xs font-medium mb-2 text-muted-foreground">
                    Key Responsibilities:
                  </h4>
                  <div className="space-y-1">
                    {role.responsibilities.map((responsibility, index) => (
                      <div
                        key={index}
                        className="text-xs text-foreground flex items-center gap-2"
                      >
                        <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                        {responsibility}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Template Usage</h4>
              <p className="text-xs text-muted-foreground mb-3">
                These color-coded templates help maintain consistency across
                schedules. Each role has defined shift lengths and
                responsibilities for better planning.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  Customize Templates
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  Add New Role
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
