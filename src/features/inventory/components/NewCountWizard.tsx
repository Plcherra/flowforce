import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-adapter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Calculator,
  MapPin,
  Package,
  CheckCircle2,
  CalendarIcon,
  Clock,
} from "lucide-react";
import { useInventoryCounts } from "@/features/inventory/hooks/useInventoryCounts";
import { useInventoryCategories } from "@/features/inventory/hooks/useInventoryCategories";
import { useInventoryLocations } from "@/features/inventory/hooks/useInventoryLocations";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";

interface NewCountWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CountPeriod = "day_start" | "day_end" | "custom";

interface CountTypeOption {
  label: string;
  value: string;
  period?: CountPeriod;
  removable?: boolean;
}

const COUNT_TYPES_STORAGE_KEY = "inventory-count-types-v2";

const DEFAULT_COUNT_TYPES: CountTypeOption[] = [
  {
    label: "Day Start",
    value: "day_start",
    period: "day_start",
    removable: false,
  },
  { label: "Day End", value: "day_end", period: "day_end", removable: false },
  { label: "Full Count", value: "full", period: "custom", removable: true },
  { label: "Cycle Count", value: "cycle", period: "custom", removable: true },
  { label: "Spot Check", value: "spot", period: "custom", removable: true },
];

const slugifyCountType = (label: string) => {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "custom_count";
};

const normalizeCountTypes = (types: CountTypeOption[]): CountTypeOption[] => {
  const map = new Map<string, CountTypeOption>();

  DEFAULT_COUNT_TYPES.forEach((option) => {
    map.set(option.value, option);
  });

  types.forEach((option) => {
    const value = option.value || slugifyCountType(option.label);
    const existing = map.get(value);
    if (existing && existing.removable === false) {
      return;
    }

    map.set(value, {
      label: option.label,
      value,
      period: option.period ?? "custom",
      removable: option.removable ?? true,
    });
  });

  return Array.from(map.values());
};

