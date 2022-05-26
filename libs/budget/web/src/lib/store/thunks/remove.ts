import { createAsyncThunkWithReducers, fromUnknownError } from '@planner/common-web';
import { removeRecord } from '../../utils/api';
import { BudgetState, budgetAdapter } from '../adapter';
import { BudgetId } from '../constants';
import { getAuthTokenFromThunk, getEntityFromThunk } from '../utils';

export const removeOne = createAsyncThunkWithReducers<BudgetState, BudgetId, BudgetId>(
  'budget/removeOne',
  async (id, thunkAPI) => {
    const authToken = getAuthTokenFromThunk(thunkAPI);
    const { type } = getEntityFromThunk(id, thunkAPI).record;
    await removeRecord(id, type, authToken);
    return id;
  },
  (thunk, builder) => {
    builder
      .addCase(thunk.pending, (state, action) => {
        const id = action.meta.arg;

        budgetAdapter.updateOne(state, {
          id,
          changes: {
            loadingStatus: 'loading',
            error: undefined,
          },
        });
      })
      .addCase(thunk.fulfilled, (state, action) => {
        budgetAdapter.removeOne(state, action.payload);
      })
      .addCase(thunk.rejected, (state, action) => {
        const id = action.meta.arg;

        budgetAdapter.updateOne(state, {
          id,
          changes: {
            loadingStatus: 'error',
            error: fromUnknownError(action.payload),
          },
        });
      });
  },
);
