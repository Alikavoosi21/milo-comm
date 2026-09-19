import { beforeEach, describe, expect, it } from "vitest";
import { store } from "@/lib/db/repositories";

describe("UI preferences", () => {
  beforeEach(() => store.themes.clear());
  it("keeps theme isolated by owner", () => { store.themes.set("one", "dark"); store.themes.set("two", "light"); expect(store.themes.get("one")).toBe("dark"); expect(store.themes.get("two")).toBe("light"); });
});
