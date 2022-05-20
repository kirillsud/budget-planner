export type SourceType = 'params' | 'headers' | 'query' | 'cookies' | 'signedCookies' | 'body';

export interface HttpValidationError {
  message: string;
  validation: {
    [type: string]: {
      [path: string]: ErrorBase;
    }
  };
}

export interface ErrorBase {
  message: string;
  value: unknown;
}