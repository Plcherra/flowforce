import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell, Megaphone, AlertTriangle, Info, X, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { logger } from '@/utils/logger';

import type { Announcement } from '@/types/announcements';

interface AnnouncementBannerProps {
  className?: string;
}

export function AnnouncementBanner({ className = '' }: AnnouncementBannerProps) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user]);

  const fetchAnnouncements = async () => {
    if (!user) return;

    try {
      // Fetch announcements and read status
      const { data: announcementData, error: announcementError } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          priority,
          created_at,
          expires_at,
          created_by,
          created_by_profile:profiles!created_by (
            first_name,
            last_name
          )
        `)
        .eq('is_published', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (announcementError) throw announcementError;

      // Get read status for each announcement
      const { data: readData, error: readError } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      if (readError) throw readError;

      const readIds = new Set(readData?.map(r => r.announcement_id) || []);

      const announcementsWithReadStatus = (announcementData || []).map(announcement => {
        // Safely extract profile data
        const profile = announcement.created_by_profile;
        const creatorProfile = profile && 
                               typeof profile === 'object' && 
                               profile !== null
          ? {
              first_name: (profile as any).first_name || 'Unknown',
              last_name: (profile as any).last_name || 'User'
            }
          : { first_name: 'Unknown', last_name: 'User' };

        // Ensure we only include the fields we need and type them correctly
         const result: Announcement = {
           id: announcement.id,
           title: announcement.title,
           content: announcement.content,
           priority: announcement.priority,
           created_at: announcement.created_at,
           expires_at: announcement.expires_at,
           created_by: announcement.created_by,
           target_audience: 'all',
           target_ids: [],
           company_id: '',
           is_published: true,
           updated_at: announcement.created_at,
           creator_profile: creatorProfile,
           is_read: readIds.has(announcement.id)
         };
        return result;
      });

      setAnnouncements(announcementsWithReadStatus);
    } catch (error) {
      logger.error('Error fetching announcements:', { error, tags: ['error'] });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (announcementId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_id: user.id
        });

      // Update local state
      setAnnouncements(prev => 
        prev.map(a => 
          a.id === announcementId ? { ...a, is_read: true } : a
        )
      );
    } catch (error) {
      logger.error('Error marking announcement as read:', { error, tags: ['error'] });
    }
  };

  const dismissAnnouncement = (announcementId: string) => {
    setDismissedIds(prev => new Set([...prev, announcementId]));
    markAsRead(announcementId);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'normal':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter out dismissed and read announcements (except urgent ones)
  const visibleAnnouncements = announcements.filter(announcement => 
    !dismissedIds.has(announcement.id) && 
    (!announcement.is_read || announcement.priority === 'urgent')
  );

  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {visibleAnnouncements.map((announcement) => (
        <Alert 
          key={announcement.id} 
          variant={getPriorityVariant(announcement.priority) as "default" | "destructive"}
          className="relative border-l-4 border-l-primary"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {getPriorityIcon(announcement.priority)}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertTitle className="mb-0 text-base">
                    {announcement.title}
                  </AlertTitle>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getPriorityBadgeColor(announcement.priority)}`}
                  >
                    {announcement.priority}
                  </Badge>
                  {!announcement.is_read && (
                    <Badge variant="secondary" className="text-xs">
                      New
                    </Badge>
                  )}
                </div>
                
                <AlertDescription className="text-sm leading-relaxed">
                  {announcement.content}
                </AlertDescription>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    By {announcement.creator_profile.first_name} {announcement.creator_profile.last_name} • {' '}
                    {format(new Date(announcement.created_at), 'MMM dd, yyyy at h:mm a')}
                  </span>
                  {announcement.expires_at && (
                    <span>
                      Expires {format(new Date(announcement.expires_at), 'MMM dd, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 ml-4">
              {!announcement.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => markAsRead(announcement.id)}
                  title="Mark as read"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => dismissAnnouncement(announcement.id)}
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
}