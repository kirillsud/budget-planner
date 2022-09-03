import { config, createAsyncThunkWithReducers, fromUnknownError, processResponse } from '@planner/common-web';
import { AuthState, AuthToken, authTokenStorageKey } from '../constants';

const { apiUrl } = config();

export interface LoginParams {
  email: string;
  password: string;
  remember: boolean;
}

export const login = createAsyncThunkWithReducers<AuthState, AuthToken, LoginParams>(
  'auth/login',
  async (authData: LoginParams, thunkAPI) => {
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authData),
    });

    try {
      const data = await processResponse<{ jwt: AuthToken }>(response);
      return data.jwt;
    } catch (error: unknown) {
      return thunkAPI.rejectWithValue(error);
    }
  },
  (thunk, builder) => {
    builder
      .addCase(thunk.pending, (state: AuthState) => {
        state.loading = 'loading';
      })
      .addCase(thunk.fulfilled, (state, action) => {
        const token = action.payload;
        state.token = token;
        state.loading = 'loaded';

        if (action.meta.arg.remember) {
          localStorage.setItem(authTokenStorageKey, token);
        }
      })
      .addCase(thunk.rejected, (state: AuthState, action) => {
        state.loading = fromUnknownError(action.payload);
      });
  }
);
