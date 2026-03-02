import type { StageHandler, StageResult, QueryFn, Finding } from "../types.js";
import { loadPromptFile } from "../config/prompt-loader.js";
import { runReviewGate, type ReviewerFn } from "./review-gate.js";
import { parseReviewOutput } from "./schemas.js";
import { toErrorMessage } from "../utils/to-error-message.js";

export interface ReviewGateHandlerOptions {
  gate: "contract" | "test" | "code" | "doc";
  queryFn: QueryFn;
  projectRoot?: string;
  reviewerCount?: number;
}

const GATE_PROMPT_MAP = {
  contract: "review-prompts/contract-reviewer.md",
  test: "review-prompts/test-reviewer.md",
  code: "review-prompts/code-reviewer.md",
  doc: "review-prompts/doc-reviewer.md",
} as const;

const DEFAULT_REVIEWER_COUNT = {
  contract: 3,
  test: 3,
  code: 4,
  doc: 3,
} as const;

function createReviewer(
  queryFn: QueryFn,
  reviewPrompt: string,
  agentIndex: number,
  projectRoot: string,
): ReviewerFn {
  return async () => {
    const prompt = `${reviewPrompt}

You are reviewer agent #${agentIndex + 1}.
Review the project at: ${projectRoot}

Respond with a JSON object following this exact format:
{
  "reviewer": "Agent ${agentIndex + 1}",
  "gate": "...",
  "findings": [
    {
      "severity": "P0" | "P1" | "P2",
      "target": "CON-xxx or file path",
      "field": "field name",
      "message": "issue description",
      "suggestion": "fix suggestion"
    }
  ],
  "summary": { "p0": 0, "p1": 0, "p2": 0 }
}`;

    const response = await queryFn(prompt);
    // queryFn は文字列を返すので JSON パースしてから検証
    let parsed: unknown;
    try {
      parsed = JSON.parse(response);
    } catch {
      // JSON 以外のテキストが含まれる場合、JSON 部分を抽出
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in review response");
      }
    }
    return parseReviewOutput(parsed);
  };
}

export function createReviewGateHandler(
  options: ReviewGateHandlerOptions,
): StageHandler {
  const { gate, queryFn, reviewerCount } = options;
  const count = reviewerCount ?? DEFAULT_REVIEWER_COUNT[gate];

  return async (state, _pipelineOptions): Promise<StageResult> => {
    const projectRoot = options.projectRoot ?? state.project_root;
    const reviewPrompt = loadPromptFile(GATE_PROMPT_MAP[gate], projectRoot);

    const reviewers: ReviewerFn[] = Array.from({ length: count }, (_, i) =>
      createReviewer(queryFn, reviewPrompt, i, projectRoot),
    );

    try {
      const result = await runReviewGate({ gate, reviewers });
      return {
        status: result.status,
        counts: result.counts,
        findings: result.findings,
        reason: result.reason,
      };
    } catch (err) {
      return {
        status: "failed",
        counts: { p0: 0, p1: 0, p2: 0 },
        findings: [],
        reason: toErrorMessage(err),
      };
    }
  };
}
