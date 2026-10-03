import { BudgetRecord } from '@planner/budget-domain';
import {
  createAsyncThunkWithReducers,
  fromUnknownError,
} from '@planner/common-web';
import { Update } from '@reduxjs/toolkit';
import { updateRecord } from '../../utils/api';
import { BudgetId, BudgetState } from '../constants';
import { getAuthTokenFromThunk, getEntityFromThunk } from './utils';

export const updateOne = createAsyncThunkWithReducers<
  BudgetState,
  BudgetRecord,
  Update<BudgetRecord>
>(
  'budget/updateOne',
  async (update, thunkAPI) => {
    const authToken = getAuthTokenFromThunk(thunkAPI);
    const { record } = getEntityFromThunk(update.id as BudgetId, thunkAPI);

    const data = await updateRecord(
      { ...record, ...update.changes },
      authToken
    );
    return data as BudgetRecord;
  },
  (thunk, builder, adapter) => {
    builder
      .addCase(thunk.pending, (state, action) => {
        adapter.updateOne(state, {
          id: action.meta.arg.id,
          changes: {
            loading: 'loading',
          },
        });
      })
      .addCase(thunk.fulfilled, (state, action) => {
        const record = action.payload;

        adapter.updateOne(state, {
          id: record.id,
          changes: {
            record,
            loading: 'loaded',
          },
        });
      })
      .addCase(thunk.rejected, (state, action) => {
        adapter.updateOne(state, {
          id: action.meta.arg.id,
          changes: {
            loading: fromUnknownError(action.payload),
          },
        });
      });
  }
);
