export type Gender = "Male" | "Female";

export interface Profile {
  id: number;
  residentCode: string;
  name: string;
  email: string;
  phone: string;
  about: string;
  avatarUrl: string | null;
  coverUrl: string | null;
}

export interface FamilyMember {
  id: number;
  name: string;
  role: string; // Husband, Wife, Child, Relative, ...
  age: number;
  gender: Gender;
}

export interface Property {
  id: number;
  type: string; // House, Car, ...
  name: string;
  number: string;
  colour: string;
  details: string;
}

export interface Activity {
  id: number;
  name: string;
  date: string; // YYYY-MM-DD
  outAt: string | null; // e.g. "08:30"
  outWith: string | null;
  inAt: string | null;
  inWith: string | null;
}

export interface Settings {
  smsNotifications: boolean;
  emailNotifications: boolean;
  allowChat: boolean;
}

export interface Reminder {
  id: number;
  text: string;
  time: string;
  done: boolean;
}

export interface EstateUpdate {
  id: number;
  author: string;
  body: string;
  imageUrl: string | null;
  postedAt: string;
}

export interface DashboardData {
  stats: { neighbors: number; totalPayments: number; familyActivities: number };
  reminders: Reminder[];
  updates: EstateUpdate[];
}

export type PlotKind = "residential" | "amenity" | "security" | "green";

export interface MapPlot {
  id: string;
  label: string;
  kind: PlotKind;
  x: number;
  y: number;
  w: number;
  h: number;
  owner?: string;
  isMine?: boolean;
  description?: string;
}

export interface EstateMap {
  width: number;
  height: number;
  roads: { x: number; y: number; w: number; h: number; name?: string }[];
  plots: MapPlot[];
}

export interface ChatResident {
  id: number;
  name: string;
  residentCode: string;
  acceptsMessages: boolean;
}

export interface Conversation {
  id: number;
  type: "estate" | "direct";
  title: string; // "LincolnEstate Chatroom" or the other resident's name
  resident: ChatResident | null; // the other resident in a direct chat
  lastMessage: { body: string; createdAt: string; senderName: string; mine: boolean } | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: number;
  body: string;
  createdAt: string; // ISO 8601
  sender: { id: number; name: string };
  mine: boolean;
}

export interface Neighbour {
  id: number;
  name: string;
  residentCode: string;
  plot: string | null;
}
