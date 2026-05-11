import { avatarStyles, type AvatarColor } from "@/lib/data";

interface AvatarProps {
  initials: string;
  color: AvatarColor;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "w-8 h-8 text-[11px]",
  md: "w-[38px] h-[38px] text-[13px]",
  lg: "w-16 h-16 text-xl",
};

const Avatar = ({ initials, color, size = "md" }: AvatarProps) => (
  <div className={`sp-avatar ${sizes[size]} ${avatarStyles[color]}`}>
    {initials}
  </div>
);

export default Avatar;
