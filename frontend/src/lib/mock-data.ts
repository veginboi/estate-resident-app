import type {
  Activity,
  BankDetails,
  Bill,
  ChatMessage,
  ChatResident,
  DashboardData,
  EstateMap,
  FamilyMember,
  MapPlot,
  Neighbour,
  Order,
  Payment,
  Product,
  Profile,
  Property,
  Settings,
} from "./types";

// Sample data used until the Laravel API is connected (see src/lib/api.ts).

export const profile: Profile = {
  id: 1,
  residentCode: "LEHN123B",
  name: "David Onyemenam",
  email: "broklyn@gmail.com",
  phone: "+234 810 000 0000",
  about:
    "Resident of LincolnEstate since 2021. I live in Block B with my wife and son, and I'm happy to help neighbours with anything around the estate.",
  avatarUrl: null,
  coverUrl: "/images/house.jpg",
};

export const familyMembers: FamilyMember[] = [
  { id: 1, name: "David Onyemenam", role: "Husband", age: 36, gender: "Male" },
  { id: 2, name: "Grace Onyemenam", role: "Wife", age: 34, gender: "Female" },
  { id: 3, name: "Daniel Onyemenam", role: "Child", age: 8, gender: "Male" },
];

export const properties: Property[] = [
  { id: 1, type: "House", name: "LE B001-SECTION", number: "LHEB001", colour: "Green", details: "8 Bed Room" },
  { id: 2, type: "Car", name: "Lexus", number: "FCT0023JB", colour: "Red", details: "RX350" },
];

export const activities: Activity[] = [
  { id: 1, name: "David Onyemenam", date: "2026-11-11", outAt: "08:30", outWith: "Family", inAt: "18:45", inWith: "Alone" },
  { id: 2, name: "Grace Onyemenam", date: "2026-11-11", outAt: "08:30", outWith: "Family", inAt: "18:45", inWith: "Wife" },
  { id: 3, name: "Daniel Onyemenam", date: "2026-11-11", outAt: "07:15", outWith: "Driver", inAt: "14:20", inWith: "Driver" },
  { id: 4, name: "David Onyemenam", date: "2026-11-10", outAt: "09:05", outWith: "Alone", inAt: "20:10", inWith: "Alone" },
  { id: 5, name: "Grace Onyemenam", date: "2026-11-10", outAt: "11:30", outWith: "Daniel", inAt: null, inWith: null },
];

export const settings: Settings = {
  smsNotifications: true,
  emailNotifications: false,
  allowChat: true,
};

export const dashboard: DashboardData = {
  stats: { neighbors: 4, totalPayments: 20000, familyActivities: 2 },
  reminders: [
    { id: 1, text: "Estate service charge for November is due on the 15th.", time: "09:30", done: false },
    { id: 2, text: "Residents' general meeting at the clubhouse this Saturday.", time: "09:30", done: false },
    { id: 3, text: "Water supply maintenance on Main Avenue, 10am to 2pm.", time: "09:30", done: true },
    { id: 4, text: "Renew your car sticker at the security post.", time: "09:30", done: false },
  ],
  updates: [
    {
      id: 1,
      author: "Estate Admin",
      body: "Police patrols are increasing around the estate this week after reports from neighbouring streets. Please make sure every visitor is registered at the gate.",
      imageUrl: "/images/news.jpg",
      postedAt: "12:30",
    },
  ],
};

const plotRow = (block: string, start: number, xs: number[], y: number, h: number): MapPlot[] =>
  xs.map((x, i) => ({
    id: `${block}${start + i}`,
    label: `${block}${start + i}`,
    kind: "residential",
    x,
    y,
    w: 100,
    h,
  }));

const owners: Record<string, string> = {
  A2: "Mr. Esele Andrew",
  A7: "Mr. Victor Aguh",
  B3: "Mr. Iroha .C",
  C2: "Mrs. Bola Ade",
};

const leftXs = [30, 140, 250, 360];
const rightXs = [530, 640, 750, 860];

