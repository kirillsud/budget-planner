export function fromUnknownError(error: unknown): Error | string {
  return error instanceof Error ? error : (error as string)?.toString();
}
