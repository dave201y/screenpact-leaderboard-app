import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, User, Settings as SettingsIcon } from "lucide-react";
import Leaderboard from "@/components/Leaderboard";
import MyStats from "@/components/MyStats";
import Group from "@/components/Group";
import Profile from "@/components/Profile";
import SettingsScreen from "@/components/Settings";
import Avatar from "@/components/Avatar";

type Tab = "leaderboard" | "my-stats" | "group" | "profile" | "settings";

const tabs: { id: Tab; label: string }[] = [
  { id: "leaderboard", label: "Leaderboard" },
  { id: "my-stats", label: "My stats" },
  { id: "group", label: "Group" },
  { id: "profile", label: "Profile" },
  { id: "settings", label: "Settings" },
];

const screens: Record<Tab, React.ComponentType> = {
  leaderboard: Leaderboard,
  "my-stats": MyStats,
  group: Group,
  profile: Profile,
  settings: SettingsScreen,
};

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("leaderboard");

  const Screen = screens[activeTab];

  return (
    <div className="min-h-screen bg-background flex justify-center px-4 py-6">
      <div className="w-full max-w-[420px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[22px] font-medium text-foreground">ScreenPact</h1>
            <p className="text-[13px] text-muted-foreground">Group screen time</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("settings")}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors"
            >
              <SettingsIcon className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => setActiveTab("profile")}>
              <Avatar initials="YO" color="purple" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 mb-5 bg-muted rounded-xl p-1">
          {tabs.slice(0, 3).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`sp-tab ${activeTab === tab.id ? "sp-tab-active" : "sp-tab-inactive"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <Screen />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
