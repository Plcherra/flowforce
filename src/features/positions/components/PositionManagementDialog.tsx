import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Users } from "lucide-react";
import { usePositions, Position } from "@/hooks/usePositions";
import { HexColorPicker } from "react-colorful";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PositionManagementDialogProps {
  children?: React.ReactNode;
}

interface PositionFormData {
  name: string;
  description: string;
  role: "staff" | "supervisor" | "manager" | "admin";
  color: string;
  is_active: boolean;
}

export function PositionManagementDialog({
  children,
}: PositionManagementDialogProps) {
  const {
    positions,
    loading,
    createPosition,
    updatePosition,
    deletePosition,
    getPositionUsers,
  } = usePositions();
  const [open, setOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState<PositionFormData>({
    name: "",
    description: "",
    role: "staff",
    color: "#3b82f6",
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPosition) {
      await updatePosition(editingPosition.id, formData);
    } else {
      await createPosition(formData);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      role: "staff",
      color: "#3b82f6",
      is_active: true,
    });
    setEditingPosition(null);
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      description: position.description || "",
      role: position.role,
      color: position.color,
      is_active: position.is_active,
    });
  };

  const handleDelete = async (position: Position) => {
    if (
      confirm(
        `Are you sure you want to delete the "${position.name}" position?`,
      )
    ) {
      await deletePosition(position.id);
    }
  };

  const colorPresets = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#6366f1",
    "#14b8a6",
    "#eab308",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Manage Positions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Position Management
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Position Form */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">
              {editingPosition ? "Edit Position" : "Create New Position"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm">
                  Position Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Barista, Cook, Manager"
                  required
                  className="text-sm"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Brief description of the position"
                  rows={3}
                  className="text-sm"
                />
              </div>

              <div>
                <Label htmlFor="role" className="text-sm">
                  Role Level
                </Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      role: e.target.value as
                        | "staff"
                        | "supervisor"
                        | "manager"
                        | "admin",
                    }))
                  }
                  className="w-full p-2 border border-input rounded-md bg-background text-sm"
                >
                  <option value="staff">Staff</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <Label className="text-sm">Position Color</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-12 h-8 sm:w-16 p-0"
                        style={{ backgroundColor: formData.color }}
                      ></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3">
                      <div className="space-y-3">
                        <HexColorPicker
                          color={formData.color}
                          onChange={(color) =>
                            setFormData((prev) => ({ ...prev, color }))
                          }
                        />
                        <div className="grid grid-cols-6 gap-1">
                          {colorPresets.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded border-2 border-border hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                              onClick={() =>
                                setFormData((prev) => ({ ...prev, color }))
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {formData.color}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="flex-1 text-sm">
                  {editingPosition ? "Update Position" : "Create Position"}
                </Button>
                {editingPosition && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="text-sm"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Positions List */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">
              Existing Positions
            </h3>

            {loading ? (
              <div className="text-sm text-muted-foreground">
                Loading positions...
              </div>
            ) : positions.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No positions created yet
              </div>
            ) : (
              <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
                {positions.map((position) => (
                  <div
                    key={position.id}
                    className="p-3 border rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border flex-shrink-0"
                        style={{ backgroundColor: position.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm sm:text-base truncate">
                          {position.name}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {position.role}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {getPositionUsers(position.id).length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(position)}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(position)}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
