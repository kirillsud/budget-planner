import { BudgetRecord } from '@planner/budget-domain';
import { createAsyncThunkWithReducers } from '@planner/common-web';
import { fetchRecords } from '../../utils/api';
import { budgetAdapter, BudgetState } from '../adapter';
import { getAuthTokenFromThunk } from '../utils';

export const fetchAll = createAsyncThunkWithReducers<BudgetState, BudgetRecord[]>(
  'budget/fetchAll',
  async (_, thunkAPI) => {
    const authToken = getAuthTokenFromThunk(thunkAPI);
    return await fetchRecords(authToken);
  },
  (thunk, builder) => {
    builder
      .addCase(thunk.pending, (state: BudgetState) => {
        state.loadingStatus = 'loading';
      })
      .addCase(thunk.fulfilled, (state, action) => {
        budgetAdapter.setAll(
          state,
          action.payload.map((record) => ({
            id: record.id,
            record,
            loadingStatus: 'loaded',
          }))
        );

        state.loadingStatus = 'loaded';
      })
      .addCase(thunk.rejected, (state, action) => {
        state.loadingStatus = 'error';
        state.error = action.error.message ?? '';
      });
  }
);
