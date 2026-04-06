export type AvatarColor = "purple" | "teal" | "coral" | "blue" | "pink" | "amber";

export interface Member {
  name: string;
  initials: string;
  avatar: AvatarColor;
  time: number;
  app: string;
  appIcon: string;
  delta: number;
  you: boolean;
}

export interface AppUsage {
  name: string;
  icon: string;
  mins: number;
  color: string;
}

export const members: Member[] = [
  { name: "Alex", initials: "AL", avatar: "teal", time: 72, app: "Messages", appIcon: "💬", delta: -48, you: false },
  { name: "Jordan", initials: "JO", avatar: "blue", time: 118, app: "Instagram", appIcon: "📸", delta: 12, you: false },
  { name: "You", initials: "YO", avatar: "purple", time: 158, app: "YouTube", appIcon: "▶️", delta: -22, you: true },
  { name: "Sam", initials: "SA", avatar: "coral", time: 201, app: "TikTok", appIcon: "🎵", delta: 34, you: false },
  { name: "Riley", initials: "RI", avatar: "pink", time: 243, app: "Reddit", appIcon: "📱", delta: 5, you: false },
  { name: "Casey", initials: "CA", avatar: "amber", time: 297, app: "Twitter/X", appIcon: "🐦", delta: 61, you: false },
];

export const apps: AppUsage[] = [
  { name: "YouTube", icon: "▶️", mins: 68, color: "hsl(0 72% 51%)" },
  { name: "Messages", icon: "💬", mins: 32, color: "hsl(92 60% 25%)" },
  { name: "Instagram", icon: "📸", mins: 24, color: "hsl(340 48% 40%)" },
  { name: "Safari", icon: "🌐", mins: 18, color: "hsl(213 72% 37%)" },
  { name: "Spotify", icon: "🎵", mins: 14, color: "hsl(160 77% 30%)" },
  { name: "Other", icon: "···", mins: 2, color: "hsl(0 0% 53%)" },
];

export const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const dayMins = [245, 312, 198, 287, 230, 341, 158];

export const avatarStyles: Record<AvatarColor, string> = {
  purple: "bg-secondary text-secondary-foreground",
  teal: "bg-sp-teal-bg text-sp-teal",
  coral: "bg-sp-coral-bg text-sp-coral",
  blue: "bg-sp-blue-bg text-sp-blue",
  pink: "bg-sp-pink-bg text-sp-pink",
  amber: "bg-sp-amber-bg text-sp-amber",
};

export function formatTime(m: number): string {
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
