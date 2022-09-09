import { createSlice, EntityId, PayloadAction } from '@reduxjs/toolkit';
import { BudgetState, BUDGET_FEATURE_KEY } from './constants';
import { budgetAdapter } from './adapter';
import { fetchAll } from './thunks/fetch';
import { removeOne } from './thunks/remove';
import { updateOne } from './thunks/update';
import { createOne } from './thunks/create';

const initialBudgetState: BudgetState = budgetAdapter.getInitialState({
  loading: 'not loaded',
  creating: 'not created',
});

const budgetSlice = createSlice({
  name: BUDGET_FEATURE_KEY,
  initialState: initialBudgetState,
  reducers: {
    removeAll: budgetAdapter.removeAll,
    resetCreating: (state) => {
      state.creating = 'not created';
    },
    resetOneLoading: (state, action: PayloadAction<EntityId>) =>
      budgetAdapter.updateOne(state, {
        id: action.payload,
        changes: {
          loading: 'loaded',
        },
      })
  },
  extraReducers: (builder) => {
    fetchAll.reducers(builder, budgetAdapter);
    createOne.reducers(builder, budgetAdapter);
    updateOne.reducers(builder, budgetAdapter);
    removeOne.reducers(builder, budgetAdapter);
  },
});

export const budgetActions = budgetSlice.actions;

export const budgetReducer = budgetSlice.reducer;

export const budgetThunks = {
  fetchAll,
  createOne,
  updateOne,
  removeOne,
  resetCreating: budgetActions.resetCreating,
  resetOneLoading: budgetActions.resetOneLoading,
};
