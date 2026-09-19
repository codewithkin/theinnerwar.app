import { cn } from "@theinnerwar.app/ui/lib/utils";
import { EMBER_PATH } from "@theinnerwar.app/ui/lib/tokens";
import type { ComponentProps } from "react";

/** The ember. Inherits `color`, so size and tint it with text utilities. */
function EmberMark({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      data-slot="ember-mark"
      className={cn("block size-4 flex-none text-ember", className)}
      {...props}
    >
      <path d={EMBER_PATH} fill="currentColor" />
    </svg>
  );
}

/** Mark and name, as in the site nav and footer. */
function Wordmark({ className, ...props }: ComponentProps<"span">) {
  return (
    <span data-slot="wordmark" className={cn("flex items-center gap-2.5", className)} {...props}>
      <EmberMark className="size-[15px]" />
      <span className="font-serif text-lg text-cream">The Inner War</span>
    </span>
  );
}

export { EmberMark, Wordmark };
