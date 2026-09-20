import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import type { ComponentProps } from "react";

/**
 * Hugeicons at Dispatch's weight. Icons inherit the surrounding colour and are
 * hidden from screen readers; every one sits beside its own label.
 */
export function Icon({
  icon,
  size = 16,
  strokeWidth = 1.6,
  className,
  ...props
}: { icon: IconSvgElement; size?: number; strokeWidth?: number } & Omit<
  ComponentProps<typeof HugeiconsIcon>,
  "icon" | "size" | "strokeWidth"
>) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      color="currentColor"
      aria-hidden="true"
      className={cn("flex-none", className)}
      {...props}
    />
  );
}
