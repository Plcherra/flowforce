import { useState, useEffect } from 'react';
import { CompanyUpdate, UpdateComment } from '@/types/companyUpdates';
import { useCompanyUpdatesStore } from './useCompanyUpdatesStore';

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

  const createUpdate = (updateData: Omit<CompanyUpdate, 'id' | 'createdAt' | 'updatedAt' | 'publishDate' | 'status' | 'likes' | 'comments' | 'views' | 'assignedEmployees' | 'createdBy' | 'author'>) => {
    const fullUpdateData = {
      ...updateData,
      status: 'published' as const,
      likes: 0,
      comments: 0,
      views: 0,
      assignedEmployees: [],
      createdBy: 'current-user',
      author: {
        id: 'current-user',
        name: 'Current User',
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
