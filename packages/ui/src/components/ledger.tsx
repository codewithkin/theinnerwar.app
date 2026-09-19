import { cn } from "@theinnerwar.app/ui/lib/utils";

export type LedgerState = "kept" | "missed" | "today" | "open" | "locked";

const stateClass: Record<LedgerState, string> = {
  kept: "bg-ember/16 border-ember-light/32 text-ember-glow",
  today: "bg-ember border-ember text-[#1a1613]",
  missed: "bg-white/5 border-white/12 text-ash",
  open: "bg-white/[0.03] border-white/13 text-stone-muted",
  locked: "bg-white/[0.04] border-white/10 text-ash",
};

/** The thirty-day ledger: one numbered dot per campaign day. */
function Ledger({
  days,
  className,
  dotClassName,
}: {
  days: readonly { dayNumber: number; state: LedgerState }[];
  className?: string;
  dotClassName?: string;
}) {
  return (
    <ol data-slot="ledger" className={cn("grid grid-cols-[repeat(15,1fr)] gap-2", className)}>
      {days.map((d) => (
        <li
          key={d.dayNumber}
          aria-label={`Day ${d.dayNumber}: ${d.state}`}
          className={cn(
            "flex aspect-square items-center justify-center rounded-full border font-mono text-[9px]",
            stateClass[d.state],
            dotClassName,
          )}
        >
          {String(d.dayNumber).padStart(2, "0")}
        </li>
      ))}
    </ol>
  );
}

export { Ledger };
