import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings as SettingsIcon } from "lucide-react";
import Leaderboard from "@/components/Leaderboard";
import MyStats from "@/components/MyStats";
import Group from "@/components/Group";
import Profile from "@/components/Profile";
import SettingsScreen from "@/components/Settings";
import Avatar from "@/components/Avatar";
import { GroupData, starterGroups } from "@/lib/data";

type Tab = "leaderboard" | "my-stats" | "group" | "profile" | "settings";

const tabs: { id: Tab; label: string }[] = [
  { id: "leaderboard", label: "Groups" },
  { id: "my-stats", label: "My stats" },
  { id: "group", label: "Group settings" },
  { id: "profile", label: "Profile" },
  { id: "settings", label: "Settings" },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("leaderboard");
  const [groups, setGroups] = useState<GroupData[]>(starterGroups);
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>([starterGroups[0].id]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const joinedGroups = groups.filter((group) => joinedGroupIds.includes(group.id));

  const handleJoinGroup = (rawCode: string) => {
    const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const group = groups.find((candidate) => candidate.code === code);

    if (!group) {
      return { ok: false, message: `No group found for code ${code}.` };
    }

    if (joinedGroupIds.includes(group.id)) {
      return { ok: false, message: `You already joined ${group.name}.` };
    }

    setJoinedGroupIds((prev) => [...prev, group.id]);
    setActiveGroupId(group.id);
    return { ok: true, message: `You joined ${group.name}.` };
  };

  const handleCreateGroup = (): GroupData => {
    const nextNumber = groups.length + 1;
    const newGroup: GroupData = {
      id: `custom-${Date.now()}`,
      name: `New Group ${nextNumber}`,
      code: `NEW${String(Math.floor(1000 + Math.random() * 9000))}`,
      members: [
        {
          name: "You",
          initials: "YO",
          avatar: "purple",
          time: 0,
          app: "None",
          appIcon: "📱",
          delta: 0,
          you: true,
        },
      ],
    };

    setGroups((prev) => [...prev, newGroup]);
    setJoinedGroupIds((prev) => [...prev, newGroup.id]);
    setActiveGroupId(newGroup.id);
    return newGroup;
  };

  const renderActiveTab = () => {
    if (activeTab === "leaderboard") {
      return (
        <Leaderboard
          joinedGroups={joinedGroups}
          activeGroupId={activeGroupId}
          onSelectGroup={setActiveGroupId}
        />
      );
    }

    if (activeTab === "group") {
      return (
        <Group
          joinedGroups={joinedGroups}
          activeGroupId={activeGroupId}
          onSelectGroup={setActiveGroupId}
          onJoinGroup={handleJoinGroup}
          onCreateGroup={handleCreateGroup}
        />
      );
    }

    if (activeTab === "my-stats") return <MyStats />;
    if (activeTab === "profile") return <Profile />;
    return <SettingsScreen />;
  };

  return (
    <div className="min-h-[100dvh] bg-background flex justify-center px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
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
            {renderActiveTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