export function NewCountWizard({ open, onOpenChange }: NewCountWizardProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState("type");
  const [countData, setCountData] = useState({
    type: "day_start",
    typeLabel: "Day Start",
    period: "day_start" as CountPeriod,
    locations: [] as string[],
    categories: [] as string[],
    notes: "",
    description: "",
    assignees: [] as string[],
    scheduledDate: undefined as Date | undefined,
    scheduledTime: "09:00",
  });
  const [isNowModeActive, setIsNowModeActive] = useState(false);
  const { createCount } = useInventoryCounts();
  const { data: categories } = useInventoryCategories();
  const { data: locations } = useInventoryLocations();
  const [creating, setCreating] = useState(false);

  // Load count types from localStorage or use defaults
  const [countTypes, setCountTypes] = useState<CountTypeOption[]>([]);
  const [newCountType, setNewCountType] = useState("");

  // Real-time clock for "now mode"
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isNowModeActive) {
      interval = setInterval(() => {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // Format as HH:MM
        setCountData((prev) => ({
          ...prev,
          scheduledTime: currentTime,
          scheduledDate: now,
        }));
      }, 1000); // Update every second
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isNowModeActive]);

  // Initialize count types from localStorage on mount
  useEffect(() => {
    try {
      const savedTypesRaw = localStorage.getItem(COUNT_TYPES_STORAGE_KEY);
      if (savedTypesRaw) {
        const parsed = JSON.parse(savedTypesRaw);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((entry: any) => {
            if (typeof entry === "string") {
              return {
                label: entry,
                value: slugifyCountType(entry),
                period: "custom" as CountPeriod,
                removable: true,
              } satisfies CountTypeOption;
            }

            return {
              label: entry.label ?? entry.value ?? "Custom Count",
              value: entry.value
                ? String(entry.value)
                : slugifyCountType(entry.label ?? "custom"),
              period: (entry.period as CountPeriod) ?? "custom",
              removable: entry.removable ?? true,
            } satisfies CountTypeOption;
          });

          setCountTypes(normalizeCountTypes(normalized));
          return;
        }
      }
    } catch (error) {
      logger.warn("Failed to load stored count types", {
        error,
        tags: ["warning"],
      });
    }

    setCountTypes(DEFAULT_COUNT_TYPES);
  }, []);

  // Keep count types persisted locally
  useEffect(() => {
    if (countTypes.length === 0) return;

    const serializable = countTypes.map((option) => ({
      label: option.label,
      value: option.value,
      period: option.period,
      removable: option.removable,
    }));

    localStorage.setItem(COUNT_TYPES_STORAGE_KEY, JSON.stringify(serializable));
  }, [countTypes]);

  useEffect(() => {
    if (countTypes.length === 0) return;

    if (!countTypes.some((option) => option.value === countData.type)) {
      const fallback = countTypes[0];
      setCountData((prev) => ({
        ...prev,
        type: fallback.value,
        typeLabel: fallback.label,
        period: fallback.period ?? "custom",
      }));
    }
  }, [countTypes]);

  // Save count types to localStorage whenever they change
  useEffect(() => {
    if (countTypes.length > 0) {
      localStorage.setItem("inventory-count-types", JSON.stringify(countTypes));
    }
  }, [countTypes]);

  const handleNext = () => {
    const steps = ["type", "locations", "schedule", "review"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps = ["type", "locations", "schedule", "review"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleLocationToggle = (locationId: string) => {
    setCountData((prev) => ({
      ...prev,
      locations: prev.locations.includes(locationId)
        ? prev.locations.filter((id) => id !== locationId)
        : [...prev.locations, locationId],
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setCountData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleTypeSelect = (option: CountTypeOption) => {
    setCountData((prev) => ({
      ...prev,
      type: option.value,
      typeLabel: option.label,
      period: option.period ?? "custom",
    }));
  };

  const addCountType = () => {
    const label = newCountType.trim();
    if (!label) return;

    const value = slugifyCountType(label);

    setCountTypes((prev) => {
      if (prev.some((option) => option.value === value)) {
        return prev;
      }
      return normalizeCountTypes([
        ...prev,
        {
          label,
          value,
          period: "custom",
          removable: true,
        },
      ]);
    });

    setCountData((prev) => ({
      ...prev,
      type: value,
      typeLabel: label,
      period: "custom",
    }));

    setNewCountType("");
  };

  const removeCountType = (value: string) => {
    setCountTypes((prev) => {
      const option = prev.find((opt) => opt.value === value);
      if (!option || option.removable === false) {
        return prev;
      }
      const filtered = prev.filter((opt) => opt.value !== value);
      return normalizeCountTypes(filtered);
    });

    if (countData.type === value) {
      const fallback = DEFAULT_COUNT_TYPES[0];
      setCountData((prev) => ({
        ...prev,
        type: fallback.value,
        typeLabel: fallback.label,
        period: fallback.period ?? "custom",
      }));
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "type":
        return countData.type;
      case "locations":
        return (
          countData.locations.length > 0 || countData.categories.length > 0
        );
      case "schedule":
        return true; // Schedule is optional, can always proceed
      default:
        return true;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            New Inventory Count
          </DialogTitle>
          <DialogDescription>
            Set up a new inventory count that will start immediately
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentStep} onValueChange={setCurrentStep}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="type" disabled={false}>
              Type
            </TabsTrigger>
            <TabsTrigger value="locations" disabled={!countData.type}>
              Scope
            </TabsTrigger>
            <TabsTrigger value="schedule" disabled={!canProceed()}>
              Date/Time
            </TabsTrigger>
            <TabsTrigger value="review" disabled={!canProceed()}>
              Review
            </TabsTrigger>
          </TabsList>

          <TabsContent value="type" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Count Type</Label>
                <div className="space-y-3 mt-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new count type..."
                      value={newCountType}
                      onChange={(e) => setNewCountType(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addCountType()}
                    />
                    <Button
                      type="button"
                      onClick={addCountType}
                      disabled={!newCountType}
                      size="sm"
                    >
                      +
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {countTypes.map((option) => {
                      const isSelected = countData.type === option.value;
                      const periodHint =
                        option.period === "day_start"
                          ? "Opening inventory before service"
                          : option.period === "day_end"
                            ? "Closing inventory after service"
                            : "Custom frequency";

                      return (
                        <div
                          key={option.value}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all hover:bg-accent/50 ${
                            isSelected
                              ? "ring-2 ring-primary bg-primary/5 border-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => handleTypeSelect(option)}
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <p className="text-xs text-muted-foreground">
                                {periodHint}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          {option.removable !== false && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeCountType(option.value);
                              }}
                              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            >
                              -
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Day Part Focus</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={
                      countData.period === "day_start" ? "default" : "outline"
                    }
                    onClick={() =>
                      setCountData((prev) => ({ ...prev, period: "day_start" }))
                    }
                    size="sm"
                  >
                    Day Start
                  </Button>
                  <Button
                    type="button"
                    variant={
                      countData.period === "day_end" ? "default" : "outline"
                    }
                    onClick={() =>
                      setCountData((prev) => ({ ...prev, period: "day_end" }))
                    }
                    size="sm"
                  >
                    Day End
                  </Button>
                  <Button
                    type="button"
                    variant={
                      countData.period === "custom" ? "default" : "outline"
                    }
                    onClick={() =>
                      setCountData((prev) => ({ ...prev, period: "custom" }))
                    }
                    size="sm"
                  >
                    Custom
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose the day-part focus that best matches how the count will
                  be reviewed.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Locations
                </Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {locations?.map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={location.id}
                        checked={countData.locations.includes(location.id)}
                        onCheckedChange={() =>
                          handleLocationToggle(location.id)
                        }
                      />
                      <Label
                        htmlFor={location.id}
                        className="text-sm font-normal"
                      >
                        {location.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Categories
                </Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {categories?.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={category.id}
                        checked={countData.categories.includes(category.id)}
                        onCheckedChange={() =>
                          handleCategoryToggle(category.id)
                        }
                      />
                      <Label
                        htmlFor={category.id}
                        className="text-sm font-normal"
                      >
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Short description that appears in supervisor review"
                  value={countData.description}
                  onChange={(e) =>
                    setCountData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any special instructions or notes for this count..."
                  value={countData.notes}
                  onChange={(e) =>
                    setCountData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-2",
                        !countData.scheduledDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {countData.scheduledDate ? (
                        format(countData.scheduledDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={countData.scheduledDate}
                      onSelect={(date) =>
                        setCountData((prev) => ({
                          ...prev,
                          scheduledDate: date,
                        }))
                      }
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="time"
                    value={countData.scheduledTime}
                    onChange={(e) =>
                      setCountData((prev) => ({
                        ...prev,
                        scheduledTime: e.target.value,
                      }))
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant={isNowModeActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isNowModeActive) {
                        // Turn off now mode
                        setIsNowModeActive(false);
                      } else {
                        // Turn on now mode - set current time and date immediately
                        const now = new Date();
                        const currentTime = now.toTimeString().slice(0, 5);
                        setCountData((prev) => ({
                          ...prev,
                          scheduledTime: currentTime,
                          scheduledDate: now,
                        }));
                        setIsNowModeActive(true);
                      }
                    }}
                  >
                    Now
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {countData.scheduledDate
                    ? `Count will start on ${format(countData.scheduledDate, "PPP")} at ${countData.scheduledTime}`
                    : "Count will start immediately upon creation"}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Count Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Type:</span>
                      <p>{countData.typeLabel || countData.type}</p>
                    </div>
                    <div>
                      <span className="font-medium">Day Part:</span>
                      <p>
                        {countData.period === "day_start"
                          ? "Day Start (before service)"
                          : countData.period === "day_end"
                            ? "Day End (after service)"
                            : "Custom"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Locations:</span>
                      <p>
                        {countData.locations.length
                          ? countData.locations
                              .map(
                                (id) =>
                                  locations?.find((l) => l.id === id)?.name,
                              )
                              .filter(Boolean)
                              .join(", ")
                          : "All locations"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Start Time:</span>
                      <p>
                        {countData.scheduledDate
                          ? `${format(countData.scheduledDate, "PPP")} at ${countData.scheduledTime}`
                          : "Immediately upon creation"}
                      </p>
                    </div>
                  </div>

                  {countData.description && (
                    <div>
                      <span className="font-medium">Description:</span>
                      <p className="text-sm">{countData.description}</p>
                    </div>
                  )}

                  {countData.categories.length > 0 && (
                    <div>
                      <span className="font-medium">Categories:</span>
                      <p className="text-sm">
                        {countData.categories
                          .map(
                            (id) => categories?.find((c) => c.id === id)?.name,
                          )
                          .join(", ")}
                      </p>
                    </div>
                  )}

                  {countData.notes && (
                    <div>
                      <span className="font-medium">Notes:</span>
                      <p className="text-sm">{countData.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === "type"}
          >
            Back
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>

            {currentStep === "review" ? (
              <Button
                onClick={async () => {
                  setCreating(true);
                  try {
                    // Create count data with scheduled or current date/time
                    let scheduledDateTime;
                    if (isNowModeActive) {
                      // Use actual current time if in "now mode"
                      scheduledDateTime = new Date();
                    } else {
                      // Use scheduled time
                      scheduledDateTime = countData.scheduledDate
                        ? new Date(
                            `${countData.scheduledDate.toDateString()} ${countData.scheduledTime}`,
                          )
                        : new Date();
                    }

                    const selectedCategoryNames = countData.categories
                      .map(
                        (categoryId) =>
                          categories?.find(
                            (category) => category.id === categoryId,
                          )?.name,
                      )
                      .filter((name): name is string => Boolean(name));

                    const countPayload = {
                      type: countData.type,
                      period: countData.period,
                      locations: countData.locations,
                      categories: selectedCategoryNames,
                      scheduleDate: scheduledDateTime.toISOString(),
                      notes: countData.notes,
                      description: countData.description,
                    };
                    const createdCount = await createCount(countPayload);
                    onOpenChange(false);
                    // Reset form
                    setCountData({
                      type: "day_start",
                      typeLabel: "Day Start",
                      period: "day_start",
                      locations: [],
                      categories: [],
                      notes: "",
                      description: "",
                      assignees: [],
                      scheduledDate: undefined,
                      scheduledTime: "09:00",
                    });
                    setIsNowModeActive(false);
                    setCurrentStep("type");
                    // Navigate to the count page
                    if (createdCount?.id) {
                      navigate(`/inventory/counts/${createdCount.id}`);
                    }
                  } catch (error) {
                    // Error already handled in hook
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={creating}
              >
                {creating ? "Creating..." : "Create Count"}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
