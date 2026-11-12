import type {
  Activity,
  DashboardData,
  EstateMap,
  FamilyMember,
  MapPlot,
  Profile,
  Property,
  Settings,
} from "./types";

// Sample data used until the Laravel API is connected (see src/lib/api.ts).
// Kept in step with frontend/src/lib/mock-data.ts so the web and mobile apps demo the same estate.

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
