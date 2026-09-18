import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router-adapter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInventoryCounts } from "@/features/inventory/hooks/useInventoryCounts";
import { useInventoryLocations } from "@/features/inventory/hooks/useInventoryLocations";
import { useInventoryItems } from "@/features/inventory/hooks/useInventoryItems";
import { format } from "date-fns";

interface NewCountWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CountPeriod = "day_start" | "day_end";

const DESCRIPTION_LIMIT = 150;

const toDateInputValue = (date: Date) => format(date, "yyyy-MM-dd");

export function NewCountWizard({ open, onOpenChange }: NewCountWizardProps) {
  const navigate = useNavigate();
  const { createCount } = useInventoryCounts();
  const { data: locations } = useInventoryLocations();
  const { data: items, isLoading: itemsLoading } = useInventoryItems();
  const [period, setPeriod] = useState<CountPeriod>("day_start");
  const [locationId, setLocationId] = useState("");
  const [countDate, setCountDate] = useState(toDateInputValue(new Date()));
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPeriod("day_start");
    setCountDate(toDateInputValue(new Date()));
    setDescription("");
    setLocationId((current) => {
      if (current) return current;
      return locations?.length === 1 ? locations[0].id : "";
    });
  }, [open, locations]);

  const scopedItems = useMemo(
    () =>
      (items ?? []).filter((item) => {
        if (!item.is_active || !locationId) return false;
        return item.default_location_id === locationId;
      }),
    [items, locationId],
  );

  const canStart =
    Boolean(locationId) &&
    Boolean(countDate) &&
    (itemsLoading || scopedItems.length > 0);

  const resetAndClose = () => {
    setPeriod("day_start");
    setLocationId(locations?.length === 1 ? locations[0].id : "");
    setCountDate(toDateInputValue(new Date()));
    setDescription("");
    onOpenChange(false);
  };

  const handleStart = async () => {
    if (!canStart) return;
    setCreating(true);
    try {
      const createdCount = await createCount({
        type: period,
        period,
        locations: [locationId],
        scheduleDate: new Date(`${countDate}T12:00:00`).toISOString(),
        description: description.trim() || undefined,
      });
      resetAndClose();
      if (createdCount?.id) {
        navigate(`/app/inventory/counts/${createdCount.id}`);
      }
    } catch {
      // Error already handled in hook
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New count</DialogTitle>
          <DialogDescription>
            Pick the day part, date, and room. Expected quantities come from
            on-hand.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={period === "day_start" ? "default" : "outline"}
              onClick={() => setPeriod("day_start")}
            >
              Day Start
            </Button>
            <Button
              type="button"
              variant={period === "day_end" ? "default" : "outline"}
              onClick={() => setPeriod("day_end")}
            >
              Day End
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="count-date">Count date</Label>
            <Input
              id="count-date"
              type="date"
              value={countDate}
              onChange={(event) => setCountDate(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The date this count is registered, not a running timer.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Storage area</Label>
            {(locations ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rooms yet.{" "}
                <Link
                  to="/app/inventory/items"
                  className="underline"
                  onClick={() => onOpenChange(false)}
                >
                  Add a room in Items & Setup
                </Link>
                .
              </p>
            ) : (
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a room" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {locationId && !itemsLoading && (
              <p className="text-xs text-muted-foreground">
                {scopedItems.length === 0
                  ? "No items use this room yet. Add an item with this default room first."
                  : `Includes ${scopedItems.map((item) => item.name).join(", ")}`}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="count-description">Description</Label>
            <Textarea
              id="count-description"
              maxLength={DESCRIPTION_LIMIT}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional note for this count"
              rows={3}
            />
            <p className="text-right text-xs text-muted-foreground">
              {description.length}/{DESCRIPTION_LIMIT}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleStart()}
              disabled={!canStart || creating}
            >
              {creating ? "Starting..." : "Start count"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
