import { LucideIcon, Play, Eye } from "lucide-react";

interface ActivityItemProps {
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  title: string;
  timestamp: string;
  type: "music" | "image";
  onAction: () => void;
}

export default function ActivityItem({
  icon: Icon,
  bgColor,
  textColor,
  title,
  timestamp,
  type,
  onAction,
}: ActivityItemProps) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-softer flex items-center space-x-3 border border-neutral-light">
      <div className={`${bgColor} rounded-full p-2 ${textColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-neutral-dark">{timestamp}</p>
      </div>
      <button
        className={`text-neutral-dark hover:${textColor}`}
        onClick={onAction}
      >
        {type === "music" ? (
          <Play className="h-5 w-5" />
        ) : (
          <Eye className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
