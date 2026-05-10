import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LearningDeliveryMode } from "@/types/learning";

interface StepGeneralInfoProps {
  title: string;
  description: string;
  category: string;
  deliveryMode: LearningDeliveryMode;
  categories: string[];
  onChange: (
    updates: Partial<{
      title: string;
      description: string;
      category: string;
      deliveryMode: LearningDeliveryMode;
    }>,
  ) => void;
}

export function StepGeneralInfo({
  title,
  description,
  category,
  deliveryMode,
  categories,
  onChange,
}: StepGeneralInfoProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Course blueprint</CardTitle>
        <CardDescription>
          Define how the course shows up in the catalog.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="course-title">Title</Label>
          <Input
            id="course-title"
            value={title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Operations onboarding"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="course-description">Description</Label>
          <Textarea
            id="course-description"
            value={description}
            onChange={(event) => onChange({ description: event.target.value })}
            rows={4}
            placeholder="Outline the outcomes, prerequisites, or guidance for the learner."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(value) => onChange({ category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Delivery mode</Label>
            <Select
              value={deliveryMode}
              onValueChange={(value) =>
                onChange({ deliveryMode: value as LearningDeliveryMode })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select delivery mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self_paced">Self-paced</SelectItem>
                <SelectItem value="live">Live cohort</SelectItem>
                <SelectItem value="blended">Blended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StepGeneralInfo;
