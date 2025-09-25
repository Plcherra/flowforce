
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePositions, type Position } from '@/hooks/usePositions';
import { useCan } from '@/hooks/useCan';
import RoleGuard from '@/components/RoleGuard';
import CreatePositionDialog from '@/components/positions/CreatePositionDialog';
import EditPositionDialog from '@/components/positions/EditPositionDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const ROLE_COLORS = {
  staff: 'bg-gray-100 text-gray-800',
  supervisor: 'bg-green-100 text-green-800',
  manager: 'bg-blue-100 text-blue-800',
  admin: 'bg-red-100 text-red-800',
};

export default function PositionManagement() {
  const { positions, loading, deletePosition, getPositionsByRole } = usePositions();
  const { can } = useCan();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  const handleEditPosition = (position: Position) => {
    setSelectedPosition(position);
    setEditDialogOpen(true);
  };

  const handleDeletePosition = async (positionId: string) => {
    await deletePosition(positionId);
  };

  const renderPositionCard = (position: Position) => (
    <Card key={position.id}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{position.name}</CardTitle>
            <Badge className={ROLE_COLORS[position.role] || 'bg-gray-100 text-gray-800'}>
              {position.role}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditPosition(position)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Position</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this position? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeletePosition(position.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {position.description && (
          <p className="text-sm text-muted-foreground">{position.description}</p>
        )}
      </CardContent>
    </Card>
  );

  // Show setup message if positions table doesn't exist yet
  if (loading) {
  return (
    <div>
        <div className="p-8 text-center">
          <div className="text-2xl font-bold text-gray-900 mb-4">Loading...</div>
      </div>
    </div>
  );
}

  return (
    <RoleGuard permission="manageUsers" fallback={
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600">You don't have permission to manage positions.</p>
      </div>
    }>
      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Position Management</h1>
              <p className="text-muted-foreground">Create and manage positions for different roles</p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Position
            </Button>
          </div>

          {positions.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No positions found. Please ensure the database migration has been run to create the positions table.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">All Positions</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="supervisor">Supervisors</TabsTrigger>
              <TabsTrigger value="manager">Managers</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {positions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No positions yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first position to start organizing your team
                    </p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Position
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {positions.map(renderPositionCard)}
                </div>
              )}
            </TabsContent>

            {['staff', 'supervisor', 'manager', 'admin'].map((role) => (
              <TabsContent key={role} value={role} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {getPositionsByRole(role).map(renderPositionCard)}
                </div>
                {getPositionsByRole(role).length === 0 && (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No {role} positions</h3>
                      <p className="text-muted-foreground mb-4">
                        Create positions for {role} level employees
                      </p>
                      <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Position
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <CreatePositionDialog 
            open={createDialogOpen} 
            onOpenChange={setCreateDialogOpen} 
          />

          {selectedPosition && (
            <EditPositionDialog
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              position={selectedPosition}
              onClose={() => setSelectedPosition(null)}
          />
        )}
      </div>
    </RoleGuard>
  );
}
