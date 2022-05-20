import {
  Action,
  AnyAction,
  createAsyncThunk,
  createSelector,
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';
import { config } from '@planner/common-web';

const authTokenStorageKey = 'authToken';

const { apiUrl } = config();

export const AUTH_FEATURE_KEY = 'auth';

export type AuthToken = string;

export interface AuthState {
  token: AuthToken | null;
  loadingStatus: 'not loaded' | 'loading' | 'loaded' | 'error';
  error?: string;
}

export interface LoginParams {
  email: string;
  password: string;
  remember: boolean;
}

export const authLogin = createAsyncThunk(
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
  }
);

export const authLogout = createAsyncThunk(
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
  }
);

export const initialAuthState: AuthState = {
  token: localStorage.getItem(authTokenStorageKey),
  loadingStatus: 'not loaded',
};

export const authSlice = createSlice({
  name: AUTH_FEATURE_KEY,
  initialState: initialAuthState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(authLogin.pending, (state: AuthState) => {
        state.loadingStatus = 'loading';
        state.error = undefined;
      })
      .addCase(
        authLogin.fulfilled,
        (state: AuthState, action: PayloadAction<AuthToken>) => {
          const token = action.payload;
          state.token = token;
          state.loadingStatus = 'loaded';

          localStorage.setItem(authTokenStorageKey, token);
        }
      )
      .addCase(authLogin.rejected, (state: AuthState, action) => {
        state.loadingStatus = 'error';
        state.error = action.payload as string;
      });

    builder
      .addCase(authLogout.pending, (state: AuthState) => {
        state.loadingStatus = 'loading';
        state.error = undefined;
      })
      .addCase(authLogout.fulfilled, (state: AuthState) => {
        state.token = null;
        state.loadingStatus = 'loaded';

        localStorage.removeItem(authTokenStorageKey);
      })
      .addCase(authLogout.rejected, (state: AuthState, action) => {
        state.loadingStatus = 'error';
        state.error = action.error.message;
      });
  },
});

export const authReducer = authSlice.reducer;
export const authActions = authSlice.actions;

export const getAuthState = (rootState: {
  [AUTH_FEATURE_KEY]: AuthState;
}): AuthState => rootState[AUTH_FEATURE_KEY];

export const selectAuthToken = createSelector(getAuthState, (x) => x.token);
export const selectAuthError = createSelector(getAuthState, (x) => x.error);
export const selectAuthLoadingStatus = createSelector(
  getAuthState,
  (x) => x.loadingStatus
);
