import { createAsyncThunkWithReducers, fromUnknownError } from '@planner/common-web';
import { removeRecord } from '../../utils/api';
import { BudgetId, BudgetState } from '../constants';
import { getAuthTokenFromThunk, getEntityFromThunk } from './utils';

export const removeOne = createAsyncThunkWithReducers<BudgetState, BudgetId, BudgetId>(
  'budget/removeOne',
  async (id, thunkAPI) => {
    const authToken = getAuthTokenFromThunk(thunkAPI);
    const { type } = getEntityFromThunk(id, thunkAPI).record;
    await removeRecord(id, type, authToken);
    return id;
  },
  (thunk, builder, adapter) => {
    builder
      .addCase(thunk.pending, (state, action) => {
        adapter.updateOne(state, {
          id: action.meta.arg,
          changes: {
            loading: 'loading',
          },
        });
      })
      .addCase(thunk.fulfilled, (state, action) => {
        adapter.removeOne(state, action.payload);
      })
      .addCase(thunk.rejected, (state, action) => {
        adapter.updateOne(state, {
          id: action.meta.arg,
          changes: {
            loading: fromUnknownError(action.payload),
          },
        });
      });
  },
);
