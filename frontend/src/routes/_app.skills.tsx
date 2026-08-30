import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/shared/primitives";
import { useState } from "react";
import { TypoCaption, TypoHeading } from "@/components/shared/Typography";
import { AnimatedPage } from "@/components/shared/AnimatedPage";
import {
  mockSkills, mockTechStacks, mockLearningPaths, mockCertifications,
  mockEndorsements, mockSkillGaps, mockTimeline, mockMarketTrends,
  mockSkillsSummary,
} from "@/features/skills/service";
import {
  SkillCard, TechStackCard, LearningPathCard, CertificationCard,
  EndorsementCard, GapCard, MarketTrendCard,
} from "@/features/skills/components/SkillsCards";
import {
  SkillRadar, ProficiencyBar, CategoryDonut, MarketBar, TimelineLine,
} from "@/features/skills/components/SkillsCharts";
import { formatNumber, SKILL_CATEGORY_COLORS, SKILL_CATEGORY_ICONS } from "@/features/skills/types";

export const Route = createFileRoute("/_app/skills")({
  head: () => ({
    meta: [
      { title: "Skills — DevLink" },
      {
        name: "description",
        content: "Track your developer skills, tech stacks, learning progress, certifications, and market trends.",
      },
    ],
  }),
  component: SkillsPage,
});

const tabs = [
  { id: "overview", label: "📊 Overview", icon: "📊" },
  { id: "skills", label: "🛠️ Skills", icon: "🛠️" },
  { id: "stacks", label: "📚 Tech Stacks", icon: "📚" },
  { id: "learning", label: "🎓 Learning", icon: "🎓" },
  { id: "certs", label: "🏆 Certifications", icon: "🏆" },
  { id: "market", label: "📈 Market", icon: "📈" },
];

function SkillsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const summary = mockSkillsSummary;

  const categoryCounts: Record<string, number> = {};
  mockSkills.forEach(s => { categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1; });

  return (
    <AnimatedPage>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <TypoHeading level={2} className="text-3xl font-bold text-foreground mb-2">
              🛠️ Developer Skills & Tech Stack
            </TypoHeading>
            <TypoCaption className="text-muted-foreground text-base">
              Track your skills, showcase your expertise, and stay ahead of market trends
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
                  <TypoCaption className="text-muted-foreground">Total Skills</TypoCaption>
                  <p className="text-2xl font-bold text-foreground">{summary.totalSkills}</p>
                </Card>
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">Expert Level</TypoCaption>
                  <p className="text-2xl font-bold text-green-500">{summary.expertLevel}</p>
                </Card>
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">Endorsements</TypoCaption>
                  <p className="text-2xl font-bold text-primary">{summary.totalEndorsements}</p>
                </Card>
                <Card className="p-4 text-center">
                  <TypoCaption className="text-muted-foreground">Avg Proficiency</TypoCaption>
                  <p className="text-2xl font-bold text-foreground">{summary.avgProficiency}%</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SkillRadar skills={mockSkills} title="Skills Radar" />
                <CategoryDonut skills={mockSkills} title="Skills by Category" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ProficiencyBar skills={mockSkills} title="Top Skills by Proficiency" />
                <TimelineLine timeline={mockTimeline} title="Skill Growth Timeline" />
              </div>

              {/* Recent Endorsements */}
              <TypoHeading level={4} className="text-lg font-semibold text-foreground">Recent Endorsements</TypoHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockEndorsements.map(e => (
                  <EndorsementCard key={e.id} endorsement={e} />
                ))}
              </div>
            </div>
          )}

          {/* ===== SKILLS TAB ===== */}
          {activeTab === "skills" && (
            <div className="space-y-6">
              <div className="flex gap-2 flex-wrap">
                {Object.entries(SKILL_CATEGORY_ICONS).map(([cat, icon]) => (
                  <span key={cat} className="text-xs px-3 py-1 rounded-full font-medium capitalize"
                    style={{ backgroundColor: `${SKILL_CATEGORY_COLORS[cat as keyof typeof SKILL_CATEGORY_COLORS]}20`, color: SKILL_CATEGORY_COLORS[cat as keyof typeof SKILL_CATEGORY_COLORS] }}>
                    {icon} {cat} ({categoryCounts[cat] || 0})
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockSkills.map(skill => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            </div>
          )}

          {/* ===== TECH STACKS TAB ===== */}
          {activeTab === "stacks" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockTechStacks.map(stack => (
                  <TechStackCard key={stack.id} stack={stack} />
                ))}
              </div>
            </div>
          )}

          {/* ===== LEARNING TAB ===== */}
          {activeTab === "learning" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockLearningPaths.map(path => (
                  <LearningPathCard key={path.id} path={path} />
                ))}
              </div>

              <TypoHeading level={4} className="text-lg font-semibold text-foreground">Skill Gaps</TypoHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockSkillGaps.map((gap, i) => (
                  <GapCard key={i} gap={gap} />
                ))}
              </div>
            </div>
          )}

          {/* ===== CERTIFICATIONS TAB ===== */}
          {activeTab === "certs" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockCertifications.map(cert => (
                  <CertificationCard key={cert.id} cert={cert} />
                ))}
              </div>
            </div>
          )}

          {/* ===== MARKET TAB ===== */}
          {activeTab === "market" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockMarketTrends.map(trend => (
                  <MarketTrendCard key={trend.skill} trend={trend} />
                ))}
              </div>

              <MarketBar trends={mockMarketTrends} title="Market Demand by Skill" />
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
