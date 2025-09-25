
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmployeeSelector } from './EmployeeSelector';
import { 
  X, 
  Clock, 
  MapPin, 
  Users, 
  FileText, 
  Save, 
  Eye, 
  Trash2,
  Calendar as CalendarIcon,
  Plus
} from 'lucide-react';
import { useScheduling } from '@/contexts/SchedulingContext';
import { format } from 'date-fns';

interface ShiftDetailsPanelProps {
  shiftId: string;
  onClose: () => void;
}

export function ShiftDetailsPanel({ shiftId, onClose }: ShiftDetailsPanelProps) {
  const { schedules, updateSchedule, deleteSchedule } = useScheduling();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const shift = schedules.find(s => s.id === shiftId);

  const [formData, setFormData] = useState({
    title: '',
    start_time: '',
    end_time: '',
    location: '',
    notes: '',
    is_all_day: false,
    timezone: 'UTC',
    color: '#3b82f6'
  });

  useEffect(() => {
    if (shift) {
      setFormData({
        title: shift.title || '',
        start_time: format(new Date(shift.start_time), "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(shift.end_time), "yyyy-MM-dd'T'HH:mm"),
        location: shift.location || '',
        notes: shift.notes || '',
        is_all_day: shift.is_all_day || false,
        timezone: shift.timezone || 'UTC',
        color: shift.color || '#3b82f6'
      });
    }
  }, [shift]);

  const handleSave = async () => {
    if (!shift) return;
    
    setLoading(true);
    try {
      await updateSchedule(shift.id, {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString()
      });
    } catch (error) {
      console.error('Error saving shift:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!shift) return;
    
    setLoading(true);
    try {
      await updateSchedule(shift.id, { is_published: true } as any);
    } catch (error) {
      console.error('Error publishing shift:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!shift || !confirm('Are you sure you want to delete this shift?')) return;
    
    setLoading(true);
    try {
      await deleteSchedule(shift.id);
      onClose();
    } catch (error) {
      console.error('Error deleting shift:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!shift) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shift Details</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Shift not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Shift Details
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Shift title"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Shift location"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>

            {/* Assigned Employees */}
            <div className="space-y-3">
              <Label>Assigned Employees</Label>
              <EmployeeSelector 
                shiftId={shift.id}
                selectedEmployees={shift.assignments || []}
              />
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge variant={shift.is_published ? "default" : "secondary"}>
                {shift.is_published ? "Published" : "Draft"}
              </Badge>
              {shift.position_id && (
                <Badge variant="outline">
                  Position ID: {shift.position_id}
                </Badge>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Shift Tasks</h3>
              <p className="text-sm text-gray-500 mb-4">
                Create task checklists for this shift
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="space-y-4">
              <Button variant="outline" className="w-full">
                Save as Shift Template
              </Button>
              <Button variant="outline" className="w-full">
                Load from Template
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
          
          {!shift.is_published && (
            <Button variant="outline" onClick={handlePublish} disabled={loading}>
              <Eye className="mr-2 h-4 w-4" />
              Publish Shift
            </Button>
          )}
          
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Shift
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
