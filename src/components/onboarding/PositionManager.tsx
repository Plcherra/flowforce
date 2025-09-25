
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BusinessTemplate, OnboardingPosition } from '@/types/templates';
import { Plus, Briefcase } from 'lucide-react';
import PositionEditDialog from './PositionEditDialog';
import PositionCard from './PositionCard';
import SuggestedPositions from './SuggestedPositions';
import EmptyPositionsState from './EmptyPositionsState';

interface OnboardingRole {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  permissions: Record<string, boolean>;
  is_system_role: boolean;
}

interface PositionManagerProps {
  role: OnboardingRole;
  positions: OnboardingPosition[];
  selectedTemplate: BusinessTemplate | null;
  onPositionsChange: (roleId: string, positions: OnboardingPosition[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PositionManager({ 
  role, 
  positions, 
  selectedTemplate, 
  onPositionsChange, 
  open, 
  onOpenChange 
}: PositionManagerProps) {
  const [editingPosition, setEditingPosition] = useState<OnboardingPosition | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const rolePositions = positions.filter(p => p.roleId === role.id);

  const handleAddPosition = (positionName?: string) => {
    const newPosition: OnboardingPosition = {
      id: `pos-${Date.now()}`,
      name: positionName || 'New Position',
      description: '',
      roleId: role.id,
      permissions: { ...role.permissions },
    };
    
    const updatedPositions = [...positions.filter(p => p.roleId !== role.id), ...rolePositions, newPosition];
    onPositionsChange(role.id, updatedPositions);
  };

  const handleEditPosition = (position: OnboardingPosition) => {
    setEditingPosition(position);
    setEditDialogOpen(true);
  };

  const handleDeletePosition = (positionId: string) => {
    const updatedPositions = positions.filter(p => p.id !== positionId);
    onPositionsChange(role.id, updatedPositions);
  };

  const handleSavePosition = (positionData: Partial<OnboardingPosition>) => {
    if (editingPosition) {
      const updatedPositions = positions.map(p => 
        p.id === editingPosition.id 
          ? { ...p, ...positionData }
          : p
      );
      onPositionsChange(role.id, updatedPositions);
    }
    setEditDialogOpen(false);
    setEditingPosition(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5" />
              <span>Manage Positions for {role.name}</span>
            </DialogTitle>
            <DialogDescription>
              Add and configure specific positions within this role. Each position inherits the role's base permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <SuggestedPositions
              role={role}
              selectedTemplate={selectedTemplate}
              existingPositions={rolePositions}
              onAddPosition={handleAddPosition}
            />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-sm text-gray-700">
                  Current Positions ({rolePositions.length})
                </h4>
                <Button onClick={() => handleAddPosition()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Position
                </Button>
              </div>

              {rolePositions.length === 0 ? (
                <EmptyPositionsState />
              ) : (
                <div className="grid gap-3">
                  {rolePositions.map((position) => (
                    <PositionCard
                      key={position.id}
                      position={position}
                      role={role}
                      onEdit={handleEditPosition}
                      onDelete={handleDeletePosition}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PositionEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        position={editingPosition}
        onSave={handleSavePosition}
      />
    </>
  );
}
