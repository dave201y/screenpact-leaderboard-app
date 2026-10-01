export const mockMembers = [
  { name: "Alex", initials: "AL", avatar: "teal", time: 72, app: "Messages", appIcon: "💬", delta: -48, you: false },
  { name: "Jordan", initials: "JO", avatar: "blue", time: 118, app: "Instagram", appIcon: "📸", delta: 12, you: false },
  { name: "You", initials: "YO", avatar: "purple", time: 158, app: "YouTube", appIcon: "▶️", delta: -22, you: true },
  { name: "Sam", initials: "SA", avatar: "coral", time: 201, app: "TikTok", appIcon: "🎵", delta: 34, you: false },
  { name: "Riley", initials: "RI", avatar: "pink", time: 243, app: "Reddit", appIcon: "📱", delta: 5, you: false },
  { name: "Casey", initials: "CA", avatar: "amber", time: 297, app: "Twitter/X", appIcon: "🐦", delta: 61, you: false },
];

export const mockApps = [
  { name: "YouTube", icon: "▶️", mins: 68, color: "hsl(0 72% 51%)" },
  { name: "Messages", icon: "💬", mins: 32, color: "hsl(92 60% 25%)" },
  { name: "Instagram", icon: "📸", mins: 24, color: "hsl(340 48% 40%)" },
  { name: "Safari", icon: "🌐", mins: 18, color: "hsl(213 72% 37%)" },
  { name: "Spotify", icon: "🎵", mins: 14, color: "hsl(160 77% 30%)" },
  { name: "Other", icon: "···", mins: 2, color: "hsl(0 0% 53%)" },
];

export const mockDayMins = [245, 312, 198, 287, 230, 341, 158];

export const mockSettings = {
  notifications: true,
  darkMode: false,
  dailyGoalMinutes: 180,
};

export const mockProfile = {
  displayName: "You",
  initials: "YO",
  avatar: "purple",
  memberSince: "March 2026",
  groupsCount: 1,
  rank: 3,
  avgDailyMinutes: 231,
  achievements: [
    { icon: "trophy", label: "1st Place Finishes", value: "3", color: "text-sp-gold" },
    { icon: "trending-down", label: "Best Reduction", value: "2h 14m", color: "text-sp-green" },
    { icon: "calendar", label: "Days Tracked", value: "28", color: "text-sp-blue" },
    { icon: "flame", label: "Current Streak", value: "5 days", color: "text-sp-coral" },
  ],
};
