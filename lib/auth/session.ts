import { cookies } from "next/headers";

export async function getOwnerId() {
  return (await cookies()).get("milo_owner")?.value ?? "00000000-0000-4000-8000-000000000001";
}
