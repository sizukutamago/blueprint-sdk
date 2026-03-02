export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly stage?: string,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

import type { GateFailReason } from "./types.js";

export class GateFailedError extends PipelineError {
  constructor(
    gate: string,
    public readonly reason: GateFailReason,
  ) {
    super(`Gate "${gate}" failed: ${reason}`, gate);
    this.name = "GateFailedError";
  }
}

export class StateLoadError extends PipelineError {
  constructor(message: string) {
    super(message);
    this.name = "StateLoadError";
  }
}

export class StructuredOutputError extends PipelineError {
  constructor(
    stage: string,
    public readonly parseErrors: string[],
  ) {
    super(
      `Structured output validation failed in "${stage}": ${parseErrors.join(", ")}`,
      stage,
    );
    this.name = "StructuredOutputError";
  }
}
