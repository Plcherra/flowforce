import { create } from 'zustand';
import { CompanyUpdate } from '@/types/companyUpdates';

const STORAGE_KEY = 'connectflow:company-updates';

const loadInitialUpdates = (): CompanyUpdate[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load stored company updates', error);
    return [];
  }
};

const persistUpdates = (updates: CompanyUpdate[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
  } catch (error) {
    console.warn('Failed to persist company updates', error);
  }
};

interface CompanyUpdatesStore {
  updates: CompanyUpdate[];
  loading: boolean;
  addUpdate: (update: Omit<CompanyUpdate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeUpdate: (id: string) => void;
  togglePin: (id: string) => void;
  likeUpdate: (id: string) => void;
  incrementViews: (id: string) => void;
  incrementComments: (id: string) => void;
  updateStatus: (id: string, status: CompanyUpdate['status']) => void;
}

export const useCompanyUpdatesStore = create<CompanyUpdatesStore>((set) => ({
  updates: loadInitialUpdates(),
  loading: false,

  addUpdate: (updateData) => set((state) => {
    const newUpdate: CompanyUpdate = {
      ...updateData,
      id: Date.now().toString(),
      viewerHasLiked: updateData.viewerHasLiked ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishDate: updateData.publishDate ?? new Date().toISOString()
    };

    const updates = [newUpdate, ...state.updates];
    persistUpdates(updates);

    return { updates };
  }),

  removeUpdate: (id) => set((state) => {
    const updates = state.updates.filter(update => update.id !== id);
    persistUpdates(updates);
    return { updates };
  }),

  togglePin: (id) => set((state) => {
    const updates = state.updates.map((update) =>
      update.id === id ? { ...update, isPinned: !update.isPinned } : update
    );
    persistUpdates(updates);
    return { updates };
  }),

  likeUpdate: (id) => set((state) => {
    const updates = state.updates.map((update) => {
      if (update.id !== id) {
        return update;
      }

      if (update.publishingSettings?.engagement?.allowLikes === false) {
        return update;
      }

      const viewerHasLiked = Boolean(update.viewerHasLiked);
      const likes = viewerHasLiked ? Math.max(0, update.likes - 1) : update.likes + 1;

      return {
        ...update,
        likes,
        viewerHasLiked: !viewerHasLiked,
      };
    });
    persistUpdates(updates);
    return { updates };
  }),

  incrementViews: (id) => set((state) => {
    const updates = state.updates.map((update) =>
      update.id === id ? { ...update, views: update.views + 1 } : update
    );
    persistUpdates(updates);
    return { updates };
  }),

  incrementComments: (id) => set((state) => {
    const updates = state.updates.map((update) =>
      update.id === id
        ? {
            ...update,
            comments:
              update.publishingSettings?.engagement?.allowComments === false
                ? update.comments
                : update.comments + 1,
          }
        : update
    );
    persistUpdates(updates);
    return { updates };
  }),

  updateStatus: (id, status) => set((state) => {
    const updates = state.updates.map((update) => {
      if (update.id !== id) {
        return update;
      }

      const updatedAt = new Date().toISOString();
      const isPublishing = status === 'published' && update.status !== 'published';

      return {
        ...update,
        status,
        updatedAt,
        publishDate: isPublishing ? updatedAt : update.publishDate,
      };
    });
    persistUpdates(updates);
    return { updates };
  }),
}));
