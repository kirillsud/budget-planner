import { LoadingState } from '@planner/common-web';

export const AUTH_FEATURE_KEY = 'auth';

export const authTokenStorageKey = 'authToken';

export type AuthToken = string;

export interface AuthState {
  token: AuthToken | null;
  loading: LoadingState<'not loaded'>;
}
