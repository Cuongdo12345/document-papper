import { User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/getInitials";

const SIZE_CLASS = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-20 text-xl",
} as const;

interface AvatarProps {
  /** Data URI base64 (`data:image/...;base64,...`) — `undefined`/rỗng → fallback initials. */
  avatar?: string;
  fullName?: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}

/**
 * [MỚI DEV-079] SHARED_COMPONENTS_LIBRARY — hiển thị avatar user, dùng
 * chung cho `Header.tsx`/`ProfilePage.tsx`/`UsersListPage.tsx`/
 * `UserAvatarModal.tsx`. Ảnh (nếu có) ưu tiên hiển thị; không có → fallback
 * initials tròn (đúng style cũ đã dùng ở `Header.tsx` trước khi có avatar
 * ảnh thật); không có cả `fullName` → icon người dùng chung.
 */
export function Avatar({ avatar, fullName, size = "md", className }: AvatarProps) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={fullName ? `Ảnh đại diện của ${fullName}` : "Ảnh đại diện"}
        className={cn("shrink-0 rounded-full object-cover", SIZE_CLASS[size], className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
        SIZE_CLASS[size],
        className,
      )}
      aria-hidden="true"
    >
      {fullName ? getInitials(fullName) : <UserIcon className="size-1/2" />}
    </span>
  );
}
