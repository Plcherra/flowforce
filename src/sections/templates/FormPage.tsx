import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = { title?: string; description?: string };

export function FormPage({ title = "Form", description }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <Input placeholder="Enter name" />
          </div>
          <div>
            <Label>Status</Label>
            <Input placeholder="Active" />
          </div>
        </div>
        <Button>Submit</Button>
      </CardContent>
    </Card>
  );
}
