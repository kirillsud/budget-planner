export interface WebConfig {
  apiUrl: string;
}

export function config(): WebConfig {
  // TODO: Initialize in the `index.html` file.
  return {
    apiUrl: 'http://localhost:3333/api',
  }
}