export const estateMap: EstateMap = {
  width: 1000,
  height: 640,
  roads: [
    { x: 0, y: 300, w: 1000, h: 40, name: "Main Avenue" },
    { x: 480, y: 0, w: 40, h: 640, name: "Central Close" },
  ],
  plots: ([
    ...plotRow("A", 1, leftXs, 30, 115),
    ...plotRow("A", 5, leftXs, 165, 115),
    ...plotRow("B", 1, rightXs, 30, 115),
    ...plotRow("B", 5, rightXs, 165, 115),
    ...plotRow("C", 1, rightXs, 360, 120),
    ...plotRow("C", 5, rightXs, 500, 120),
    { id: "SEC", label: "Security Post", kind: "security", x: 30, y: 360, w: 100, h: 80, description: "Main gate and visitor registration. Open 24 hours." },
    { id: "PARK", label: "Park", kind: "green", x: 140, y: 360, w: 320, h: 80, description: "Children's playground and walking track." },
    { id: "CLUB", label: "Clubhouse", kind: "amenity", x: 30, y: 460, w: 210, h: 160, description: "Hall for meetings and events, plus the gym and pool." },
    { id: "ADMIN", label: "Estate Office", kind: "amenity", x: 250, y: 460, w: 210, h: 160, description: "Estate management, payments and complaints. Mon–Sat, 8am–5pm." },
  ] as MapPlot[]).map((plot): MapPlot => {
    if (plot.id === "B1") return { ...plot, isMine: true, owner: profile.name, description: "LE B001-SECTION · 8 Bed Room" };
    return owners[plot.id] ? { ...plot, owner: owners[plot.id] } : plot;
  }),
};

// ---- Messages ----

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const me = { id: profile.id, name: profile.name };
const andrew = { id: 2, name: "Mr. Esele Andrew" };
const victor = { id: 3, name: "Mr. Victor Aguh" };
const iroha = { id: 4, name: "Mr. Iroha .C" };
const bola = { id: 5, name: "Mrs. Bola Ade" };

export const neighbours: Neighbour[] = [
  { id: bola.id, name: bola.name, residentCode: "EHN302", plot: "C2" },
  { id: andrew.id, name: andrew.name, residentCode: "EHN102", plot: "A2" },
  { id: iroha.id, name: iroha.name, residentCode: "EHN203", plot: "B3" },
  { id: victor.id, name: victor.name, residentCode: "EHN107", plot: "A7" },
];

export const chatResidents: Record<number, ChatResident> = Object.fromEntries(
  neighbours.map((n) => [n.id, { id: n.id, name: n.name, residentCode: n.residentCode, acceptsMessages: true }]),
);

const msg = (id: number, sender: { id: number; name: string }, body: string, ago: number): ChatMessage => ({
  id,
  body,
  createdAt: minutesAgo(ago),
  sender,
  mine: sender.id === me.id,
});

/** Messages per chat. Chat 1 is the estate chatroom; the others are direct chats keyed by id. */
export const chats: { id: number; residentId: number | null; lastReadId: number; messages: ChatMessage[] }[] = [
  {
    id: 1,
    residentId: null,
    lastReadId: 3,
    messages: [
      msg(1, andrew, "Good morning everyone. Has anyone else lost water pressure on Main Avenue?", 300),
      msg(2, bola, "Yes, since about 7am. The estate office says maintenance ends at 2pm.", 294),
      msg(3, me, "Thanks Bola. Our tank is full if anyone on Block B needs a few buckets.", 285),
      msg(4, iroha, "Reminder: residents' meeting at the clubhouse on Saturday, 4pm.", 160),
      msg(5, victor, "Please slow down on Central Close, children play there in the evenings.", 50),
    ],
  },
  {
    id: 2,
    residentId: victor.id,
    lastReadId: 7,
    messages: [
      msg(6, victor, "Hi David, is the red Lexus FCT0023JB yours? It's blocking my gate a little.", 240),
      msg(7, me, "Sorry Victor, moving it now.", 236),
      msg(8, victor, "No problem, thank you!", 234),
    ],
  },
];

// ---- Finance ----

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthDay = (monthOffset: number, day: number) => {
  const now = new Date();
  return isoDate(new Date(now.getFullYear(), now.getMonth() + monthOffset, day));
};
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const bank: BankDetails = { bankName: "Zenith Bank", accountName: "LincolnEstate Residents Association", accountNumber: "1012345678" };

