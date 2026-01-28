import { useMemo, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { CourseModuleInput } from "@/types/learning";

const MODULE_TYPES = [
  "Text Instruction",
  "Image Upload",
  "Video Upload",
  "Task Checklist",
  "Yes/No Question",
  "Short Answer",
  "Signature Field",
  "Rating",
  "File Upload",
] as const;

type ModuleAsset = {
  id: string;
  name: string;
  size: number;
  type: string;
};

interface CourseModulesFormProps {
  onAdd: (module: CourseModuleInput) => void;
}

const DEFAULT_STATE = {
  title: "",
  type: MODULE_TYPES[0],
  description: "",
  duration: 30,
  xp: 100,
  assets: [] as ModuleAsset[],
};

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function CourseModulesForm({ onAdd }: CourseModulesFormProps) {
  const [newModule, setNewModule] = useState(DEFAULT_STATE);

  const acceptsUpload = useMemo(
    () => newModule.type.toLowerCase().includes("upload"),
    [newModule.type],
  );

  const handleAssetUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const uploaded: ModuleAsset[] = Array.from(files).map((file) => ({
      id: generateId(),
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setNewModule((prev) => ({
      ...prev,
      assets: [...prev.assets, ...uploaded],
    }));
  };

  const removeAsset = (id: string) => {
    setNewModule((prev) => ({
      ...prev,
      assets: prev.assets.filter((asset) => asset.id !== id),
    }));
  };

  const handleAdd = () => {
    if (!newModule.title.trim()) {
      return;
    }

    const payload: CourseModuleInput = {
      title: newModule.title.trim(),
      description: newModule.description.trim() || undefined,
      estimatedMinutes: Math.max(
        5,
        Number.isFinite(newModule.duration) ? newModule.duration : 0,
      ),
      xpAward: Math.max(25, Number.isFinite(newModule.xp) ? newModule.xp : 0),
      content: JSON.stringify({
        type: newModule.type,
        assets: newModule.assets.map(({ id, ...rest }) => rest),
      }),
    };

    onAdd(payload);
    setNewModule(DEFAULT_STATE);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="module-title">Module title</Label>
        <Input
          id="module-title"
          value={newModule.title}
          onChange={(event) =>
            setNewModule((prev) => ({ ...prev, title: event.target.value }))
          }
          placeholder="Example: Espresso calibration checklist"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="module-type">Module type</Label>
          <Select
            value={newModule.type}
            onValueChange={(value) =>
              setNewModule((prev) => ({ ...prev, type: value }))
            }
          >
            <SelectTrigger id="module-type">
              <SelectValue placeholder="Choose a module type" />
            </SelectTrigger>
            <SelectContent>
              {MODULE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-duration">Duration (minutes)</Label>
          <Input
            id="module-duration"
            type="number"
            min={5}
            value={newModule.duration}
            onChange={(event) =>
              setNewModule((prev) => ({
                ...prev,
                duration: Number(event.target.value),
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-xp">XP reward</Label>
          <Input
            id="module-xp"
            type="number"
            min={25}
            value={newModule.xp}
            onChange={(event) =>
              setNewModule((prev) => ({
                ...prev,
                xp: Number(event.target.value),
              }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="module-description">Instructions</Label>
        <Textarea
          id="module-description"
          rows={4}
          value={newModule.description}
          onChange={(event) =>
            setNewModule((prev) => ({
              ...prev,
              description: event.target.value,
            }))
          }
          placeholder="Add instructions, prompts, or context for this activity."
        />
      </div>

      {acceptsUpload && (
        <div className="space-y-2">
          <Label>Attachments</Label>
          <label
            htmlFor="module-assets"
            className="flex cursor-pointer items-center justify-between rounded-md border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted/50"
          >
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload reference files
            </span>
            <span className="text-xs">PDF, images, videos</span>
          </label>
          <input
            id="module-assets"
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => {
              handleAssetUpload(event.target.files);
              event.target.value = "";
            }}
          />
          {newModule.assets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {newModule.assets.map((asset) => (
                <Badge
                  key={asset.id}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <span>{asset.name}</span>
                  <button type="button" onClick={() => removeAsset(asset.id)}>
                    <Trash2 className="h-3 w-3" />
                    <span className="sr-only">Remove asset</span>
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <Button type="button" className="w-full" onClick={handleAdd}>
        Add module
      </Button>
    </div>
  );
}
