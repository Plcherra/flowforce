import { Calendar, Clock, Users, Plus, Zap, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ShiftTemplate, VendorPaletteItem } from './types';

interface ScheduleTemplatesPanelProps {
  templates: ShiftTemplate[];
  vendors: VendorPaletteItem[];
  onTemplateDragStart: (event: React.DragEvent, template: ShiftTemplate) => void;
  onVendorDragStart: (event: React.DragEvent, vendor: VendorPaletteItem) => void;
  onAutoFillWeek: () => void;
  onQuickVendorVisit: () => Promise<void>;
}

export function ScheduleTemplatesPanel({
  templates,
  vendors,
  onTemplateDragStart,
  onVendorDragStart,
  onAutoFillWeek,
  onQuickVendorVisit,
}: ScheduleTemplatesPanelProps) {
  return (
    <Card className="lg:w-80 flex-shrink-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Role Templates
        </CardTitle>
        <div className="flex gap-2">
          <Button onClick={onAutoFillWeek} className="flex-1 text-xs">
            <Zap className="h-3 w-3 mr-1" />
            AI Fill Week
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={onQuickVendorVisit}>
            <Plus className="h-3 w-3 mr-1" />
            Vendor Visit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {templates.map((template) => (
          <div
            key={template.id}
            draggable
            onDragStart={(event) => onTemplateDragStart(event, template)}
            className="p-3 border rounded-lg cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
            style={{ borderLeftColor: template.color, borderLeftWidth: '4px' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{template.name}</span>
              <Badge variant="secondary" className="text-xs">
                {template.role}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {template.startTime} - {template.endTime}
              <Users className="h-3 w-3 ml-2" />
              {template.minStaff}-{template.maxStaff}
            </div>
          </div>
        ))}

        <div className="pt-4 mt-4 border-t space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Vendor Visits</h3>
            <Badge variant="outline">Drag to schedule</Badge>
          </div>
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              draggable
              onDragStart={(event) => onVendorDragStart(event, vendor)}
              className="p-3 border rounded-lg cursor-grab active:cursor-grabbing hover:bg-muted/40 transition-colors"
              style={{ borderLeftColor: vendor.color, borderLeftWidth: '4px' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{vendor.label}</span>
                <Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: vendor.color, color: '#fff' }}>
                  Vendor
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Default duration · {vendor.defaultDurationHours}h</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
