import { config, createAsyncThunkWithReducers, fromUnknownError } from '@planner/common-web';
import { AuthState, authTokenStorageKey } from '../constants';
import { selectAuthToken } from '../selectors';

const { apiUrl } = config();

export const logout = createAsyncThunkWithReducers<AuthState, void>(
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
