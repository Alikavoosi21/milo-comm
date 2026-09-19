import { beforeEach } from "vitest";
import { resetGenerationRegistry } from "@/lib/chat/generation-registry";
import { resetStore } from "@/lib/db/repositories";

process.env.MOCK_AI ??= "true";

beforeEach(() => {
  resetGenerationRegistry();
  resetStore();
});
