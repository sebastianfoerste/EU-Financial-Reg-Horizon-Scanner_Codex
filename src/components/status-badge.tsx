import { AlertTriangle, CheckCircle2, Circle, Flame, SignalHigh } from "lucide-react";

import { cn } from "@/lib/utils";

const bucketStyles = {
  CRITICAL: "border-red-200 bg-red-50 text-red-900",
  HIGH: "border-orange-200 bg-orange-50 text-orange-900",
  MEDIUM: "border-teal-200 bg-teal-50 text-teal-900",
  LOW: "border-zinc-200 bg-zinc-50 text-zinc-700",
  NONE: "border-zinc-200 bg-white text-zinc-500",
};

const bucketIcons = {
  CRITICAL: Flame,
  HIGH: AlertTriangle,
  MEDIUM: SignalHigh,
  LOW: CheckCircle2,
  NONE: Circle,
};

export function StatusBadge({ bucket, score }: { bucket: keyof typeof bucketStyles; score?: number }) {
  const Icon = bucketIcons[bucket];
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-semibold",
        bucketStyles[bucket],
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {bucket}
      {typeof score === "number" ? ` ${Math.round(score)}` : null}
    </span>
  );
}
