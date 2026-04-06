import { motion } from "framer-motion";
import Avatar from "./Avatar";
import { Trophy, TrendingDown, Calendar, Flame } from "lucide-react";

const achievements = [
  { icon: Trophy, label: "1st Place Finishes", value: "3", color: "text-sp-gold" },
  { icon: TrendingDown, label: "Best Reduction", value: "2h 14m", color: "text-sp-green" },
  { icon: Calendar, label: "Days Tracked", value: "28", color: "text-sp-blue" },
  { icon: Flame, label: "Current Streak", value: "5 days", color: "text-sp-coral" },
];

const Profile = () => (
  <div className="space-y-3">
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sp-card flex flex-col items-center py-6"
    >
      <Avatar initials="YO" color="purple" size="lg" />
      <div className="mt-3 text-lg font-medium text-foreground">You</div>
      <div className="text-sm text-muted-foreground">Member since March 2026</div>
      <div className="flex gap-6 mt-4">
        <div className="text-center">
          <div className="text-lg font-medium text-foreground">1</div>
          <div className="text-xs text-muted-foreground">Group</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-medium text-foreground">#3</div>
          <div className="text-xs text-muted-foreground">Rank</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-medium text-foreground">3h 51m</div>
          <div className="text-xs text-muted-foreground">Avg/day</div>
        </div>
      </div>
    </motion.div>

    <div className="sp-card">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Achievements
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {achievements.map((a, i) => (
          <motion.div
            key={a.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="sp-metric flex flex-col items-center text-center py-4"
          >
            <a.icon className={`w-5 h-5 mb-2 ${a.color}`} />
            <div className="text-lg font-medium text-foreground">{a.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{a.label}</div>
          </motion.div>
        ))}
      </div>
    </div>

    <div className="sp-card">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Screen time goal
      </div>
      <div className="sp-metric">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-foreground">Daily limit</span>
          <span className="text-sm font-medium text-foreground">3h 00m</span>
        </div>
        <div className="h-2 bg-border rounded-full">
          <div className="h-2 bg-primary rounded-full" style={{ width: "88%" }} />
        </div>
        <div className="text-[11px] text-muted-foreground mt-1.5">2h 38m of 3h used today</div>
      </div>
    </div>
  </div>
);

export default Profile;
