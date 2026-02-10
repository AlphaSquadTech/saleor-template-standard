import { cn } from "@/app/utils/functions";

const StatusTag = ({ label, className }: { label: string; className?: string }) => {
  const colorClasses =
    {
      delivered: "bg-green-800/10 text-green-800",
      fulfilled: "bg-green-800/10 text-green-800",
      draft: "bg-yellow-600/10 text-yellow-600 ring-yellow-600",
      unfulfilled: "bg-yellow-600/10 text-yellow-600 ring-yellow-600",
      unconfirmed: "bg-yellow-600/10 text-yellow-600 ring-yellow-600",
      pending: "bg-yellow-400/10 text-yellow-400",
      canceled: "bg-red-600/10 text-red-400",
      expired: "bg-[var(--color-primary-600)]/10 text-[var(--color-primary-600)]",
    }[label.toLowerCase()] || "bg-zinc-400/10 text-zinc-400";
  return (
    <div
      className={cn("font-medium text-sm font-secondary tracking-[-0.25%] px-3.5 ring-1 w-fit py-0.5", colorClasses, className)}
    >
      {label}
    </div>
  );
};

export default StatusTag;
