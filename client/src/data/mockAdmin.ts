// MOCK DATA: replace with API later

export const USER_ROLES = ['Registered', 'Moderator'] as const;
export type UserRoleName = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['Active', 'Suspended', 'Banned'] as const;
export type UserAccountStatus = (typeof USER_STATUSES)[number];

export const SUSPEND_DURATIONS = ['7 days', '30 days', '90 days'] as const;

export interface AdminUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRoleName;
  status: UserAccountStatus;
  joinedDate: string;
}

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'u-01',
    fullName: 'Sarah Lim',
    username: 'sarah_lim',
    email: 'sarah.lim@example.com',
    role: 'Moderator',
    status: 'Active',
    joinedDate: '2025-11-04',
  },
  {
    id: 'u-02',
    fullName: 'Maya Chen',
    username: 'maya_chen',
    email: 'maya.chen@example.com',
    role: 'Registered',
    status: 'Active',
    joinedDate: '2026-01-19',
  },
  {
    id: 'u-03',
    fullName: 'Marcus Chen',
    username: 'marcus_chen',
    email: 'marcus.chen@example.com',
    role: 'Moderator',
    status: 'Active',
    joinedDate: '2025-12-08',
  },
  {
    id: 'u-04',
    fullName: 'Jonas Weber',
    username: 'jonas_weber',
    email: 'jonas.weber@example.com',
    role: 'Registered',
    status: 'Active',
    joinedDate: '2026-02-27',
  },
  {
    id: 'u-05',
    fullName: 'Priya Nair',
    username: 'priya_nair',
    email: 'priya.nair@example.com',
    role: 'Registered',
    status: 'Active',
    joinedDate: '2026-03-15',
  },
  {
    id: 'u-06',
    fullName: 'Elena Petrova',
    username: 'elena_petrova',
    email: 'elena.petrova@example.com',
    role: 'Registered',
    status: 'Suspended',
    joinedDate: '2026-04-02',
  },
  {
    id: 'u-07',
    fullName: 'David Kim',
    username: 'david_kim',
    email: 'david.kim@example.com',
    role: 'Registered',
    status: 'Active',
    joinedDate: '2026-05-21',
  },
  {
    id: 'u-08',
    fullName: 'Fatima Hassan',
    username: 'fatima_hassan',
    email: 'fatima.hassan@example.com',
    role: 'Moderator',
    status: 'Active',
    joinedDate: '2026-06-09',
  },
  {
    id: 'u-09',
    fullName: 'Alex Morgan',
    username: 'alex_morgan',
    email: 'alex.morgan@example.com',
    role: 'Registered',
    status: 'Active',
    joinedDate: '2026-07-30',
  },
  {
    id: 'u-10',
    fullName: 'Sofia Garcia',
    username: 'sofia_garcia',
    email: 'sofia.garcia@example.com',
    role: 'Registered',
    status: 'Active',
    joinedDate: '2026-08-18',
  },
  {
    id: 'u-11',
    fullName: 'Anna Kowalski',
    username: 'anna_kowalski',
    email: 'anna.kowalski@example.com',
    role: 'Registered',
    status: 'Active',
    joinedDate: '2026-09-11',
  },
  {
    id: 'u-12',
    fullName: 'Growth Hacker',
    username: 'growth_hacker_99',
    email: 'growth99@example.com',
    role: 'Registered',
    status: 'Banned',
    joinedDate: '2026-10-01',
  },
];

export interface NewUsersPoint {
  week: string;
  count: number;
}

export const NEW_USERS_PER_WEEK: NewUsersPoint[] = [
  { week: 'Aug 25', count: 14 },
  { week: 'Sep 1', count: 22 },
  { week: 'Sep 8', count: 18 },
  { week: 'Sep 15', count: 31 },
  { week: 'Sep 22', count: 27 },
  { week: 'Sep 29', count: 35 },
  { week: 'Oct 6', count: 29 },
  { week: 'Oct 13', count: 41 },
];

export interface SystemSettings {
  maxFileSizeMb: number;
  maxAttachments: number;
  allowedFileTypes: string;
  sessionTimeoutMinutes: number;
  minPasswordLength: number;
  spamThreshold: number;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  maxFileSizeMb: 10,
  maxAttachments: 3,
  allowedFileTypes: '.txt, .log, .pdf, .png, .jpg, .zip',
  sessionTimeoutMinutes: 60,
  minPasswordLength: 12,
  spamThreshold: 5,
};

export const AUDIT_ACTIONS = [
  'Login',
  'Logout',
  'Report Created',
  'Report Resolved',
  'Content Hidden',
  'Question Approved',
  'Question Rejected',
  'Role Changed',
  'User Suspended',
  'Settings Updated',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditResult = 'Success' | 'Failure';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: AuditAction;
  target: string;
  ip: string;
  result: AuditResult;
}

