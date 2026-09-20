"use client";

import { useMutation } from "@tanstack/react-query";
import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc";

import { Icon } from "./icon";
import { Button } from "./kit";

const STARTER = `# Untitled issue

Start with a story or a principle.

> A line worth keeping.

---

**The Inner War** turns one principle a day into one action you can finish before dinner.

[Start your first campaign](https://innerwar.app)
`;

/** "Write an issue": creates a draft and opens the editor (N1, N2). */
export function WriteIssueButton() {
  const router = useRouter();
  const create = useMutation(
    trpc.dispatch.saveIssue.mutationOptions({
      onSuccess: (issue) => {
        console.info("[dispatch] draft created", issue.id);
        router.push(`/issues/${issue.id}/edit`);
      },
    }),
  );
  return (
    <Button variant="ember" pending={create.isPending} onClick={() => create.mutate({ subject: "Untitled issue", body: STARTER })}>
      <Icon icon={PencilEdit02Icon} size={15} /> Write an issue
    </Button>
  );
}
