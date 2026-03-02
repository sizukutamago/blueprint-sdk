import { describe, it, expect, vi } from "vitest";
import {
  createReviewGateHandler,
  type ReviewGateHandlerOptions,
} from "../../src/gates/review-gate-handler.js";
import { createInitialState } from "../../src/state.js";
import type { PipelineOptions } from "../../src/types.js";

vi.mock("../../src/state.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/state.js")>();
  return { ...original, saveState: vi.fn() };
});

const DEFAULT_OPTIONS: PipelineOptions = {
  cwd: "/tmp/test",
  resume: false,
  force: false,
};

describe("createReviewGateHandler", () => {
  it("returns a StageHandler function", () => {
    const handler = createReviewGateHandler({
      gate: "contract",
      queryFn: vi.fn().mockResolvedValue("{}"),
    });
    expect(typeof handler).toBe("function");
  });

  it("returns passed when no findings", async () => {
    const handler = createReviewGateHandler({
      gate: "contract",
      queryFn: vi.fn().mockResolvedValue(JSON.stringify({
        reviewer: "test",
        gate: "contract",
        findings: [],
        summary: { p0: 0, p1: 0, p2: 0 },
      })),
      reviewerCount: 1,
    });

    const state = createInitialState("/tmp/test");
    const result = await handler(state, DEFAULT_OPTIONS);
    expect(result.status).toBe("passed");
  });

  it("returns failed when P0 findings exist", async () => {
    const handler = createReviewGateHandler({
      gate: "contract",
      queryFn: vi.fn().mockResolvedValue(JSON.stringify({
        reviewer: "test",
        gate: "contract",
        findings: [{
          severity: "P0",
          target: "CON-test",
          field: "input",
          message: "missing required field",
        }],
        summary: { p0: 1, p1: 0, p2: 0 },
      })),
      reviewerCount: 1,
    });

    const state = createInitialState("/tmp/test");
    const result = await handler(state, DEFAULT_OPTIONS);
    expect(result.status).toBe("failed");
  });
});
