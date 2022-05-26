import { BudgetRecord } from '@planner/budget-domain';
import { createAsyncThunkWithReducers, fromUnknownError } from '@planner/common-web';
import { Update } from '@reduxjs/toolkit';
import { updateRecord } from '../../utils/api';
import { BudgetState, budgetAdapter } from '../adapter';
import { BudgetId } from '../constants';
import { getAuthTokenFromThunk, getEntityFromThunk } from '../utils';

export const updateOne = createAsyncThunkWithReducers<BudgetState, BudgetRecord, Update<BudgetRecord>>(
  'budget/updateOne',
  async (update, thunkAPI) => {
    const authToken = getAuthTokenFromThunk(thunkAPI);
    const { record } = getEntityFromThunk(update.id as BudgetId, thunkAPI);

    const data = await updateRecord({ ...record, ...update.changes }, authToken);
    return data as BudgetRecord;
  },
  (thunk, builder) => {
    builder
      .addCase(thunk.pending, (state, action) => {
        const { id } = action.meta.arg;

        budgetAdapter.updateOne(state, {
          id,
          changes: {
            loadingStatus: 'loading',
            error: undefined,
          },
        });
      })
      .addCase(thunk.fulfilled, (state, action) => {
        const record = action.payload;

        budgetAdapter.updateOne(state, {
          id: record.id,
          changes: {
            record,
            loadingStatus: 'loaded',
            error: undefined,
          },
        });
      })
      .addCase(thunk.rejected, (state, action) => {
        const { id } = action.meta.arg;
        const error = action.payload;

        budgetAdapter.updateOne(state, {
          id,
          changes: {
            loadingStatus: 'error',
            error: fromUnknownError(error),
          },
        });
      });
  },
);
