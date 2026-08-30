import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/shared/primitives";
import { useState } from "react";
import { TypoCaption, TypoHeading } from "@/components/shared/Typography";
import { AnimatedPage } from "@/components/shared/AnimatedPage";
import {
  mockProfiles, mockConnections, mockEvents, mockGroups,
  mockCollaborations, mockInsights, mockNetworkSummary,
} from "@/features/networking/service";
import {
  ProfileCard, ConnectionCard, EventCard, GroupCard,
  CollaborationCard, InsightCard,
} from "@/features/networking/components/NetworkingCards";
import {
  SkillOverlapRadar, NetworkGrowthLine, ActivityBar, MatchDonut,
} from "@/features/networking/components/NetworkingCharts";
import { formatNumber } from "@/features/networking/types";

export const Route = createFileRoute("/_app/networking")({
  head: () => ({
    meta: [
      { title: "Networking — DevLink" },
      {
        name: "description",
        content: "Connect with developers, join groups, attend events, and find collaboration opportunities.",
      },
    ],
  }),
  component: NetworkingPage,
});

const tabs = [
  { id: "overview", label: "📊 Overview" },
  { id: "discover", label: "🔍 Discover" },
  { id: "connections", label: "🤝 Connections" },
  { id: "events", label: "📅 Events" },
  { id: "groups", label: "👥 Groups" },
  { id: "collaborate", label: "🚀 Collaborate" },
];

const networkGrowthData = [
  { month: "Mar", connections: 180, groups: 3 },
  { month: "Apr", connections: 195, groups: 3 },
  { month: "May", connections: 210, groups: 4 },
  { month: "Jun", connections: 225, groups: 4 },
  { month: "Jul", connections: 236, groups: 5 },
  { month: "Aug", connections: 248, groups: 5 },
];

function NetworkingPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const summary = mockNetworkSummary;

  return (
    <AnimatedPage>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <TypoHeading level={2} className="text-3xl font-bold text-foreground mb-2">
              🤝 Developer Networking & Collaboration
            </TypoHeading>
            <TypoCaption className="text-muted-foreground text-base">
              Connect with developers, join communities, and find collaboration opportunities
            </TypoCaption>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">Connections</TypoCaption>
                  <p className="text-2xl font-bold text-foreground">{summary.totalConnections}</p>
                </Card>
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">Groups</TypoCaption>
                  <p className="text-2xl font-bold text-primary">{summary.groupsJoined}</p>
                </Card>
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">Events</TypoCaption>
                  <p className="text-2xl font-bold text-green-500">{summary.eventsAttended}</p>
                </Card>
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">Match Score</TypoCaption>
                  <p className="text-2xl font-bold text-yellow-500">{summary.matchScore}%</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <NetworkGrowthLine data={networkGrowthData} title="Network Growth (6 Months)" />
                <MatchDonut profiles={mockProfiles} title="Suggested Matches" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ActivityBar connections={mockConnections.filter(c => c.status === 'connected')} title="Connection Activity" />
                <SkillOverlapRadar
                  yourSkills={['React', 'TypeScript', 'Tailwind CSS', 'Python']}
                  theirSkills={mockProfiles[0].skills}
                  title="Skill Overlap — Sarah Chen"
                />
              </div>

              <TypoHeading level={4} className="text-lg font-semibold text-foreground">💡 Network Insights</TypoHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockInsights.map(insight => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            </div>
          )}

          {/* ===== DISCOVER TAB ===== */}
          {activeTab === "discover" && (
            <div className="space-y-6">
              <TypoHeading level={4} className="text-lg font-semibold text-foreground">Suggested Connections</TypoHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockProfiles.map(profile => (
                  <ProfileCard key={profile.id} profile={profile} showMatch />
                ))}
              </div>
            </div>
          )}

          {/* ===== CONNECTIONS TAB ===== */}
          {activeTab === "connections" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockConnections.map(conn => (
                  <ConnectionCard key={conn.id} connection={conn} />
                ))}
              </div>
            </div>
          )}

          {/* ===== EVENTS TAB ===== */}
          {activeTab === "events" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {/* ===== GROUPS TAB ===== */}
          {activeTab === "groups" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockGroups.map(group => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            </div>
          )}

          {/* ===== COLLABORATE TAB ===== */}
          {activeTab === "collaborate" && (
            <div className="space-y-6">
              <TypoHeading level={4} className="text-lg font-semibold text-foreground">Open Opportunities</TypoHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockCollaborations.map(collab => (
                  <CollaborationCard key={collab.id} collab={collab} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
