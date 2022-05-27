import { BudgetRecord } from '@planner/budget-domain';
import {
  createAsyncThunkWithReducers,
  fromUnknownError,
} from '@planner/common-web';
import { fetchRecords } from '../../utils/api';
import { BudgetState } from '../constants';
import { getAuthTokenFromThunk } from './utils';

export const fetchAll = createAsyncThunkWithReducers<
  BudgetState,
  BudgetRecord[]
>(
  'budget/fetchAll',
  async (_, thunkAPI) => {
    const authToken = getAuthTokenFromThunk(thunkAPI);
    return await fetchRecords(authToken);
  },
  (thunk, builder, adapter) => {
    builder
      .addCase(thunk.pending, (state: BudgetState) => {
        state.loading = 'loading';
      })
      .addCase(thunk.fulfilled, (state, action) => {
        adapter.setAll(
          state,
          action.payload.map((record) => ({
            id: record.id,
            record,
            loading: 'loaded',
          }))
        );

        state.loading = 'loaded';
      })
      .addCase(thunk.rejected, (state, action) => {
        state.loading = fromUnknownError(action.payload);
      });
  }
);
