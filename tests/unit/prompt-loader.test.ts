import { describe, it, expect } from "vitest";
import { loadPromptFile, getPromptsDir } from "../../src/config/prompt-loader.js";

describe("getPromptsDir", () => {
  it("returns a valid directory path", () => {
    const dir = getPromptsDir();
    expect(dir).toContain("prompts");
  });
});

describe("loadPromptFile", () => {
  it("loads contract-schema.md", () => {
    const content = loadPromptFile("core/contract-schema.md");
    expect(content).toContain("Contract");
    expect(content.length).toBeGreaterThan(100);
  });

  it("loads contract-api.yaml template", () => {
    const content = loadPromptFile("templates/contract-api.yaml");
    expect(content).toContain("type: api");
  });

  it("loads review prompt", () => {
    const content = loadPromptFile("review-prompts/contract-reviewer.md");
    expect(content.length).toBeGreaterThan(50);
  });

  it("returns empty string for missing file", () => {
    const content = loadPromptFile("nonexistent.md");
    expect(content).toBe("");
  });

  it("loads with project override when available", () => {
    // Without project override, returns SDK default
    const content = loadPromptFile("core/contract-schema.md");
    expect(content).toContain("Contract");
  });
});
