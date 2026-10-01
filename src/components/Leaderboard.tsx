import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GroupData, formatTime } from "@/lib/data";
import Avatar from "./Avatar";

const medals = ["🥇", "🥈", "🥉"];
const barColors = [
  "bg-sp-amber-border",
  "bg-border",
  "bg-sp-teal-bg",
  "bg-border",
  "bg-border",
  "bg-border",
];

interface LeaderboardProps {
  joinedGroups: GroupData[];
  activeGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
}

const Leaderboard = ({ joinedGroups, activeGroupId, onSelectGroup }: LeaderboardProps) => {
  const [countdown, setCountdown] = useState("--:--:--");
  const activeGroup = joinedGroups.find((group) => group.id === activeGroupId) ?? null;
  const members = activeGroup?.members ?? [];
  const winner = members.length ? [...members].sort((a, b) => a.time - b.time)[0] : null;
  const maxTime = Math.max(...members.map((m) => m.time));

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setCountdown(`${h}:${m}:${s}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (!joinedGroups.length) {
    return (
      <div className="space-y-3">
        <div className="sp-card text-center">
          <div className="text-lg font-medium text-foreground mb-2">No groups joined yet</div>
          <div className="text-sm text-muted-foreground">Open the Group tab and join or create a group first.</div>
        </div>
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div className="space-y-3">
        <div className="sp-card">
          <div className="text-lg font-medium text-foreground mb-2">Choose a group leaderboard</div>
          <div className="text-sm text-muted-foreground mb-3">Select which group you want to view right now.</div>
          <div className="space-y-2">
            {joinedGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className="w-full text-left rounded-lg border border-border bg-muted px-3 py-2.5 hover:bg-card transition-colors"
              >
                <div className="text-sm font-medium text-foreground">{group.name}</div>
                <div className="text-xs text-muted-foreground">{group.members.length} members · Least screen time wins</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Winner card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-sp-amber-bg border border-sp-amber-border rounded-xl p-4 flex items-center gap-3"
      >
        <span className="text-3xl">🏆</span>
        <div>
          <div className="font-medium text-[15px] text-sp-amber">{winner?.name ?? "No one"} is winning today!</div>
          <div className="text-[13px] text-sp-gold">Only {winner ? formatTime(winner.time) : "0m"} so far</div>
        </div>
      </motion.div>

      {/* Rankings */}
      <div className="sp-card">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-medium text-foreground">{activeGroup.name}</div>
          <span className="sp-badge bg-sp-blue-bg text-sp-blue">{members.length} members</span>
        </div>
        <button
          onClick={() => onSelectGroup(null)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          Change group
        </button>
        <div className="text-xs text-muted-foreground mb-3">Today · Least screen time wins</div>

        <div className="space-y-0">
          {members.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer px-1"
            >
              <div className={`text-[15px] font-medium min-w-[20px] text-center ${i < 3 ? "text-foreground" : "text-muted-foreground"}`}>
                {i < 3 ? medals[i] : i + 1}
              </div>
              <Avatar initials={m.initials} color={m.avatar} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {m.name}
                  {m.you && <span className="sp-you-tag">you</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {m.appIcon} Most used: {m.app}
                </div>
                <div className="mt-1.5 h-[3px] bg-muted rounded-full">
                  <div
                    className={`h-[3px] rounded-full ${barColors[i]}`}
                    style={{ width: `${Math.round((m.time / maxTime) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-medium text-foreground">{formatTime(m.time)}</div>
                <div className={`text-[11px] mt-0.5 ${m.delta < 0 ? "text-sp-green" : "text-sp-red"}`}>
                  {m.delta < 0 ? "↓" : "↑"} {Math.abs(m.delta)}m
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Countdown */}
      <div className="sp-card text-center">
        <div className="text-[13px] text-muted-foreground mb-2">Resets in</div>
        <div className="text-2xl font-medium text-foreground">{countdown}</div>
        <div className="text-xs text-muted-foreground mt-1">midnight local time</div>
      </div>
    </div>
  );
};

export default Leaderboard;
