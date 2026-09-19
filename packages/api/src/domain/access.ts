// Free introduction vs. paid campaign (D1 paywall, G7 upgrade prompt).

export type EntitlementLike = {
  status: "TRIALING" | "ACTIVE" | "CANCELED" | "EXPIRED";
  plan: "MONTHLY" | "LIFETIME";
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
};

export function hasPaidAccess(entitlements: readonly EntitlementLike[], now: Date): boolean {
  return entitlements.some((e) => {
    if (e.status === "EXPIRED") return false;
    if (e.plan === "LIFETIME") return e.status !== "CANCELED";
    if (e.status === "TRIALING") return !e.trialEndsAt || e.trialEndsAt > now;
    // An active or canceled monthly plan runs to the end of the paid period.
    return !e.currentPeriodEnd || e.currentPeriodEnd > now;
  });
}

export function canOpenDay(input: {
  dayNumber: number;
  freeDays: number;
  entitlements: readonly EntitlementLike[];
  now: Date;
}): boolean {
  return input.dayNumber <= input.freeDays || hasPaidAccess(input.entitlements, input.now);
}
