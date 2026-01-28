import { logger } from "@/utils/logger";

export type PresenceStatus = "online" | "offline" | "away";

export interface ChatUser {
  id: string;
  name: string;
  title?: string;
  role?: string;
  status?: PresenceStatus;
  avatar?: string;
}

const STORAGE_KEY = "connectflow:chat-users";

export function loadUsers(): ChatUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    logger.warn("Failed to parse stored chat users", {
      error,
      tags: ["warning"],
    });
    return [];
  }
}

export function saveUsers(users: ChatUser[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export function upsertUser(user: ChatUser) {
  const users = loadUsers();
  const index = users.findIndex((item) => item.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  saveUsers(users);
}

export function ensureCurrentUser(user: ChatUser) {
  const users = loadUsers();
  const exists = users.some((item) => item.id === user.id);
  if (!exists) {
    users.unshift(user);
    saveUsers(users);
  }
}
