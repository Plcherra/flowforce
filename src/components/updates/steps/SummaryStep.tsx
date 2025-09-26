import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Users,
  Clock,
  Bell,
  MessageSquare,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { WizardFormData } from '../CreateUpdateWizard';

interface SummaryStepProps {
  formData: WizardFormData;
}

export function SummaryStep({ formData }: SummaryStepProps) {
  const getRecipientSummary = () => {
    if (formData.recipients.type === 'all') {
      return 'All employees (130)';
    }
    
    // Mock calculation - replace with actual logic
    const count = formData.recipients.targets.length * 10; // Mock multiplier
    return `${count} selected employees`;
  };

  const getBackgroundPreview = () => {
    const { backgroundStyle } = formData;
    if (backgroundStyle.type === 'gradient') {
      return `linear-gradient(135deg, ${backgroundStyle.primary}, ${backgroundStyle.secondary})`;
    }
    return backgroundStyle.primary;
  };

  const getScheduleSummary = () => {
    if (formData.publishingSettings.publishNow) {
      return 'Publish immediately';
    }
    
    if (formData.publishingSettings.scheduledDate) {
      const dateStr = format(new Date(formData.publishingSettings.scheduledDate), 'PPP');
      const timeStr = formData.publishingSettings.scheduledTime || '09:00';
      return `Scheduled for ${dateStr} at ${timeStr}`;
    }
    
    return 'Not scheduled';
  };

  const getNotificationSummary = () => {
    const { notifications } = formData.publishingSettings;
    const enabled = [];
    
    if (notifications.email) enabled.push('Email');
    if (notifications.push) enabled.push('Push');
    if (notifications.inApp) enabled.push('In-app');
    if (notifications.reminders) enabled.push('Reminders');
    
    return enabled.length > 0 ? enabled.join(', ') : 'None';
  };

  const getEngagementSummary = () => {
    const { engagement } = formData.publishingSettings;
    const enabled = [];
    
    if (engagement.allowLikes) enabled.push('Likes');
    if (engagement.allowComments) enabled.push('Comments');
    if (engagement.allowSharing) enabled.push('Sharing');
    if (engagement.requireConfirmation) enabled.push('Read confirmation');
    if (engagement.showAsPopup) enabled.push('Pop-up display');
    
    return enabled.length > 0 ? enabled.join(', ') : 'Basic display only';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Review & Publish</h3>
        <p className="text-muted-foreground">
          Review your update before publishing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Update Preview */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Update Preview
          </h4>
          
          <Card className="overflow-hidden">
            <div
              className="h-32 p-4 text-white relative"
              style={{ background: getBackgroundPreview() }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10">
                <Badge variant="secondary" className="mb-2">
                  {formData.type}
                </Badge>
                <h4 className="font-semibold text-lg line-clamp-2">
                  {formData.title}
                </h4>
              </div>
            </div>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground line-clamp-4 mb-3">
                {formData.content}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {formData.publishingSettings.authorAttribution 
                    ? `By ${formData.publishingSettings.authorName || 'You'}`
                    : 'Anonymous'
                  }
                </span>
                <div className="flex gap-4">
                  {formData.publishingSettings.engagement.allowLikes && <span>👍 0</span>}
                  {formData.publishingSettings.engagement.allowComments && <span>💬 0</span>}
                  <span>👁 0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Summary */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Settings Summary
          </h4>

          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Basic Info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Basic Information</span>
                </div>
                <div className="pl-6 space-y-1 text-sm text-muted-foreground">
                  <div>Type: <Badge variant="outline">{formData.type}</Badge></div>
                  <div>Priority: <Badge variant="outline">{formData.priority}</Badge></div>
                  {formData.category && <div>Category: {formData.category}</div>}
                  {formData.template && <div>Template: {formData.template.name}</div>}
                </div>
              </div>

              <Separator />

              {/* Recipients */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Recipients</span>
                </div>
                <div className="pl-6 text-sm text-muted-foreground">
                  {getRecipientSummary()}
                </div>
              </div>

              <Separator />

              {/* Schedule */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Schedule</span>
                </div>
                <div className="pl-6 text-sm text-muted-foreground">
                  {getScheduleSummary()}
                </div>
              </div>

              <Separator />

              {/* Notifications */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Notifications</span>
                </div>
                <div className="pl-6 text-sm text-muted-foreground">
                  {getNotificationSummary()}
                </div>
              </div>

              <Separator />

              {/* Engagement */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Engagement</span>
                </div>
                <div className="pl-6 text-sm text-muted-foreground">
                  {getEngagementSummary()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-3 text-center text-sm text-muted-foreground">
        <p>
          {formData.publishingSettings.publishNow 
            ? 'Your update will be published immediately after confirmation.'
            : 'Your update will be saved and published at the scheduled time.'
          }
        </p>
      </div>
    </div>
  );
}
