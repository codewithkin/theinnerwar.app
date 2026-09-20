"use client";

import { Button } from "@theinnerwar.app/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@theinnerwar.app/ui/components/dropdown-menu";
import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";

import { Icon } from "@/components/icon";
import { useTheme } from "next-themes";
import * as React from "react";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
        <Icon icon={Sun03Icon} size={19} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Icon icon={Moon02Icon} size={19} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
