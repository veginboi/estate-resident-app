import * as mock from "./mock-data";
import type {
  Activity,
  ChatMessage,
  Conversation,
  DashboardData,
  EstateMap,
  FamilyMember,
  Neighbour,
  Profile,
  Property,
  Settings,
} from "./types";

/**
 * Every call the resident app makes to the backend goes through this file.
 *
 * - When NEXT_PUBLIC_API_URL is set (e.g. http://localhost:8000/api) the calls hit the Laravel API,
 *   authenticated with the Sanctum token saved at login.
 * - When it isn't set, the calls use in-memory sample data so the UI can be built and demoed
 *   without a backend. Changes then last until the page is reloaded.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const TOKEN_KEY = "le_token";

export const auth = {
  getToken: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken: (token: string | null) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const json = await requestJson<{ data?: T } & T>(path, init);
  return (json?.data ?? json) as T; // Laravel API resources wrap payloads in `data`
}

/** Like request(), but returns the whole JSON body (for responses with `meta`). */
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = auth.getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401 && !path.startsWith("/auth/")) {
    auth.setToken(null);
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Your session has expired. Please log in again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const firstError = body?.errors && (Object.values(body.errors)[0] as string[] | undefined)?.[0];
    throw new Error(firstError ?? body?.message ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const body = (data: unknown) => JSON.stringify(data);

// ---- in-memory store for mock mode ----
const store = {
  profile: structuredClone(mock.profile),
  family: structuredClone(mock.familyMembers),
  properties: structuredClone(mock.properties),
  settings: structuredClone(mock.settings),
};
let nextId = 100;
const delay = <T,>(value: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(value)), 200));

export const isMockMode = !API_URL;

