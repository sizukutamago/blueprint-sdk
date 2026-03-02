import { toErrorMessage } from "../utils/to-error-message.js";

export interface ParallelTask<T> {
  name: string;
  fn: () => Promise<T>;
}

export interface ParallelResult<T> {
  name: string;
  result: T | null;
  error?: string;
}

export async function runParallel<T>(
  tasks: ParallelTask<T>[],
): Promise<ParallelResult<T>[]> {
  const settled = await Promise.allSettled(tasks.map((t) => t.fn()));
  return tasks.map((task, i) => {
    const r = settled[i]!;
    if (r.status === "fulfilled") {
      return { name: task.name, result: r.value };
    }
    const error = toErrorMessage(r.reason);
    return { name: task.name, result: null, error };
  });
}
