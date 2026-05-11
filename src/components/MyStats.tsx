import { motion } from "framer-motion";
import { apps, weekDays, dayMins, formatTime } from "@/lib/data";

const maxDayMins = Math.max(...dayMins);
const totalAppMins = apps.reduce((a, b) => a + b.mins, 0);
const avgDay = Math.round(dayMins.reduce((a, b) => a + b, 0) / 7);
const bestDay = Math.min(...dayMins);

const metrics = [
  { label: "Today", val: "2h 38m", sub: "↓ 22m from yesterday", color: "text-sp-green" },
  { label: "Weekly avg", val: "3h 51m", sub: "↑ 9m from last week", color: "text-sp-red" },
  { label: "Group rank", val: "#3", sub: "out of 6 today", color: "text-muted-foreground" },
  { label: "Best day", val: "1h 05m", sub: "last Monday", color: "text-muted-foreground" },
];

const MyStats = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2.5">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="sp-metric"
        >
          <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
          <div className="text-[22px] font-medium text-foreground">{m.val}</div>
          <div className={`text-[11px] mt-0.5 ${m.color}`}>{m.sub}</div>
        </motion.div>
      ))}
    </div>

    <div className="sp-card">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Top apps today
      </div>
      {apps.map((a) => (
        <div key={a.name} className="flex items-center gap-2.5 py-2 border-b border-border last:border-b-0">
          <div
            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-sm shrink-0"
            style={{ backgroundColor: `${a.color}22` }}
          >
            {a.icon}
          </div>
          <div className="text-sm text-foreground flex-1">{a.name}</div>
          <div className="flex-1 mx-2">
            <div className="h-[3px] bg-muted rounded-full">
              <div
                className="h-[3px] rounded-full"
                style={{ width: `${Math.round((a.mins / totalAppMins) * 100)}%`, background: a.color }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-medium text-foreground">{formatTime(a.mins)}</div>
            <div className="text-[11px] text-muted-foreground">{Math.round((a.mins / totalAppMins) * 100)}%</div>
          </div>
        </div>
      ))}
    </div>

    <div className="sp-card">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        This week
      </div>
      <div className="flex items-end gap-1.5 h-20">
        {weekDays.map((d, i) => (
          <div key={d} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full rounded-t ${i === 6 ? "bg-primary" : "bg-border"}`}
              style={{ height: `${Math.round((dayMins[i] / maxDayMins) * 64)}px` }}
            />
            <div className={`text-[11px] ${i === 6 ? "text-foreground" : "text-muted-foreground"}`}>{d}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Avg: {formatTime(avgDay)}/day</span>
        <span>Best: {formatTime(bestDay)}</span>
      </div>
    </div>
  </div>
);

export default MyStats;