export const bills: Bill[] = [
  {
    id: 1,
    title: "Security levy (Q4)",
    description: "Quarterly contribution to the estate security team and CCTV maintenance.",
    amount: 15000,
    dueDate: monthDay(0, 0),
    status: "overdue",
    paidAt: null,
    canUploadReceipt: true,
    receipt: null,
  },
  {
    id: 2,
    title: "Waste collection (November)",
    description: null,
    amount: 3500,
    dueDate: monthDay(0, 20),
    status: "pending",
    paidAt: null,
    canUploadReceipt: false,
    receipt: {
      id: 1,
      status: "pending",
      amount: 3500,
      paidOn: isoDate(new Date(Date.now() - 86_400_000)),
      transferReference: "TRF20261111093",
      fileName: "transfer-receipt.jpg",
      submittedAt: daysAgo(1),
      reviewNote: null,
    },
  },
  {
    id: 3,
    title: "Road repairs levy",
    description: "One-off levy for resurfacing Central Close, agreed at the October residents' meeting.",
    amount: 25000,
    dueDate: monthDay(1, 5),
    status: "unpaid",
    paidAt: null,
    canUploadReceipt: true,
    receipt: null,
  },
  {
    id: 4,
    title: "Service charge (November)",
    description: null,
    amount: 10000,
    dueDate: monthDay(0, 15),
    status: "paid",
    paidAt: daysAgo(3),
    canUploadReceipt: false,
    receipt: null,
  },
  {
    id: 5,
    title: "Service charge (October)",
    description: null,
    amount: 10000,
    dueDate: monthDay(-1, 15),
    status: "paid",
    paidAt: daysAgo(31),
    canUploadReceipt: false,
    receipt: null,
  },
];

export const payments: Payment[] = [
  { id: 3, receiptNumber: "LE-000003", description: "Store order ORD-000001", amount: 10000, method: "bank_transfer", paidAt: daysAgo(20), bill: null, order: { id: 1, orderNumber: "ORD-000001" } },
  { id: 2, receiptNumber: "LE-000002", description: "Service charge (November)", amount: 10000, method: "bank_transfer", paidAt: daysAgo(3), bill: { id: 4, title: "Service charge (November)" }, order: null },
  { id: 1, receiptNumber: "LE-000001", description: "Service charge (October)", amount: 10000, method: "bank_transfer", paidAt: daysAgo(31), bill: { id: 5, title: "Service charge (October)" }, order: null },
];

// ---- Store ----

const product = (id: number, name: string, description: string, category: string, price: number, unit: string | null, inStock = true, maxQuantity: number | null = null): Product => ({
  id,
  name,
  description,
  category,
  price,
  unit,
  imageUrl: null,
  inStock,
  maxQuantity,
});

export const products: Product[] = [
  product(1, "Car sticker (2026)", "Windscreen sticker that lets your car through the main gate. One per vehicle.", "Access & Security", 5000, "per car", true, 3),
  product(2, "Gate access tag", "Contactless tag for the pedestrian gate. Replacement for lost tags.", "Access & Security", 7500, "per tag", true, 4),
  product(3, "Visitor pass booklet", "25 pre-signed visitor passes for regular guests and deliveries.", "Access & Security", 2000, "25 passes"),
  product(4, "Cooking gas refill", "Refill delivered and connected by the estate gas vendor.", "Home", 18000, "12.5 kg", true, 2),
  product(5, "Table water", "Sachet water from the estate supplier.", "Home", 600, "per bag", true, 20),
  product(6, "Waste bin (120 L)", "Wheeled bin approved for estate waste collection.", "Home", 25000, null, true, 2),
  product(7, "Estate polo shirt", "Green LincolnEstate polo for residents' events. Sizes S to XXL.", "Merchandise", 8000, null, false),
];

export const orders: Order[] = [
  {
    id: 2,
    orderNumber: "ORD-000002",
    status: "awaiting_payment",
    items: [
      { id: 2, productId: 4, name: "Cooking gas refill", unit: "12.5 kg", unitPrice: 18000, quantity: 1, lineTotal: 18000 },
      { id: 3, productId: 5, name: "Table water", unit: "per bag", unitPrice: 600, quantity: 4, lineTotal: 2400 },
    ],
    total: 20400,
    deliveryMethod: "delivery",
    note: "Please deliver after 4pm.",
    createdAt: daysAgo(0.1),
    paidAt: null,
    canUploadReceipt: true,
    canCancel: true,
    receipt: null,
  },
  {
    id: 1,
    orderNumber: "ORD-000001",
    status: "completed",
    items: [{ id: 1, productId: 1, name: "Car sticker (2026)", unit: "per car", unitPrice: 5000, quantity: 2, lineTotal: 10000 }],
    total: 10000,
    deliveryMethod: "pickup",
    note: null,
    createdAt: daysAgo(21),
    paidAt: daysAgo(20),
    canUploadReceipt: false,
    canCancel: false,
    receipt: null,
  },
];
