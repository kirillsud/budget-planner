import { BudgetRecord } from '@planner/budget-domain';
import { createAsyncThunkWithReducers, fromUnknownError } from '@planner/common-web';
import { createRecord } from '../../utils/api';
import { BudgetState, budgetAdapter } from '../adapter';
import { getAuthTokenFromThunk } from '../utils';

export const createOne = createAsyncThunkWithReducers<BudgetState, BudgetRecord, Omit<BudgetRecord, 'id' | 'completed'>>(
  'budget/createOne',
  async (record, thunkAPI) => {
    const authToken = getAuthTokenFromThunk(thunkAPI);

    const data = await createRecord(record, authToken);
    return data as BudgetRecord;
  },
  (thunk, builder) => {
    builder
      .addCase(thunk.pending, (state) => {
        state.createStatus = 'loading'
        state.createError = undefined;
      })
      .addCase(thunk.fulfilled, (state, action) => {
        const record = action.payload;

        budgetAdapter.addOne(state, {
          id: record.id,
          record,
          loadingStatus: 'loaded',
        });

        state.createStatus = 'success';
        state.createError = undefined;
      })
      .addCase(thunk.rejected, (state, action) => {
        const error = action.payload;

        state.createStatus = 'error';
        state.createError = fromUnknownError(error);
      });
  },
);
