import { StatCard } from "@/components/ui/stat-card";
import { Folder, Users2, MessageSquare, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const statsData = [
  {
    key: "active-projects",
    value: "2",
    label: "Active Projects",
    trend: "+ 20% from last week",
    trendType: "positive" as const,
    icon: Folder,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    key: "team-members",
    value: "24",
    label: "Team Members",
    trend: "+ 8% from last week",
    trendType: "positive" as const,
    icon: Users2,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    key: "unread-messages",
    value: "3",
    label: "Unread Messages",
    trend: "- 25% from last week",
    trendType: "negative" as const,
    icon: MessageSquare,
    iconColor: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    key: "ai-score",
    value: "85",
    label: "AI Score",
    trend: "+ 15% from last week",
    trendType: "positive" as const,
    icon: Sparkles,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

export function StatsRow() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {statsData.map((s, i) => (
        <motion.div
          key={s.key}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.2 }}
          className="h-full"
        >
          <StatCard
            icon={s.icon}
            value={s.value}
            label={s.label}
            trend={s.trend}
            trendType={s.trendType}
            iconColor={s.iconColor}
            bgColor={s.bgColor}
          />
        </motion.div>
      ))}
    </div>
  );
}