// In-memory chats for mock mode.
const chatStore = structuredClone(mock.chats);
const mockChat = {
  list: (includeEmpty = false): Conversation[] =>
    chatStore
      .filter((c) => includeEmpty || c.residentId === null || c.messages.length > 0)
      .map((c): Conversation => {
        const last = c.messages.at(-1);
        return {
          id: c.id,
          type: c.residentId === null ? "estate" : "direct",
          title: c.residentId === null ? "LincolnEstate Chatroom" : mock.chatResidents[c.residentId].name,
          resident: c.residentId === null ? null : mock.chatResidents[c.residentId],
          lastMessage: last ? { body: last.body, createdAt: last.createdAt, senderName: last.sender.name, mine: last.mine } : null,
          unreadCount: c.messages.filter((m) => !m.mine && m.id > c.lastReadId).length,
        };
      })
      .sort((a, b) => (a.type === "estate" ? -1 : b.type === "estate" ? 1 : (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? ""))),
  start: (residentId: number): Conversation => {
    let chat = chatStore.find((c) => c.residentId === residentId);
    if (!chat) {
      chat = { id: nextId++, residentId, lastReadId: 0, messages: [] };
      chatStore.push(chat);
    }
    return mockChat.list(true).find((c) => c.id === chat.id)!;
  },
  messages: (id: number, { after, before }: { after?: number; before?: number }) => {
    const chat = chatStore.find((c) => c.id === id);
    if (!chat) throw new Error("This chat doesn't exist.");
    const list = chat.messages.filter((m) => (after === undefined || m.id > after) && (before === undefined || m.id < before));
    if (before === undefined && list.length) chat.lastReadId = Math.max(chat.lastReadId, list.at(-1)!.id);
    return { messages: list, hasMore: false };
  },
  send: (id: number, text: string): ChatMessage => {
    const chat = chatStore.find((c) => c.id === id);
    if (!chat) throw new Error("This chat doesn't exist.");
    const message: ChatMessage = {
      id: nextId++,
      body: text.trim(),
      createdAt: new Date().toISOString(),
      sender: { id: mock.profile.id, name: mock.profile.name },
      mine: true,
    };
    chat.messages.push(message);
    chat.lastReadId = message.id;
    return message;
  },
};

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<void> => {
    if (!API_URL) return delay(undefined);
    const res = await request<{ token: string }>("/auth/login", {
      method: "POST",
      body: body({ email, password, device_name: "resident-web" }),
    });
    auth.setToken(res.token);
  },
  register: async (data: { name: string; email: string; phone: string; password: string; passwordConfirmation: string }): Promise<void> => {
    if (!API_URL) return delay(undefined);
    const res = await request<{ token: string }>("/auth/register", {
      method: "POST",
      body: body({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        password: data.password,
        password_confirmation: data.passwordConfirmation,
        device_name: "resident-web",
      }),
    });
    auth.setToken(res.token);
  },
  logout: async (): Promise<void> => {
    if (API_URL) await request("/auth/logout", { method: "POST" }).catch(() => undefined);
    auth.setToken(null);
  },

  getDashboard: (): Promise<DashboardData> =>
    API_URL
      ? request("/resident/dashboard")
      : delay({ ...mock.dashboard, stats: { ...mock.dashboard.stats } }),

  setReminderDone: (id: number, done: boolean): Promise<void> =>
    API_URL ? request(`/resident/reminders/${id}`, { method: "PATCH", body: body({ done }) }) : delay(undefined),

  sendEmergencyAlert: (): Promise<void> =>
    API_URL ? request("/resident/emergency-alerts", { method: "POST" }) : delay(undefined),

  // Profile + About
  getProfile: (): Promise<Profile> => (API_URL ? request("/resident/profile") : delay(store.profile)),
  updateProfile: (data: Partial<Pick<Profile, "name" | "phone" | "about">>): Promise<Profile> => {
    if (API_URL) return request("/resident/profile", { method: "PUT", body: body(data) });
    store.profile = { ...store.profile, ...data };
    return delay(store.profile);
  },

  // Family members
  getFamilyMembers: (): Promise<FamilyMember[]> =>
    API_URL ? request("/resident/family-members") : delay(store.family),
  createFamilyMember: (data: Omit<FamilyMember, "id">): Promise<FamilyMember> => {
    if (API_URL) return request("/resident/family-members", { method: "POST", body: body(data) });
    const member = { ...data, id: nextId++ };
    store.family.push(member);
    return delay(member);
  },
  updateFamilyMember: (id: number, data: Omit<FamilyMember, "id">): Promise<FamilyMember> => {
    if (API_URL) return request(`/resident/family-members/${id}`, { method: "PUT", body: body(data) });
    store.family = store.family.map((m) => (m.id === id ? { ...data, id } : m));
    return delay({ ...data, id });
  },
  deleteFamilyMember: (id: number): Promise<void> => {
    if (API_URL) return request(`/resident/family-members/${id}`, { method: "DELETE" });
    store.family = store.family.filter((m) => m.id !== id);
    return delay(undefined);
  },

  // Properties
  getProperties: (): Promise<Property[]> => (API_URL ? request("/resident/properties") : delay(store.properties)),
  createProperty: (data: Omit<Property, "id">): Promise<Property> => {
    if (API_URL) return request("/resident/properties", { method: "POST", body: body(data) });
    const property = { ...data, id: nextId++ };
    store.properties.push(property);
    return delay(property);
  },
  updateProperty: (id: number, data: Omit<Property, "id">): Promise<Property> => {
    if (API_URL) return request(`/resident/properties/${id}`, { method: "PUT", body: body(data) });
    store.properties = store.properties.map((p) => (p.id === id ? { ...data, id } : p));
    return delay({ ...data, id });
  },
  deleteProperty: (id: number): Promise<void> => {
    if (API_URL) return request(`/resident/properties/${id}`, { method: "DELETE" });
    store.properties = store.properties.filter((p) => p.id !== id);
    return delay(undefined);
  },

  // Activity
  getActivities: (date?: string): Promise<Activity[]> =>
    API_URL
      ? request(`/resident/activities${date ? `?date=${date}` : ""}`)
      : delay(mock.activities.filter((a) => !date || a.date === date)),

  // Settings
  getSettings: (): Promise<Settings> => (API_URL ? request("/resident/settings") : delay(store.settings)),
  updateSettings: (data: Settings): Promise<Settings> => {
    if (API_URL) return request("/resident/settings", { method: "PUT", body: body(data) });
    store.settings = { ...data };
    return delay(store.settings);
  },
  changePassword: (data: { currentPassword: string; password: string; passwordConfirmation: string }): Promise<void> =>
    API_URL
      ? request("/resident/password", {
          method: "PUT",
          body: body({
            current_password: data.currentPassword,
            password: data.password,
            password_confirmation: data.passwordConfirmation,
          }),
        })
      : delay(undefined),

  // Messages
  getConversations: (): Promise<Conversation[]> =>
    API_URL ? request("/resident/conversations") : delay(mockChat.list()),
  getConversation: (id: number): Promise<Conversation> => {
    if (API_URL) return request(`/resident/conversations/${id}`);
    const found = mockChat.list(true).find((c) => c.id === id);
    return found ? delay(found) : Promise.reject(new Error("This chat doesn't exist."));
  },
  /** Opens the one-to-one chat with a neighbour, starting it if needed. */
  startConversation: (residentId: number): Promise<Conversation> =>
    API_URL
      ? request("/resident/conversations", { method: "POST", body: body({ residentId }) })
      : delay(mockChat.start(residentId)),
  /** Latest messages, or only newer (`after`) / older (`before`) ones. Loading the latest marks them read. */
  getMessages: async (id: number, opts: { after?: number; before?: number } = {}): Promise<{ messages: ChatMessage[]; hasMore: boolean }> => {
    if (!API_URL) return delay(mockChat.messages(id, opts));
    const query = new URLSearchParams();
    if (opts.after !== undefined) query.set("after", String(opts.after));
    if (opts.before !== undefined) query.set("before", String(opts.before));
    const qs = query.toString();
    const res = await requestJson<{ data: ChatMessage[]; meta?: { hasMore?: boolean } }>(
      `/resident/conversations/${id}/messages${qs ? `?${qs}` : ""}`,
    );
    return { messages: res.data, hasMore: !!res.meta?.hasMore };
  },
  sendMessage: (id: number, text: string): Promise<ChatMessage> =>
    API_URL
      ? request(`/resident/conversations/${id}/messages`, { method: "POST", body: body({ body: text }) })
      : delay(mockChat.send(id, text)),
  getUnreadCount: async (): Promise<number> => {
    if (!API_URL) return mockChat.list().reduce((n, c) => n + c.unreadCount, 0);
    const res = await request<{ count: number }>("/resident/conversations/unread");
    return res.count;
  },
  /** Residents who accept messages, optionally filtered by name or resident code. */
  getNeighbours: (q = ""): Promise<Neighbour[]> => {
    if (API_URL) return request(`/resident/neighbours${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
    const needle = q.trim().toLowerCase();
    return delay(mock.neighbours.filter((n) => !needle || `${n.name} ${n.residentCode}`.toLowerCase().includes(needle)));
  },

  // Estate map
  getEstateMap: (): Promise<EstateMap> => (API_URL ? request("/estate/map") : delay(mock.estateMap)),
};
