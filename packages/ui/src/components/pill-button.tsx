import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * The rounded buttons used throughout the designs. Apply `pillButtonVariants`
 * to a link when the action navigates.
 */
const pillButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2.5 rounded-full font-sans whitespace-nowrap transition-[filter,background-color,border-color] outline-none select-none focus-visible:ring-2 focus-visible:ring-ember-glow/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        ember:
          "bg-ember-gradient font-semibold text-button-ink shadow-[0_14px_34px_rgba(226,112,31,0.3)] hover:brightness-110",
        outline: "border border-white/20 text-bone hover:border-white/35 hover:bg-white/5",
        ghost: "text-bone hover:text-ember-glow",
      },
      size: {
        sm: "px-5 py-[11px] text-sm",
        md: "px-[26px] py-[15px] text-[15px]",
        lg: "px-7 py-4 text-base",
        block: "h-[50px] w-full px-6 text-[15px]",
      },
    },
    defaultVariants: { variant: "ember", size: "md" },
  },
);

function PillButton({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof pillButtonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="pill-button"
      className={cn(pillButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

/** The small chevron that trails "See how a day works". */
function Chevron({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-1.5 rotate-45 border-t-[1.5px] border-r-[1.5px] border-ember-glow",
        className,
      )}
    />
  );
}

export { Chevron, PillButton, pillButtonVariants };
