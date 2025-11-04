import { useState } from 'react';
import { CompanyUpdate, UpdateComment } from '@/types/companyUpdates';
import { useCompanyUpdatesStore } from './useCompanyUpdatesStore';

type CreateCompanyUpdateInput = {
  title: string;
  content: string;
  richContent?: string;
  type: CompanyUpdate['type'];
  priority: CompanyUpdate['priority'];
  backgroundStyle?: CompanyUpdate['backgroundStyle'];
  isPinned?: boolean;
  publishingSettings?: CompanyUpdate['publishingSettings'];
  recipients?: CompanyUpdate['recipients'];
};

export function useCompanyUpdates() {
  const { 
    updates, 
    loading, 
    addUpdate, 
    removeUpdate, 
    togglePin: togglePinStore, 
    likeUpdate: likeUpdateStore,
    incrementViews,
    incrementComments,
    updateStatus
  } = useCompanyUpdatesStore();
  
  const [comments, setComments] = useState<UpdateComment[]>([]);

  const getUpdatesByStatus = (status: string) => {
    return updates.filter(update => update.status === status);
  };

  const likeUpdate = async (updateId: string) => {
    likeUpdateStore(updateId);
  };

  const addComment = async (updateId: string, content: string) => {
    const newComment: UpdateComment = {
      id: Date.now().toString(),
      updateId,
      author: {
        id: 'current-user',
        name: 'Current User',
        avatar: ''
      },
      content,
      createdAt: new Date().toISOString(),
      likes: 0
    };

    setComments(prev => [...prev, newComment]);
    incrementComments(updateId);
  };

  const markAsViewed = async (updateId: string) => {
    incrementViews(updateId);
  };

  const togglePin = async (updateId: string) => {
    togglePinStore(updateId);
  };

  const deleteUpdate = async (updateId: string) => {
    removeUpdate(updateId);
  };

  const archiveUpdate = async (updateId: string) => {
    updateStatus(updateId, 'archived');
  };

  const createUpdate = (updateData: CreateCompanyUpdateInput) => {
    const engagementDefaults = {
      allowLikes: true,
      allowComments: true,
      allowSharing: false,
      requireConfirmation: false,
      showAsPopup: false,
    };

    const notificationDefaults = {
      email: true,
      push: true,
      inApp: true,
      reminders: false,
    };

    const publishingSettings = {
      publishNow: updateData.publishingSettings?.publishNow ?? true,
      notifications: {
        ...notificationDefaults,
        ...updateData.publishingSettings?.notifications,
      },
      engagement: {
        ...engagementDefaults,
        ...updateData.publishingSettings?.engagement,
      },
      authorAttribution: updateData.publishingSettings?.authorAttribution ?? true,
      authorName: updateData.publishingSettings?.authorName,
      scheduledDate: updateData.publishingSettings?.scheduledDate,
      scheduledTime: updateData.publishingSettings?.scheduledTime,
      timezone: updateData.publishingSettings?.timezone,
    };

    const recipients = updateData.recipients
      ? {
          ...updateData.recipients,
          targets: [...updateData.recipients.targets],
        }
      : undefined;

    const assignedEmployees =
      recipients?.targets
        ?.filter((target) => target.startsWith('individuals:'))
        .map((target) => target.split(':')[1])
        .filter(Boolean) ?? [];

    const authorName = publishingSettings.authorAttribution
      ? publishingSettings.authorName || 'Current User'
      : 'Company Updates';

    const nowIso = new Date().toISOString();
    const scheduledDateIso = !publishingSettings.publishNow && publishingSettings.scheduledDate
      ? new Date(
          `${publishingSettings.scheduledDate}${
            publishingSettings.scheduledTime ? `T${publishingSettings.scheduledTime}` : 'T09:00'
          }`
        ).toISOString()
      : undefined;

    const isPublishingNow = publishingSettings.publishNow || !scheduledDateIso;
    const status = isPublishingNow ? 'published' : 'scheduled';
    const publishDate = isPublishingNow ? nowIso : scheduledDateIso ?? nowIso;

    const fullUpdateData = {
      ...updateData,
      isPinned: updateData.isPinned ?? false,
      status,
      likes: 0,
      comments: 0,
      views: 0,
      viewerHasLiked: false,
      publishDate,
      scheduledDate: scheduledDateIso,
      publishingSettings,
      recipients,
      assignedEmployees,
      createdBy: 'current-user',
      author: {
        id: 'current-user',
        name: authorName,
        avatar: '',
        role: 'Admin'
      }
    };
    addUpdate(fullUpdateData);
  };

  return {
    updates,
    loading,
    comments: comments.filter(comment => 
      updates.some(update => update.id === comment.updateId)
    ),
    getUpdatesByStatus,
    likeUpdate,
    addComment,
    markAsViewed,
    togglePin,
    deleteUpdate,
    archiveUpdate,
    createUpdate
  };
}
