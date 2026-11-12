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

export type BillStatus = "unpaid" | "overdue" | "pending" | "paid";

export interface BillReceipt {
  id: number;
  status: "pending" | "approved" | "rejected";
  amount: number;
  paidOn: string; // YYYY-MM-DD
  transferReference: string | null;
  fileName: string;
  submittedAt: string; // ISO 8601
  reviewNote: string | null; // why the estate rejected it
}

export interface Bill {
  id: number;
  title: string;
  description: string | null;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: BillStatus;
  paidAt: string | null;
  canUploadReceipt: boolean;
  receipt: BillReceipt | null; // the latest receipt uploaded for this bill
}

export interface Payment {
  id: number;
  receiptNumber: string; // e.g. LE-000042
  description: string;
  amount: number;
  method: string | null; // e.g. bank_transfer
  paidAt: string; // ISO 8601
  bill: { id: number; title: string } | null;
  order: { id: number; orderNumber: string } | null;
}

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface FinanceSummary {
  outstanding: number;
  openBills: number;
  overdueBills: number;
  awaitingConfirmation: number;
  paidThisYear: number;
  totalPaid: number;
  bank: BankDetails | null; // null until the estate adds its account
}

export interface ReceiptUpload {
  file: File | { uri: string; name: string; type: string }; // a browser File, or a picked file on mobile
  amount: number;
  paidOn: string; // YYYY-MM-DD
  transferReference: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  category: string;
  price: number;
  unit: string | null; // e.g. "per car", "12.5 kg"
  imageUrl: string | null;
  inStock: boolean;
  maxQuantity: number | null; // most you can order at once (stock or per-order limit)
}

export type OrderStatus = "awaiting_payment" | "payment_submitted" | "processing" | "ready" | "completed" | "cancelled";

export interface OrderItem {
  id: number;
  productId: number | null;
  name: string;
  unit: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  orderNumber: string; // e.g. ORD-000012
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  deliveryMethod: "pickup" | "delivery";
  note: string | null;
  createdAt: string;
  paidAt: string | null;
  canUploadReceipt: boolean;
  canCancel: boolean;
  receipt: BillReceipt | null;
}

export interface CartLine {
  productId: number;
  quantity: number;
}
