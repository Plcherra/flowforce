import { useMemo, useState } from "react";
import { AVAILABLE_SECTIONS } from "@/data/availableSections";
import { useCustomSections } from "@/hooks/useCustomSections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type Props = {
  selectedSections: string[];
  onSectionToggle: (sectionId: string, enabled: boolean) => void;
};

type UnifiedItem = {
  id: string;
  name: string;
  path: string;
  category: "core" | "operations" | "hr" | "communication" | "custom" | string;
  type: "Core" | "Custom" | "Industry";
  description?: string;
};

const catClass: Record<string, string> = {
  core: "bg-gray-100 text-gray-800",
  communication: "bg-purple-100 text-purple-800",
  operations: "bg-green-100 text-green-800",
  hr: "bg-blue-100 text-blue-800",
  custom: "bg-gray-100 text-gray-800",
};

export function UnifiedSectionsManager({
  selectedSections,
  onSectionToggle,
}: Props) {
  const { sections: customSections } = useCustomSections();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<
    "all" | "core" | "communication" | "operations" | "hr" | "custom"
  >("all");
  const navigate = useNavigate();

  const items = useMemo<UnifiedItem[]>(() => {
    const defaults: UnifiedItem[] = AVAILABLE_SECTIONS.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      path: s.path,
      category: (s.category as any) || "core",
      type: s.category === "industry" ? "Industry" : "Core",
    }));
    const customs: UnifiedItem[] = customSections.map((cs) => ({
      id: cs.id,
      name: cs.name,
      description: cs.description || "",
      path: cs.path,
      category: (cs.category as any) || "custom",
      type: "Custom",
    }));
    return [...defaults, ...customs];
  }, [customSections]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (category !== "all" && it.category !== category) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (
          !`${it.name} ${it.path} ${it.description || ""}`
            .toLowerCase()
            .includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, query, category]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span>Sections</span>
          <div className="flex items-center gap-2">
            <Input
              className="w-56"
              placeholder="Search sections..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="core">Core</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => navigate("/add-section")}>
              Add New Section
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.map((it) => {
          const enabled = selectedSections.includes(it.id);
          return (
            <div
              key={`${it.type}-${it.id}`}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{it.name}</span>
                  <Badge className={catClass[it.category] || catClass.core}>
                    {String(it.category)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {it.type}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {it.path}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => onSectionToggle(it.id, !!v)}
                />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No sections found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
