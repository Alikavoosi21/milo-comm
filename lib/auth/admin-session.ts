import { createHmac, createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/validation/env";

export const ADMIN_COOKIE = "milo_admin_session";
const lifetimeMs = 8 * 60 * 60 * 1000;

function signature(data: string) {
  return createHmac("sha256", env.ADMIN_SESSION_SECRET).update(data).digest("hex");
}
function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function adminConfigured() {
  return Boolean(env.ADMIN_PASSWORD && env.ADMIN_SESSION_SECRET.length >= 16);
}
export function verifyPassword(value: string) {
  if (!adminConfigured()) return false;
  return equal(
    createHash("sha256").update(value).digest("hex"),
    createHash("sha256").update(env.ADMIN_PASSWORD).digest("hex")
  );
}
export function newAdminToken() {
  const data = String(Date.now() + lifetimeMs) + "." + randomUUID();
  return data + "." + signature(data);
}
export function verifyAdminToken(token?: string) {
  if (!token || !adminConfigured()) return false;
  const pieces = token.split(".");
  if (pieces.length !== 3) return false;
  const data = pieces[0] + "." + pieces[1];
  const expiry = Number(pieces[0]);
  return Number.isFinite(expiry) && expiry > Date.now() && equal(pieces[2], signature(data));
}
export async function isAdmin() {
  return verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
