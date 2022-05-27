import {
  createSelector,
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';
import { config, createAsyncThunkWithReducers, fromUnknownError, LoadingState } from '@planner/common-web';

const authTokenStorageKey = 'authToken';

const { apiUrl } = config();

export const AUTH_FEATURE_KEY = 'auth';

export type AuthToken = string;

export interface AuthState {
  token: AuthToken | null;
  loading: LoadingState<'not loaded'>;
}

export interface LoginParams {
  email: string;
  password: string;
  remember: boolean;
}

export const authLogin = createAsyncThunkWithReducers<AuthState, AuthToken, LoginParams>(
  'auth/login',
  async (authData: LoginParams, thunkAPI) => {
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authData),
    });

    const data = await response.json();
    const jwt = data.jwt;

    if (response.status !== 200 || !jwt) {
      return thunkAPI.rejectWithValue(data.message);
    }

    return data.jwt;
  },
  (thunk, builder) => {
    builder
      .addCase(thunk.pending, (state: AuthState) => {
        state.loading = 'loading';
      })
      .addCase(
        thunk.fulfilled,
        (state: AuthState, action: PayloadAction<AuthToken>) => {
          const token = action.payload;
          state.token = token;
          state.loading = 'loaded';

          localStorage.setItem(authTokenStorageKey, token);
        }
      )
      .addCase(thunk.rejected, (state: AuthState, action) => {
        state.loading = fromUnknownError(action.payload);
      });
  }
);

export const authLogout = createAsyncThunkWithReducers<AuthState, void>(
  'auth/logout',
  async (_, thunkAPI) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authToken = selectAuthToken(thunkAPI.getState() as any);
    if (!authToken) {
      return;
    }

    await fetch(`${apiUrl}/auth/logout`, {
      headers: {
        Authorization: authToken,
      },
    });
  },
  (thunk, builder) => {
    builder
      .addCase(thunk.pending, (state: AuthState) => {
        state.loading = 'loading';
      })
      .addCase(thunk.fulfilled, (state: AuthState) => {
        state.token = null;
        state.loading = 'loaded';

        localStorage.removeItem(authTokenStorageKey);
      })
      .addCase(thunk.rejected, (state: AuthState, action) => {
        state.loading = fromUnknownError(action.error.message);
      });
  }
);

export const initialAuthState: AuthState = {
  token: localStorage.getItem(authTokenStorageKey),
  loading: 'not loaded',
};

export const authSlice = createSlice({
  name: AUTH_FEATURE_KEY,
  initialState: initialAuthState,
  reducers: {},
  extraReducers: (builder) => {
    authLogin.reducers(builder, void 0);
    authLogout.reducers(builder, void 0);
  },
});

export const authReducer = authSlice.reducer;

export const authActions = authSlice.actions;

export const getAuthState = (rootState: Record<string, unknown>): AuthState =>
  rootState[AUTH_FEATURE_KEY] as AuthState;

export const selectAuthToken =
  createSelector(getAuthState, (x) => x.token);

export const selectAuthLoadingStatus =
  createSelector(getAuthState, (x) => x.loading);