export const AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'a-01',
    timestamp: '2026-10-17T09:24:00',
    actor: 'sarah_lim',
    action: 'Content Hidden',
    target: 'Perspective: Use a paid Discord community for architecture advice',
    ip: '10.0.4.18',
    result: 'Success',
  },
  {
    id: 'a-02',
    timestamp: '2026-10-17T09:18:00',
    actor: 'sarah_lim',
    action: 'Report Resolved',
    target: 'Report r-1001',
    ip: '10.0.4.18',
    result: 'Success',
  },
  {
    id: 'a-03',
    timestamp: '2026-10-17T08:55:00',
    actor: 'marcus_chen',
    action: 'Question Approved',
    target: 'Question: Handling Database Connection Pool Exhaustion',
    ip: '10.0.4.22',
    result: 'Success',
  },
  {
    id: 'a-04',
    timestamp: '2026-10-16T17:41:00',
    actor: 'fatima_hassan',
    action: 'User Suspended',
    target: 'User: elena_petrova (30 days)',
    ip: '10.0.7.9',
    result: 'Success',
  },
  {
    id: 'a-05',
    timestamp: '2026-10-16T16:02:00',
    actor: 'jonas_weber',
    action: 'Report Created',
    target: 'Perspective: JWT is always better than server-side sessions',
    ip: '192.168.1.44',
    result: 'Success',
  },
  {
    id: 'a-06',
    timestamp: '2026-10-16T14:37:00',
    actor: 'sarah_lim',
    action: 'Settings Updated',
    target: 'System settings: max attachments 3',
    ip: '10.0.4.18',
    result: 'Success',
  },
  {
    id: 'a-07',
    timestamp: '2026-10-16T11:05:00',
    actor: 'growth_hacker_99',
    action: 'Login',
    target: 'Account: growth_hacker_99',
    ip: '203.0.113.77',
    result: 'Failure',
  },
  {
    id: 'a-08',
    timestamp: '2026-10-15T18:22:00',
    actor: 'marcus_chen',
    action: 'Role Changed',
    target: 'User: fatima_hassan to Moderator',
    ip: '10.0.4.22',
    result: 'Success',
  },
  {
    id: 'a-09',
    timestamp: '2026-10-15T15:48:00',
    actor: 'maya_chen',
    action: 'Report Created',
    target: 'Topic: How do I get into someone else\'s network?',
    ip: '192.168.1.61',
    result: 'Success',
  },
  {
    id: 'a-10',
    timestamp: '2026-10-15T10:14:00',
    actor: 'sarah_lim',
    action: 'Question Rejected',
    target: 'Question: Best laptop for coding in 2026',
    ip: '10.0.4.18',
    result: 'Success',
  },
  {
    id: 'a-11',
    timestamp: '2026-10-14T20:03:00',
    actor: 'alex_morgan',
    action: 'Login',
    target: 'Account: alex_morgan',
    ip: '192.168.1.88',
    result: 'Success',
  },
  {
    id: 'a-12',
    timestamp: '2026-10-14T13:29:00',
    actor: 'fatima_hassan',
    action: 'Content Hidden',
    target: 'Topic: React state management libraries compared',
    ip: '10.0.7.9',
    result: 'Success',
  },
  {
    id: 'a-13',
    timestamp: '2026-10-14T09:41:00',
    actor: 'priya_nair',
    action: 'Report Created',
    target: 'Topic: What is the best way to scale Node.js?',
    ip: '192.168.1.52',
    result: 'Success',
  },
  {
    id: 'a-14',
    timestamp: '2026-10-13T16:57:00',
    actor: 'marcus_chen',
    action: 'Logout',
    target: 'Account: marcus_chen',
    ip: '10.0.4.22',
    result: 'Success',
  },
  {
    id: 'a-15',
    timestamp: '2026-10-13T11:12:00',
    actor: 'sofia_garcia',
    action: 'Login',
    target: 'Account: sofia_garcia',
    ip: '192.168.1.73',
    result: 'Failure',
  },
  {
    id: 'a-16',
    timestamp: '2026-10-12T19:35:00',
    actor: 'sarah_lim',
    action: 'Report Resolved',
    target: 'Report r-1007',
    ip: '10.0.4.18',
    result: 'Success',
  },
  {
    id: 'a-17',
    timestamp: '2026-10-12T08:47:00',
    actor: 'anna_kowalski',
    action: 'Question Approved',
    target: 'Question: Contract Testing with Pact',
    ip: '192.168.1.31',
    result: 'Success',
  },
  {
    id: 'a-18',
    timestamp: '2026-10-11T14:06:00',
    actor: 'david_kim',
    action: 'Report Created',
    target: 'Perspective: Zero-downtime migrations with expand and contract',
    ip: '192.168.1.19',
    result: 'Success',
  },
];
