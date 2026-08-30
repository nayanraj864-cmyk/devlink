import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/shared/primitives";
import { useState } from "react";
import { TypoCaption, TypoHeading } from "@/components/shared/Typography";
import { AnimatedPage } from "@/components/shared/AnimatedPage";
import {
  mockProjects, mockReviews, mockAnalytics, mockCollections,
  mockGitHubStats, mockInsights, mockPortfolioSummary,
} from "@/features/portfolio/service";
import {
  ProjectCard, ReviewCard, AnalyticsCard, CollectionCard,
  GitHubStatsCard, InsightCard,
} from "@/features/portfolio/components/PortfolioCards";
import {
  ViewsTrend, TrafficPie, LanguageBar, ContributionBar, RatingRadar,
} from "@/features/portfolio/components/PortfolioCharts";
import { formatNumber, CATEGORY_ICONS, CATEGORY_COLORS } from "@/features/portfolio/types";

export const Route = createFileRoute("/_app/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — DevLink" },
      {
        name: "description",
        content: "Showcase your projects with GitHub integration, live demos, analytics, and reviews.",
      },
    ],
  }),
  component: PortfolioPage,
});

const tabs = [
  { id: "overview", label: "📊 Overview" },
  { id: "projects", label: "🚀 Projects" },
  { id: "analytics", label: "📈 Analytics" },
  { id: "reviews", label: "⭐ Reviews" },
  { id: "github", label: "🐙 GitHub" },
  { id: "insights", label: "💡 Insights" },
];

function PortfolioPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const summary = mockPortfolioSummary;

  const categoryCounts: Record<string, number> = {};
  mockProjects.forEach(p => { categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1; });

  return (
    <AnimatedPage>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <TypoHeading level={2} className="text-3xl font-bold text-foreground mb-2">
              🚀 Project Portfolio Showcase
            </TypoHeading>
            <TypoCaption className="text-muted-foreground text-base">
              Showcase your projects, track analytics, and get reviews from the community
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
                  <TypoCaption className="text-muted-foreground">Total Projects</TypoCaption>
                  <p className="text-2xl font-bold text-foreground">{summary.totalProjects}</p>
                </Card>
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">Total Stars</TypoCaption>
                  <p className="text-2xl font-bold text-yellow-500">{formatNumber(summary.totalStars)}</p>
                </Card>
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">30d Views</TypoCaption>
                  <p className="text-2xl font-bold text-primary">{formatNumber(summary.totalViews30d)}</p>
                </Card>
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">Live Demos</TypoCaption>
                  <p className="text-2xl font-bold text-green-500">{summary.demoLiveCount}</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {mockAnalytics.slice(0, 2).map(a => (
                  <ViewsTrend key={a.projectId} analytics={a} title={`${a.projectName} — 30-Day Views`} />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GitHubStatsCard stats={mockGitHubStats} />
                <ContributionBar stats={mockGitHubStats} title="2026 Contributions" />
              </div>

              <TypoHeading level={4} className="text-lg font-semibold text-foreground">Featured Projects</TypoHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockProjects.filter(p => p.featured).map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>

              <TypoHeading level={4} className="text-lg font-semibold text-foreground">Collections</TypoHeading>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockCollections.map(col => (
                  <CollectionCard key={col.id} collection={col} />
                ))}
              </div>
            </div>
          )}

          {/* ===== PROJECTS TAB ===== */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              <div className="flex gap-2 flex-wrap">
                {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
                  <span key={cat} className="text-xs px-3 py-1 rounded-full font-medium capitalize"
                    style={{ backgroundColor: `${CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS]}20`, color: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] }}>
                    {icon} {cat} ({categoryCounts[cat] || 0})
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {/* ===== ANALYTICS TAB ===== */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              {mockAnalytics.map(a => (
                <div key={a.projectId} className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <AnalyticsCard analytics={a} />
                    <TrafficPie sources={a.trafficSources} title={`${a.projectName} — Traffic Sources`} />
                  </div>
                  <ViewsTrend analytics={a} title={`${a.projectName} — Daily Views`} />
                </div>
              ))}
            </div>
          )}

          {/* ===== REVIEWS TAB ===== */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <TypoHeading level={4} className="text-lg font-semibold text-foreground">Community Reviews</TypoHeading>
                  {mockReviews.map(review => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
                <RatingRadar reviews={mockReviews} title="Average Ratings" />
              </div>
            </div>
          )}

          {/* ===== GITHUB TAB ===== */}
          {activeTab === "github" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GitHubStatsCard stats={mockGitHubStats} />
                <LanguageBar stats={mockGitHubStats} title="Languages" />
              </div>
              <ContributionBar stats={mockGitHubStats} title="Monthly Contributions" />
            </div>
          )}

          {/* ===== INSIGHTS TAB ===== */}
          {activeTab === "insights" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">Active Projects</TypoCaption>
                  <p className="text-2xl font-bold text-green-500">{summary.activeProjects}</p>
                </Card>
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">Avg Rating</TypoCaption>
                  <p className="text-2xl font-bold text-yellow-500">{summary.avgRating}⭐</p>
                </Card>
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">Total Forks</TypoCaption>
                  <p className="text-2xl font-bold text-primary">{formatNumber(summary.totalForks)}</p>
                </Card>
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">Contribution Streak</TypoCaption>
                  <p className="text-2xl font-bold text-foreground">{mockGitHubStats.contributionStreak}d</p>
                </Card>
              </div>

              <TypoHeading level={4} className="text-lg font-semibold text-foreground">Portfolio Insights</TypoHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockInsights.map(insight => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
