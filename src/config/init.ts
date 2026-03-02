import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import { DEFAULT_CONFIG } from "./defaults.js";

const BLUEPRINT_DIRS = [
  "contracts/api",
  "contracts/external",
  "contracts/files",
  "contracts/internal",
  "concepts",
  "decisions",
];

/**
 * .blueprint/ ディレクトリを初期化する。
 * 既存の blueprint.yaml は上書きしない。
 */
export function initBlueprint(projectRoot: string): void {
  const bpDir = path.join(projectRoot, ".blueprint");

  // ディレクトリ作成
  for (const dir of BLUEPRINT_DIRS) {
    fs.mkdirSync(path.join(bpDir, dir), { recursive: true });
  }

  // blueprint.yaml 生成（既存があれば上書きしない）
  const yamlPath = path.join(bpDir, "blueprint.yaml");
  if (!fs.existsSync(yamlPath)) {
    const content = yaml.dump(DEFAULT_CONFIG, {
      lineWidth: 120,
      noRefs: true,
    });
    fs.writeFileSync(yamlPath, content, "utf-8");
  }
}
