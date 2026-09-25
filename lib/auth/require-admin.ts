import { isAdmin } from "./admin-session";
export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("ADMIN_UNAUTHORIZED");
}
