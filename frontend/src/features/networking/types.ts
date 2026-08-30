/**
 * Developer Networking & Collaboration Hub
 * Type definitions for connections, matching, events, groups, and messaging
 */

export type ConnectionStatus = 'none' | 'pending-sent' | 'pending-received' | 'connected' | 'blocked';
export type MatchScore = 'perfect' | 'strong' | 'good' | 'fair';
export type EventType = 'meetup' | 'conference' | 'workshop' | 'hackathon' | 'online' | 'office-hours';
export type EventStatus = 'upcoming' | 'live' | 'ended' | 'cancelled';
export type GroupType = 'study' | 'project' | 'networking' | 'mentorship' | 'open-source';
export type GroupMemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type MessagePriority = 'normal' | 'urgent' | 'fyi';
export type CollaborationStatus = 'looking' | 'open' | 'full' | 'closed';

export interface DeveloperProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  title: string;
  company: string;
  location: string;
  bio: string;
  skills: string[];
  languages: string[];
  interests: string[];
  openToCollaboration: boolean;
  connectionCount: number;
  mutualConnections: number;
  matchScore: MatchScore | null;
  matchReasons: string[];
  lastActive: string;
  isOnline: boolean;
}

export interface Connection {
  id: string;
  developerId: string;
  developer: DeveloperProfile;
  status: ConnectionStatus;
  connectedAt: string | null;
  mutualProjects: string[];
  interactionScore: number;
  lastInteractionAt: string | null;
}

export interface NetworkingEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  status: EventStatus;
  organizer: string;
  organizerAvatar: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  isVirtual: boolean;
  maxAttendees: number;
  currentAttendees: number;
  topics: string[];
  speakers: { name: string; title: string; avatar: string }[];
  registered: boolean;
  tags: string[];
}

export interface NetworkingGroup {
  id: string;
  name: string;
  description: string;
  type: GroupType;
  memberCount: number;
  maxMembers: number;
  activityLevel: 'high' | 'medium' | 'low';
  lastPostAt: string;
  topics: string[];
  memberRole: GroupMemberRole | null;
  createdAt: string;
  tags: string[];
}

export interface CollaborationOpportunity {
  id: string;
  title: string;
  description: string;
  project: string;
  neededSkills: string[];
  status: CollaborationStatus;
  postedBy: string;
  postedByAvatar: string;
  applicants: number;
  postedAt: string;
  deadline: string | null;
  isUrgent: boolean;
  tags: string[];
}

export interface NetworkInsight {
  id: string;
  type: 'tip' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  metric?: string;
  value?: string;
  actionable: boolean;
}

export interface NetworkSummary {
  totalConnections: number;
  pendingRequests: number;
  groupsJoined: number;
  eventsAttended: number;
  collaborationOpps: number;
  matchScore: number;
  networkGrowth30d: number;
  messagesThisWeek: number;
}

// ============================================================================
// Helper Utilities
// ============================================================================

export const CONNECTION_STATUS_COLORS: Record<ConnectionStatus, string> = {
  none: '#9e9e9e',
  'pending-sent': '#ff9800',
  'pending-received': '#2196f3',
  connected: '#4caf50',
  blocked: '#f44336',
};

export const MATCH_SCORE_COLORS: Record<MatchScore, string> = {
  perfect: '#ffd700',
  strong: '#4caf50',
  good: '#2196f3',
  fair: '#9e9e9e',
};

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  meetup: '🤝', conference: '🎤', workshop: '🔧', hackathon: '🏆',
  online: '💻', 'office-hours': '🕐',
};

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  upcoming: '#2196f3',
  live: '#f44336',
  ended: '#9e9e9e',
  cancelled: '#607d8b',
};

export const GROUP_TYPE_ICONS: Record<GroupType, string> = {
  study: '📚', project: '🚀', networking: '🤝', mentorship: '👨‍🏫', 'open-source': '📦',
};

export const ACTIVITY_LEVEL_COLORS: Record<string, string> = {
  high: '#4caf50',
  medium: '#ff9800',
  low: '#9e9e9e',
};

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
