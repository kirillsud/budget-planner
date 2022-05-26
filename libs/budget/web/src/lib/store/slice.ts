import { createSlice } from '@reduxjs/toolkit';
import { BUDGET_FEATURE_KEY } from './constants';
import { budgetAdapter, BudgetState } from './adapter';
import { fetchAll } from './thunks/fetch';
import { removeOne } from './thunks/remove';
import { updateOne } from './thunks/update';
import { createOne } from './thunks/create';

const initialBudgetState: BudgetState = budgetAdapter.getInitialState({
  loadingStatus: 'not loaded',
  createStatus: 'not created',
});

const budgetSlice = createSlice({
  name: BUDGET_FEATURE_KEY,
  initialState: initialBudgetState,
  reducers: {
    removeAll: budgetAdapter.removeAll,
  },
  extraReducers: (builder) => {
    fetchAll.reducers(builder);
    createOne.reducers(builder);
    updateOne.reducers(builder);
    removeOne.reducers(builder);
  },
});

export const budgetActions = budgetSlice.actions;

export const budgetReducer = budgetSlice.reducer;

export const budgetThunks = {
  fetchAll,
  createOne,
  updateOne,
  removeOne,
}
