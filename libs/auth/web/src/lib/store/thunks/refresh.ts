import { config, createAsyncThunkWithReducers } from '@planner/common-web';
import { AuthState, AuthToken, authTokenStorageKey } from '../constants';

const { apiUrl } = config();

export const refresh = createAsyncThunkWithReducers<AuthState, AuthToken>(
  'auth/refresh',
  async (_, thunkAPI) => {
    const authToken = localStorage.getItem(authTokenStorageKey);
    if (!authToken) {
      return;
    }

    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'get',
      headers: {
        'Authorization': authToken,
      },
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
      .addCase(thunk.pending, (state) => {
        state.loading = 'refreshing';
      })
      .addCase(thunk.fulfilled, (state, action) => {
        state.token = action.payload;
        state.loading = 'loaded';

        localStorage.setItem(authTokenStorageKey, state.token);
      })
      .addCase(thunk.rejected, (state: AuthState) => {
        state.token = null;
        state.loading = 'not loaded';
      });
  }
);
