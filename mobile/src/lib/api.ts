import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import * as mock from "./mock-data";
import type {
  Activity,
  Bill,
  ChatMessage,
  Conversation,
  DashboardData,
  EstateMap,
  FamilyMember,
  FinanceSummary,
  CartLine,
  Neighbour,
  Order,
  Payment,
  Product,
  Profile,
  Property,
  ReceiptUpload,
  Settings,
} from "./types";

/**
 * Every call the mobile app makes to the backend goes through this file. It mirrors
 * frontend/src/lib/api.ts so both apps talk to the same Laravel endpoints.
 *
 * - When EXPO_PUBLIC_API_URL is set (e.g. http://192.168.18.5:8000/api) the calls hit the Laravel API,
 *   authenticated with the Sanctum token saved at login. On a phone, use your computer's network
 *   address, not localhost.
 * - When it isn't set, the calls use in-memory sample data so the app can be built and demoed
 *   without a backend. Changes then last until the app is restarted.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") || undefined;

const TOKEN_KEY = "le_token";

// SecureStore keeps the token in the iOS Keychain / Android Keystore. It isn't available on web.
export const tokenStore = {
  get: async (): Promise<string | null> => {
    try {
      return Platform.OS === "web" ? localStorage.getItem(TOKEN_KEY) : await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: async (token: string | null) => {
    try {
      if (Platform.OS === "web") {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
      } else if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
      else await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

// Called when the API rejects the saved token, so the app can send the resident back to login.
let onUnauthorized: () => void = () => undefined;
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const json = await requestJson<{ data?: T } & T>(path, init);
  return (json?.data ?? json) as T; // Laravel API resources wrap payloads in `data`
}

/** Like request(), but returns the whole JSON body (for responses with `meta`). */
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        // Let fetch set the multipart boundary for file uploads.
        ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("Can't reach the estate server. Check your internet connection and try again.");
  }
  if (res.status === 401 && !path.startsWith("/auth/")) {
    await tokenStore.set(null);
    onUnauthorized();
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

const receiptForm = (data: ReceiptUpload) => {
  const form = new FormData();
  // React Native uploads a picked file from its uri.
  form.append("receipt", data.file as unknown as Blob);
  form.append("amount", String(data.amount));
  form.append("paid_on", data.paidOn);
  if (data.transferReference.trim()) form.append("transfer_reference", data.transferReference.trim());
  return form;
};

// ---- in-memory store for mock mode ----
const clone = <T,>(value: T): T => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
const store = {
  profile: clone(mock.profile),
  family: clone(mock.familyMembers),
  properties: clone(mock.properties),
  settings: clone(mock.settings),
};
let nextId = 100;
const delay = <T,>(value: T) => new Promise<T>((r) => setTimeout(() => r(clone(value)), 200));

export const isMockMode = !API_URL;

// In-memory bills for mock mode.
const financeStore = { bills: clone(mock.bills) };
const mockFinance = {
  summary: (): FinanceSummary => {
    const open = financeStore.bills.filter((b) => b.status !== "paid");
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    return {
      outstanding: open.reduce((n, b) => n + b.amount, 0),
      openBills: open.length,
      overdueBills: open.filter((b) => b.status === "overdue").length,
      awaitingConfirmation: open.filter((b) => b.status === "pending").length,
      paidThisYear: mock.payments.filter((p) => p.paidAt >= yearStart).reduce((n, p) => n + p.amount, 0),
      totalPaid: mock.payments.reduce((n, p) => n + p.amount, 0),
      bank: mock.bank,
    };
  },
  upload: (billId: number, data: ReceiptUpload): Bill => {
    const bill = financeStore.bills.find((b) => b.id === billId);
    if (!bill) throw new Error("This bill doesn't exist.");
    if (!bill.canUploadReceipt) throw new Error("A receipt for this bill is already waiting for confirmation.");
    Object.assign(bill, {
      status: "pending",
      canUploadReceipt: false,
      receipt: {
        id: nextId++,
        status: "pending",
        amount: data.amount,
        paidOn: data.paidOn,
        transferReference: data.transferReference.trim() || null,
        fileName: "name" in data.file ? data.file.name : "receipt",
        submittedAt: new Date().toISOString(),
        reviewNote: null,
      },
    } satisfies Partial<Bill>);
    return bill;
  },
};

// In-memory shop for mock mode.
const storeStore = { orders: clone(mock.orders) };
const mockStore = {
  products: ({ category, q }: { category?: string; q?: string }) => {
    const needle = q?.trim().toLowerCase() ?? "";
    return {
      products: mock.products.filter(
        (p) => (!category || p.category === category) && (!needle || `${p.name} ${p.description}`.toLowerCase().includes(needle)),
      ),
      categories: [...new Set(mock.products.map((p) => p.category))].sort(),
    };
  },
  place: ({ items, deliveryMethod, note }: { items: CartLine[]; deliveryMethod: "pickup" | "delivery"; note: string }): Order => {
    if (!items.length) throw new Error("Your cart is empty.");
    const lines = items.map((line) => {
      const p = mock.products.find((x) => x.id === line.productId);
      if (!p || !p.inStock) throw new Error("One of the items in your cart is no longer for sale.");
      if (p.maxQuantity !== null && line.quantity > p.maxQuantity) throw new Error(`You can order at most ${p.maxQuantity} of ${p.name}.`);
      return { id: nextId++, productId: p.id, name: p.name, unit: p.unit, unitPrice: p.price, quantity: line.quantity, lineTotal: p.price * line.quantity };
    });
    const id = nextId++;
    const order: Order = {
      id,
      orderNumber: `ORD-${String(id).padStart(6, "0")}`,
      status: "awaiting_payment",
      items: lines,
      total: lines.reduce((n, l) => n + l.lineTotal, 0),
      deliveryMethod,
      note: note.trim() || null,
      createdAt: new Date().toISOString(),
      paidAt: null,
      canUploadReceipt: true,
      canCancel: true,
      receipt: null,
    };
    storeStore.orders.unshift(order);
    return order;
  },
  cancel: (id: number): Order => {
    const order = storeStore.orders.find((o) => o.id === id);
    if (!order || !order.canCancel) throw new Error("This order can't be cancelled.");
    Object.assign(order, { status: "cancelled", canCancel: false, canUploadReceipt: false } satisfies Partial<Order>);
    return order;
  },
  upload: (id: number, data: ReceiptUpload): Order => {
    const order = storeStore.orders.find((o) => o.id === id);
    if (!order || !order.canUploadReceipt) throw new Error("A receipt for this order is already waiting for confirmation.");
    Object.assign(order, {
      status: "payment_submitted",
      canCancel: false,
      canUploadReceipt: false,
      receipt: {
        id: nextId++,
        status: "pending",
        amount: data.amount,
        paidOn: data.paidOn,
        transferReference: data.transferReference.trim() || null,
        fileName: "name" in data.file ? data.file.name : "receipt",
        submittedAt: new Date().toISOString(),
        reviewNote: null,
      },
    } satisfies Partial<Order>);
    return order;
  },
};

// In-memory chats for mock mode.
const chatStore = clone(mock.chats);
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


/** Turns an image path from the API (or the sample data) into something <Image> can show. */
const BUNDLED_IMAGES: Record<string, number> = {
  "/images/house.jpg": require("../../assets/images/house.jpg"),
  "/images/news.jpg": require("../../assets/images/news.jpg"),
};
export function imageSource(url: string | null | undefined) {
  if (!url) return null;
  if (BUNDLED_IMAGES[url] && isMockMode) return BUNDLED_IMAGES[url];
  const apiOrigin = API_URL?.replace(/\/api$/, "");
  if (/^https?:\/\//.test(url)) {
    // Laravel builds storage URLs from APP_URL, which is often localhost. A phone can't reach
    // that, so point those at the same host the app uses for the API.
    return { uri: apiOrigin ? url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, apiOrigin) : url };
  }
  // Relative paths like /storage/covers/x.jpg are served by the Laravel host, not under /api.
  return apiOrigin ? { uri: `${apiOrigin}${url}` } : BUNDLED_IMAGES[url] ?? null;
}

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<void> => {
    if (!API_URL) {
      await tokenStore.set("demo");
      return delay(undefined);
    }
    const res = await request<{ token: string }>("/auth/login", {
      method: "POST",
      body: body({ email, password, device_name: `resident-${Platform.OS}` }),
    });
    await tokenStore.set(res.token);
  },
  register: async (data: { name: string; email: string; phone: string; password: string; passwordConfirmation: string }): Promise<void> => {
    if (!API_URL) {
      await tokenStore.set("demo");
      return delay(undefined);
    }
    const res = await request<{ token: string }>("/auth/register", {
      method: "POST",
      body: body({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        password: data.password,
        password_confirmation: data.passwordConfirmation,
        device_name: `resident-${Platform.OS}`,
      }),
    });
    await tokenStore.set(res.token);
  },
  logout: async (): Promise<void> => {
    if (API_URL) await request("/auth/logout", { method: "POST" }).catch(() => undefined);
    await tokenStore.set(null);
  },

  getDashboard: (): Promise<DashboardData> =>
    API_URL ? request("/resident/dashboard") : delay(mock.dashboard),

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

  // Finance
  getFinanceSummary: (): Promise<FinanceSummary> => (API_URL ? request("/resident/finance") : delay(mockFinance.summary())),
  getBills: (status?: "open" | "paid"): Promise<Bill[]> =>
    API_URL
      ? request(`/resident/bills${status ? `?status=${status}` : ""}`)
      : delay(financeStore.bills.filter((b) => !status || (status === "paid") === (b.status === "paid"))),
  /** Sends a bank transfer receipt for a bill. Returns the updated bill ("Awaiting confirmation"). */
  uploadReceipt: (billId: number, data: ReceiptUpload): Promise<Bill> =>
    API_URL
      ? request(`/resident/bills/${billId}/receipts`, { method: "POST", body: receiptForm(data) })
      : delay(mockFinance.upload(billId, data)),
  getPayments: (): Promise<Payment[]> => (API_URL ? request("/resident/payments") : delay(mock.payments)),

  // Store
  getProducts: async (filters: { category?: string; q?: string } = {}): Promise<{ products: Product[]; categories: string[] }> => {
    if (!API_URL) return delay(mockStore.products(filters));
    const query = new URLSearchParams();
    if (filters.category) query.set("category", filters.category);
    if (filters.q?.trim()) query.set("q", filters.q.trim());
    const qs = query.toString();
    const res = await requestJson<{ data: Product[]; meta?: { categories?: string[] } }>(`/resident/store/products${qs ? `?${qs}` : ""}`);
    return { products: res.data, categories: res.meta?.categories ?? [] };
  },
  placeOrder: (data: { items: CartLine[]; deliveryMethod: "pickup" | "delivery"; note: string }): Promise<Order> =>
    API_URL
      ? request("/resident/store/orders", { method: "POST", body: body({ ...data, note: data.note.trim() || null }) })
      : delay(mockStore.place(data)),
  getOrders: (): Promise<Order[]> => (API_URL ? request("/resident/store/orders") : delay(storeStore.orders)),
  cancelOrder: (id: number): Promise<Order> =>
    API_URL ? request(`/resident/store/orders/${id}/cancel`, { method: "POST" }) : delay(mockStore.cancel(id)),
  uploadOrderReceipt: (id: number, data: ReceiptUpload): Promise<Order> =>
    API_URL
      ? request(`/resident/store/orders/${id}/receipts`, { method: "POST", body: receiptForm(data) })
      : delay(mockStore.upload(id, data)),

  // Estate map
  getEstateMap: (): Promise<EstateMap> => (API_URL ? request("/estate/map") : delay(mock.estateMap)),
};
