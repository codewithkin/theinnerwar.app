import { createHmac, timingSafeEqual } from "node:crypto";

// HMAC-signed values that travel in email links and the Dispatch session.
// Each purpose is domain-separated so a token for one cannot be used for another.

type Purpose = "unsubscribe" | "open" | "click" | "admin";

function sign(secret: string, purpose: Purpose, value: string) {
  return createHmac("sha256", secret).update(`${purpose}:${value}`).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function verify(secret: string, purpose: Purpose, value: string, signature: string) {
  return safeEqual(sign(secret, purpose, value), signature);
}

/** `<subscriberId>.<sig>`; never expires, so old emails keep a working link. */
export function unsubscribeToken(secret: string, subscriberId: string) {
  return `${subscriberId}.${sign(secret, "unsubscribe", subscriberId)}`;
}

export function readUnsubscribeToken(secret: string, token: string): string | null {
  const [id, sig] = token.split(".");
  return id && sig && verify(secret, "unsubscribe", id, sig) ? id : null;
}

export function openSignature(secret: string, deliveryId: string) {
  return sign(secret, "open", deliveryId);
}

export function verifyOpen(secret: string, deliveryId: string, signature: string) {
  return verify(secret, "open", deliveryId, signature);
}

/** Signs the destination too, so the click route cannot be used as an open redirect. */
export function clickSignature(secret: string, deliveryId: string, url: string) {
  return sign(secret, "click", `${deliveryId}\n${url}`);
}

export function verifyClick(secret: string, deliveryId: string, url: string, signature: string) {
  return verify(secret, "click", `${deliveryId}\n${url}`, signature);
}

/** Dispatch session: `<expiresAtMs>.<sig>`, bound to the admin email. */
export function adminToken(secret: string, email: string, ttlMs: number, now = Date.now()) {
  const expires = String(now + ttlMs);
  return `${expires}.${sign(secret, "admin", `${email}\n${expires}`)}`;
}

export function verifyAdminToken(secret: string, email: string, token: string, now = Date.now()) {
  const [expires, sig] = token.split(".");
  if (!expires || !sig || Number(expires) < now) return false;
  return verify(secret, "admin", `${email}\n${expires}`, sig);
}
