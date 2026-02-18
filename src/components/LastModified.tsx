import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LastModifiedProps {
  timestamp?: string | null;
  userId?: string | null;
  profiles?: Record<string, string>;
  className?: string;
}

/** Accountability stamp showing last modification time and actor. */
export default function LastModified({ timestamp, userId, profiles, className = "" }: LastModifiedProps) {
  if (!timestamp) return null;
  
  const userName = userId && profiles?.[userId] ? profiles[userId] : userId?.slice(0, 8) ?? "System";
  
  return (
    <div className={`flex items-center gap-1.5 text-[10px] text-muted-foreground/60 ${className}`}>
      <Clock className="h-2.5 w-2.5" />
      <span>{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}</span>
      <span>·</span>
      <span>{userName}</span>
    </div>
  );
}
