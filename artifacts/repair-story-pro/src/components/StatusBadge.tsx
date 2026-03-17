import { cn } from "@/lib/utils";

const statusConfig = {
  new: { label: "Новый", classes: "bg-slate-100 text-slate-700 border-slate-200" },
  accepted: { label: "Принят", classes: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  diagnosing: { label: "Диагностика", classes: "bg-amber-100 text-amber-700 border-amber-200" },
  repairing: { label: "В ремонте", classes: "bg-purple-100 text-purple-700 border-purple-200" },
  ready: { label: "Готов", classes: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  closed: { label: "Выдан", classes: "bg-gray-100 text-gray-500 border-gray-200" },
};

type BookingStatus = "new" | "accepted" | "diagnosing" | "repairing" | "ready" | "closed";

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as BookingStatus] || statusConfig.new;
  
  return (
    <span className={cn("px-3 py-1 text-xs font-medium rounded-full border shadow-sm", config.classes)}>
      {config.label}
    </span>
  );
}
