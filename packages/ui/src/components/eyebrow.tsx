import { cn } from "@theinnerwar.app/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

const eyebrowVariants = cva("eyebrow block", {
  variants: {
    tone: {
      ember: "text-ember-glow",
      muted: "text-stone-muted",
      quiet: "text-stone",
    },
    size: {
      xs: "text-[9px] tracking-[0.16em]",
      sm: "text-[10px] tracking-[0.22em]",
    },
  },
  defaultVariants: { tone: "ember", size: "sm" },
});

/** Mono uppercase label above headings and data: "TODAY'S PRINCIPLE". */
function Eyebrow({
  className,
  tone,
  size,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof eyebrowVariants>) {
  return (
    <span
      data-slot="eyebrow"
      className={cn(eyebrowVariants({ tone, size }), className)}
      {...props}
    />
  );
}

export { Eyebrow, eyebrowVariants };
