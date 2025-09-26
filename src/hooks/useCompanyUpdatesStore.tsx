import { create } from 'zustand';
import { CompanyUpdate } from '@/types/companyUpdates';
import { mockCompanyUpdates } from '@/data/mockCompanyUpdates';

interface CompanyUpdatesStore {
  updates: CompanyUpdate[];
  loading: boolean;
  addUpdate: (update: Omit<CompanyUpdate, 'id' | 'createdAt' | 'updatedAt' | 'publishDate'>) => void;
  removeUpdate: (id: string) => void;
  togglePin: (id: string) => void;
  likeUpdate: (id: string) => void;
  incrementViews: (id: string) => void;
  incrementComments: (id: string) => void;
}

export const useCompanyUpdatesStore = create<CompanyUpdatesStore>((set) => ({
  updates: mockCompanyUpdates,
  loading: false,

  addUpdate: (updateData) => set((state) => {
    const newUpdate: CompanyUpdate = {
      ...updateData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishDate: new Date().toISOString()
    };

    return {
      updates: [newUpdate, ...state.updates]
    };
  }),

  removeUpdate: (id) => set((state) => ({
    updates: state.updates.filter(update => update.id !== id)
  })),

  togglePin: (id) => set((state) => ({
    updates: state.updates.map(update =>
      update.id === id ? { ...update, isPinned: !update.isPinned } : update
    )
  })),

  likeUpdate: (id) => set((state) => ({
    updates: state.updates.map(update =>
      update.id === id ? { ...update, likes: update.likes + 1 } : update
    )
  })),

  incrementViews: (id) => set((state) => ({
    updates: state.updates.map(update =>
      update.id === id ? { ...update, views: update.views + 1 } : update
    )
  })),

  incrementComments: (id) => set((state) => ({
    updates: state.updates.map(update =>
      update.id === id ? { ...update, comments: update.comments + 1 } : update
    )
  })),
}));
