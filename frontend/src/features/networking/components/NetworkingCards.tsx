import React from 'react';
import type {
  DeveloperProfile, Connection, NetworkingEvent, NetworkingGroup,
  CollaborationOpportunity, NetworkInsight,
} from '../types';
import {
  CONNECTION_STATUS_COLORS, MATCH_SCORE_COLORS, EVENT_TYPE_ICONS,
  EVENT_STATUS_COLORS, GROUP_TYPE_ICONS, ACTIVITY_LEVEL_COLORS,
  formatNumber, formatRelativeTime,
} from '../types';
import { Card } from '@/components/shared/primitives';
import { TypoCaption, TypoHeading } from '@/components/shared/Typography';

// ============================================================================
// ProfileCard
// ============================================================================

export function ProfileCard({ profile, showMatch }: { profile: DeveloperProfile; showMatch?: boolean }) {
  const matchColor = profile.matchScore ? MATCH_SCORE_COLORS[profile.matchScore] : null;

  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
          {profile.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TypoHeading level={5} className="font-semibold text-foreground truncate">{profile.name}</TypoHeading>
            {profile.isOnline && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
          </div>
          <TypoCaption className="text-muted-foreground text-xs">{profile.title} @ {profile.company}</TypoCaption>
          <TypoCaption className="text-muted-foreground text-xs">{profile.location}</TypoCaption>
        </div>
        {showMatch && matchColor && (
          <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: `${matchColor}20`, color: matchColor }}>
            {profile.matchScore}
          </span>
        )}
      </div>

      <TypoCaption className="text-muted-foreground text-xs block mb-3 line-clamp-2">{profile.bio}</TypoCaption>

      {showMatch && profile.matchReasons.length > 0 && (
        <div className="mb-3 p-2 rounded-lg bg-primary/5">
          {profile.matchReasons.map((reason, i) => (
            <TypoCaption key={i} className="text-primary text-[10px] block">✓ {reason}</TypoCaption>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        {profile.skills.slice(0, 3).map(skill => (
          <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{skill}</span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <TypoCaption className="text-muted-foreground text-[10px]">{formatNumber(profile.connectionCount)} connections</TypoCaption>
        {profile.mutualConnections > 0 && (
          <TypoCaption className="text-muted-foreground text-[10px]">{profile.mutualConnections} mutual</TypoCaption>
        )}
        <TypoCaption className="text-muted-foreground text-[10px]">{formatRelativeTime(profile.lastActive)}</TypoCaption>
      </div>
    </Card>
  );
}

// ============================================================================
// ConnectionCard
// ============================================================================

export function ConnectionCard({ connection }: { connection: Connection }) {
  const statusColor = CONNECTION_STATUS_COLORS[connection.status];

  return (
    <Card className="p-3 hover:shadow-lg transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
          {connection.developer.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{connection.developer.name}</p>
            {connection.developer.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
          </div>
          <TypoCaption className="text-muted-foreground text-[10px]">{connection.developer.title}</TypoCaption>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: statusColor, color: '#fff' }}>
            {connection.status}
          </span>
          {connection.interactionScore > 0 && (
            <TypoCaption className="text-muted-foreground text-[10px] block mt-1">Score: {connection.interactionScore}</TypoCaption>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// EventCard
// ============================================================================

export function EventCard({ event }: { event: NetworkingEvent }) {
  const typeIcon = EVENT_TYPE_ICONS[event.type];
  const statusColor = EVENT_STATUS_COLORS[event.status];

  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcon}</span>
          <div>
            <TypoHeading level={5} className="font-semibold text-foreground">{event.title}</TypoHeading>
            <TypoCaption className="text-muted-foreground capitalize">{event.type} · {event.duration}</TypoCaption>
          </div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: statusColor }}>
          {event.status}
        </span>
      </div>

      <TypoCaption className="text-muted-foreground text-xs block mb-2">{event.description}</TypoCaption>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <TypoCaption className="text-muted-foreground text-[10px]">Date</TypoCaption>
          <p className="text-xs font-medium text-foreground">{event.date}</p>
        </div>
        <div>
          <TypoCaption className="text-muted-foreground text-[10px]">Time</TypoCaption>
          <p className="text-xs font-medium text-foreground">{event.time}</p>
        </div>
        <div>
          <TypoCaption className="text-muted-foreground text-[10px]">Location</TypoCaption>
          <p className="text-xs font-medium text-foreground">{event.isVirtual ? '💻 Virtual' : event.location}</p>
        </div>
        <div>
          <TypoCaption className="text-muted-foreground text-[10px]">Attendees</TypoCaption>
          <p className="text-xs font-medium text-foreground">{event.currentAttendees}/{event.maxAttendees}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {event.topics.slice(0, 3).map(topic => (
          <span key={topic} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{topic}</span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <TypoCaption className="text-muted-foreground text-[10px]">by {event.organizer}</TypoCaption>
        {event.registered ? (
          <span className="text-[10px] font-semibold text-green-500">✓ Registered</span>
        ) : (
          <button className="text-[10px] font-semibold px-3 py-1 rounded-full bg-primary text-primary-foreground">
            Register
          </button>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// GroupCard
// ============================================================================

export function GroupCard({ group }: { group: NetworkingGroup }) {
  const typeIcon = GROUP_TYPE_ICONS[group.type];
  const activityColor = ACTIVITY_LEVEL_COLORS[group.activityLevel];

  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg">{typeIcon}</span>
        <div className="flex-1">
          <TypoHeading level={5} className="font-semibold text-foreground">{group.name}</TypoHeading>
          <TypoCaption className="text-muted-foreground text-xs capitalize">{group.type} · {group.memberRole || 'Not joined'}</TypoCaption>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activityColor }} />
          <TypoCaption className="text-muted-foreground text-[10px]">{group.activityLevel}</TypoCaption>
        </div>
      </div>

      <TypoCaption className="text-muted-foreground text-xs block mb-2">{group.description}</TypoCaption>

      <div className="flex items-center justify-between mb-2">
        <TypoCaption className="text-foreground text-xs font-medium">{group.memberCount.toLocaleString()} members</TypoCaption>
        <TypoCaption className="text-muted-foreground text-[10px]">Active {formatRelativeTime(group.lastPostAt)}</TypoCaption>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {group.topics.slice(0, 3).map(topic => (
          <span key={topic} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{topic}</span>
        ))}
      </div>

      <div className="pt-2 border-t border-border">
        {group.memberRole ? (
          <span className="text-[10px] font-semibold text-green-500">✓ Member</span>
        ) : (
          <button className="text-[10px] font-semibold px-3 py-1 rounded-full bg-primary text-primary-foreground">
            Join Group
          </button>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// CollaborationCard
// ============================================================================

export function CollaborationCard({ collab }: { collab: CollaborationOpportunity }) {
  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-2">
        <div>
          <TypoHeading level={5} className="font-semibold text-foreground">{collab.title}</TypoHeading>
          <TypoCaption className="text-muted-foreground text-xs">{collab.project} · by {collab.postedBy}</TypoCaption>
        </div>
        {collab.isUrgent && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-500">🔥 Urgent</span>
        )}
      </div>

      <TypoCaption className="text-muted-foreground text-xs block mb-3">{collab.description}</TypoCaption>

      <div className="flex flex-wrap gap-1 mb-2">
        {collab.neededSkills.map(skill => (
          <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{skill}</span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <TypoCaption className="text-muted-foreground text-[10px]">{collab.applicants} applicants · Posted {formatRelativeTime(collab.postedAt)}</TypoCaption>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-500">{collab.status}</span>
      </div>
    </Card>
  );
}

// ============================================================================
// InsightCard
// ============================================================================

export function InsightCard({ insight }: { insight: NetworkInsight }) {
  const typeConfig: Record<string, { color: string; icon: string }> = {
    success: { color: '#4caf50', icon: '✅' },
    warning: { color: '#ff9800', icon: '⚠️' },
    tip: { color: '#00e5ff', icon: '💡' },
    info: { color: '#9c27b0', icon: 'ℹ️' },
  };
  const config = typeConfig[insight.type];

  return (
    <Card className="p-3 hover:shadow-lg transition-all duration-200" style={{ borderLeft: `3px solid ${config.color}` }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{config.icon}</span>
        <TypoHeading level={5} className="font-semibold text-foreground flex-1 text-sm">{insight.title}</TypoHeading>
        {insight.actionable && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Actionable</span>
        )}
      </div>
      <TypoCaption className="text-muted-foreground block mb-1">{insight.description}</TypoCaption>
      {insight.metric && (
        <TypoCaption className="text-muted-foreground">{insight.metric}: <span className="text-foreground font-medium">{insight.value}</span></TypoCaption>
      )}
    </Card>
  );
}
