import { getOwnerId } from "./session";

export async function requireOwner() {
  const ownerId = await getOwnerId();
  if (!ownerId) throw new Error("UNAUTHORIZED");
  return ownerId;
}
