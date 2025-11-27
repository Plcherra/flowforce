// @ts-nocheck
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus } from 'lucide-react';
import { usePositions } from '@/hooks/usePositions';

export type SchedulingFilterState = {
  positions: string[];
  users: string[];
  status: 'all' | 'assigned' | 'unassigned' | 'understaffed' | 'overstaffed';
  published: 'all' | 'published' | 'draft';
};

interface SchedulingFiltersProps {
  filters: SchedulingFilterState;
  onFiltersChange: (filters: SchedulingFilterState) => void;
}

export function SchedulingFilters({ filters, onFiltersChange }: SchedulingFiltersProps) {
  const { positions } = usePositions();
  const [, setShowCustomFilter] = useState(false);

  const handleFilterChange = <Key extends keyof SchedulingFilterState>(
    key: Key,
    value: SchedulingFilterState[Key],
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handlePositionToggle = (positionId: string) => {
    const currentPositions = filters.positions || [];
    const newPositions = currentPositions.includes(positionId)
      ? currentPositions.filter((id: string) => id !== positionId)
      : [...currentPositions, positionId];
    
    handleFilterChange('positions', newPositions);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      positions: [],
      users: [],
      status: 'all',
      published: 'all',
    });
  };

  const hasActiveFilters = 
    filters.positions?.length > 0 ||
    filters.users?.length > 0 ||
    filters.status !== 'all' ||
    filters.published !== 'all';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Job/Position Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Job/Position</label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {positions.map((position) => (
                <div key={position.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`position-${position.id}`}
                    checked={filters.positions?.includes(position.id)}
                    onCheckedChange={() => handlePositionToggle(position.id)}
                  />
                  <label 
                    htmlFor={`position-${position.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {position.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="understaffed">Understaffed</SelectItem>
                <SelectItem value="overstaffed">Overstaffed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Published Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Published</label>
            <Select value={filters.published} onValueChange={(value) => handleFilterChange('published', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Filters */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom</label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomFilter(true)}
              className="w-full justify-start"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Filter
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Active Filters:</label>
            <div className="flex flex-wrap gap-2">
              {filters.positions?.map((positionId: string) => {
                const position = positions.find(p => p.id === positionId);
                return position ? (
                  <Badge key={positionId} variant="secondary" className="flex items-center gap-1">
                    {position.name}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handlePositionToggle(positionId)}
                    />
                  </Badge>
                ) : null;
              })}
              
              {filters.status !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filters.status}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('status', 'all')}
                  />
                </Badge>
              )}
              
              {filters.published !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {filters.published === 'published' ? 'Published' : 'Draft'}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('published', 'all')}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
