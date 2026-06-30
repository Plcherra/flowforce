import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import {
  useCustomSections,
  type CustomSection,
} from "@/hooks/useCustomSections";
import { logger } from "@/utils/logger";

interface EditSectionDialogProps {
  section: CustomSection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSectionDialog({
  section,
  open,
  onOpenChange,
}: EditSectionDialogProps) {
  const { updateSection, deleteSection } = useCustomSections();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [icon, setIcon] = useState("");
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (section) {
      setName(section.name);
      setDescription(section.description || "");
      setCategory(section.category);
      setIcon(section.icon);
      setPath(section.path);
    }
  }, [section]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!section || !name.trim()) return;

    setLoading(true);
    try {
      await updateSection(section.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category as any,
        icon,
        path: path.trim(),
      });
      onOpenChange(false);
    } catch (error) {
      logger.error("Error updating section:", { error, tags: ["error"] });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!section) return;

    setDeleteLoading(true);
    try {
      await deleteSection(section.id);
      onOpenChange(false);
    } catch (error) {
      logger.error("Error deleting section:", { error, tags: ["error"] });
    } finally {
      setDeleteLoading(false);
    }
  };

  const iconOptions = [
    { value: "FileText", label: "Document" },
    { value: "Users", label: "Users" },
    { value: "MessageSquare", label: "Messages" },
    { value: "Calendar", label: "Calendar" },
    { value: "BarChart3", label: "Chart" },
    { value: "Settings", label: "Settings" },
    { value: "CheckSquare", label: "Tasks" },
    { value: "Target", label: "Goal" },
    { value: "Package", label: "Package" },
    { value: "Award", label: "Award" },
  ];

  if (!section) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Section</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Section Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter section name..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this section does..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="core">Core</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="industry">Industry</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="path">Path *</Label>
            <Input
              id="path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/section-path"
              required
            />
          </div>

          <div className="flex justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={loading || deleteLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Section
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the &quot;{section.name}&quot; section
                    and all its data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteLoading}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteLoading ? "Deleting..." : "Delete Section"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || deleteLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || deleteLoading || !name.trim()}
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
