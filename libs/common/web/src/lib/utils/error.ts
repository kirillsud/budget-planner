export function fromUnknownError(error: unknown): Error {
  return error instanceof Error ? error : new Error((error as string)?.toString());
}
