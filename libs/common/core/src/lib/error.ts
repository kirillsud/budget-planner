export const UNKNOWN_ERROR = 'unknown';

export type ErrorBase = {
  // Human-readable error message
  message: string;
  // Error code for translation
  type: string;
  // Additional error data for translation
  context?: {
    [key: string]: unknown;
  }
};
