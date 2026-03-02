import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { initBlueprint } from "../../src/config/init.js";

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "init-test-"));
}

describe("initBlueprint", () => {
  it("creates .blueprint/ directory structure", () => {
    const tmpDir = makeTmpDir();
    initBlueprint(tmpDir);

    expect(fs.existsSync(path.join(tmpDir, ".blueprint"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".blueprint", "blueprint.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".blueprint", "contracts"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".blueprint", "contracts", "api"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".blueprint", "contracts", "external"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".blueprint", "contracts", "files"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".blueprint", "contracts", "internal"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".blueprint", "concepts"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".blueprint", "decisions"))).toBe(true);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("generates a valid blueprint.yaml", () => {
    const tmpDir = makeTmpDir();
    initBlueprint(tmpDir);

    const yamlContent = fs.readFileSync(
      path.join(tmpDir, ".blueprint", "blueprint.yaml"),
      "utf-8",
    );
    expect(yamlContent).toContain("pipeline:");
    expect(yamlContent).toContain("mode: full");
    expect(yamlContent).toContain("gates:");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("does not overwrite existing blueprint.yaml", () => {
    const tmpDir = makeTmpDir();
    const bpDir = path.join(tmpDir, ".blueprint");
    fs.mkdirSync(bpDir, { recursive: true });
    fs.writeFileSync(path.join(bpDir, "blueprint.yaml"), "custom: true\n");

    initBlueprint(tmpDir);

    const content = fs.readFileSync(path.join(bpDir, "blueprint.yaml"), "utf-8");
    expect(content).toBe("custom: true\n");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("creates directories even if blueprint.yaml exists", () => {
    const tmpDir = makeTmpDir();
    const bpDir = path.join(tmpDir, ".blueprint");
    fs.mkdirSync(bpDir, { recursive: true });
    fs.writeFileSync(path.join(bpDir, "blueprint.yaml"), "custom: true\n");

    initBlueprint(tmpDir);

    expect(fs.existsSync(path.join(bpDir, "contracts", "api"))).toBe(true);

    fs.rmSync(tmpDir, { recursive: true });
  });
});
