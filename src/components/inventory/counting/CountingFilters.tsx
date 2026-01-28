import { Search, Filter, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { InventoryCategory } from "@/features/inventory/hooks/types";

interface CountingFiltersProps {
  searchTerm: string;
  selectedCategory: string;
  selectedLocation: string;
  showUncountedOnly: boolean;
  categories: InventoryCategory[];
  locations: Array<{ id: string; name: string; location_type: string }>;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onUncountedOnlyChange: (checked: boolean) => void;
}

export function CountingFilters({
  searchTerm,
  selectedCategory,
  selectedLocation,
  showUncountedOnly,
  categories,
  locations,
  onSearchChange,
  onCategoryChange,
  onLocationChange,
  onUncountedOnlyChange,
}: CountingFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Location Filter */}
          <Select value={selectedLocation} onValueChange={onLocationChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.name}>
                  {location.name} ({location.location_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Uncounted Only Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="uncounted-only"
              checked={showUncountedOnly}
              onCheckedChange={(checked) => onUncountedOnlyChange(!!checked)}
            />
            <label
              htmlFor="uncounted-only"
              className="text-sm font-medium flex items-center gap-2"
            >
              {showUncountedOnly ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Uncounted Only
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
