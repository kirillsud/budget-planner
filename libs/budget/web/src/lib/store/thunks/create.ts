import { BudgetRecord } from '@planner/budget-core';
import {
  createAsyncThunkWithReducers,
  fromUnknownError,
} from '@planner/common-web';
import { createRecord } from '../../utils/api';
import { BudgetState } from '../constants';
import { getAuthTokenFromThunk } from './utils';

export const createOne = createAsyncThunkWithReducers<
  BudgetState,
  BudgetRecord,
  Omit<BudgetRecord, 'id' | 'completed'>
>(
  'budget/createOne',
  async (record, thunkAPI) => {
    const authToken = getAuthTokenFromThunk(thunkAPI);

    const data = await createRecord(record, authToken);
    return data as BudgetRecord;
  },
  (thunk, builder, adapter) => {
    builder
      .addCase(thunk.pending, (state) => {
        state.creating = 'loading';
      })
      .addCase(thunk.fulfilled, (state, action) => {
        const record = action.payload;

        adapter.addOne(state, {
          id: record.id,
          record,
          loading: 'loaded',
        });

        state.creating = 'success';
      })
      .addCase(thunk.rejected, (state, action) => {
        state.creating = fromUnknownError(action.payload);
      });
  }
);
