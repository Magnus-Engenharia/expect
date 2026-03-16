export interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member" | "viewer";
  joinedAt: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: "month";
  features: string[];
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  createdAt: string;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
}

export interface UserProfile {
  name: string;
  email: string;
  role: "admin" | "member";
  avatarUrl: string;
  organization: string;
}

export interface ActivityItem {
  id: string;
  message: string;
  timestamp: string;
}

export const CURRENT_USER: UserProfile = {
  name: "Alice Johnson",
  email: "alice@teamforge.io",
  role: "admin",
  avatarUrl: "https://i.pravatar.cc/150?u=alice",
  organization: "TeamForge Inc",
};

export const INITIAL_MEMBERS: Member[] = [
  {
    id: "m1",
    name: "Alice Johnson",
    email: "alice@teamforge.io",
    role: "admin",
    joinedAt: "2024-01-15",
  },
  {
    id: "m2",
    name: "Bob Martinez",
    email: "bob@teamforge.io",
    role: "member",
    joinedAt: "2024-02-20",
  },
  {
    id: "m3",
    name: "Carol Chen",
    email: "carol@teamforge.io",
    role: "member",
    joinedAt: "2024-03-10",
  },
  {
    id: "m4",
    name: "David Kim",
    email: "david@teamforge.io",
    role: "viewer",
    joinedAt: "2024-04-05",
  },
  {
    id: "m5",
    name: "Eva Novak",
    email: "eva@teamforge.io",
    role: "member",
    joinedAt: "2024-05-18",
  },
  {
    id: "m6",
    name: "Frank Osei",
    email: "frank@teamforge.io",
    role: "viewer",
    joinedAt: "2024-06-22",
  },
];

const PRO_FEATURES = [
  "Up to 20 team members",
  "Advanced analytics",
  "Priority support",
  "Custom feature flags",
  "API access",
];

const ENTERPRISE_FEATURES = [
  "Unlimited team members",
  "Advanced analytics",
  "Dedicated support",
  "Custom feature flags",
  "API access",
  "SSO / SAML",
  "Audit logs",
  "SLA guarantee",
];

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "month",
    features: ["Up to 5 team members", "Basic analytics", "Community support"],
  },
  { id: "pro", name: "Pro", price: 29, interval: "month", features: PRO_FEATURES },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    interval: "month",
    features: ENTERPRISE_FEATURES,
  },
];

export const INITIAL_FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: "ff1",
    name: "Dark Mode",
    description: "Enable dark color scheme across the app",
    enabled: true,
    rolloutPercentage: 100,
    createdAt: "2024-01-20",
  },
  {
    id: "ff2",
    name: "AI Summaries",
    description: "Auto-generate meeting summaries with AI",
    enabled: true,
    rolloutPercentage: 50,
    createdAt: "2024-03-15",
  },
  {
    id: "ff3",
    name: "Kanban Board",
    description: "Visual task board with drag-and-drop",
    enabled: false,
    rolloutPercentage: 0,
    createdAt: "2024-04-01",
  },
  {
    id: "ff4",
    name: "Live Collaboration",
    description: "Real-time editing and presence indicators",
    enabled: true,
    rolloutPercentage: 25,
    createdAt: "2024-05-10",
  },
  {
    id: "ff5",
    name: "Export to PDF",
    description: "Export reports and dashboards as PDF files",
    enabled: false,
    rolloutPercentage: 0,
    createdAt: "2024-06-01",
  },
];

export const INITIAL_INVOICES: Invoice[] = [
  { id: "inv1", date: "2024-06-01", amount: 29, status: "paid" },
  { id: "inv2", date: "2024-05-01", amount: 29, status: "paid" },
  { id: "inv3", date: "2024-04-01", amount: 29, status: "paid" },
  { id: "inv4", date: "2024-03-01", amount: 29, status: "paid" },
  { id: "inv5", date: "2024-02-01", amount: 29, status: "paid" },
  { id: "inv6", date: "2024-01-01", amount: 29, status: "paid" },
  { id: "inv7", date: "2023-12-01", amount: 0, status: "paid" },
  { id: "inv8", date: "2023-11-01", amount: 0, status: "paid" },
];

export const RECENT_ACTIVITY: ActivityItem[] = [
  { id: "a1", message: "Alice updated feature flag Dark Mode", timestamp: "2024-06-22T14:30:00Z" },
  { id: "a2", message: "Frank Osei was added as Viewer", timestamp: "2024-06-22T10:15:00Z" },
  {
    id: "a3",
    message: "Eva enabled AI Summaries for 50% rollout",
    timestamp: "2024-06-20T09:00:00Z",
  },
  { id: "a4", message: "Bob changed plan from Free to Pro", timestamp: "2024-06-18T16:45:00Z" },
  {
    id: "a5",
    message: "Carol created feature flag Export to PDF",
    timestamp: "2024-06-15T11:30:00Z",
  },
];

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

export const generateMemberId = (): string => `m${Date.now()}`;
export const generateFlagId = (): string => `ff${Date.now()}`;
