import { BudgetRecord } from '@planner/budget-domain';
import {
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
  createSlice,
  EntityState,
  PayloadAction,
} from '@reduxjs/toolkit';

export const BUDGET_FEATURE_KEY = 'budget';

/*
 * Update these interfaces according to your requirements.
 */
export type BudgetEntity = BudgetRecord;

export interface BudgetState extends EntityState<BudgetEntity> {
  loadingStatus: 'not loaded' | 'loading' | 'loaded' | 'error';
  error?: string;
}

export const budgetAdapter = createEntityAdapter<BudgetEntity>();

/**
 * Export an effect using createAsyncThunk from
 * the Redux Toolkit: https://redux-toolkit.js.org/api/createAsyncThunk
 *
 * e.g.
 * ```
 * import React, { useEffect } from 'react';
 * import { useDispatch } from 'react-redux';
 *
 * // ...
 *
 * const dispatch = useDispatch();
 * useEffect(() => {
 *   dispatch(fetchBudget())
 * }, [dispatch]);
 * ```
 */
export const fetchBudget = createAsyncThunk(
  'budget/fetchStatus',
  async (_, thunkAPI) => {
    /**
     * Replace this with your custom fetch call.
     * For example, `return myApi.getBudgets()`;
     * Right now we just return an empty array.
     */
    return Promise.resolve([]);
  }
);

export const initialBudgetState: BudgetState = budgetAdapter.getInitialState({
  loadingStatus: 'not loaded'
});

export const budgetSlice = createSlice({
  name: BUDGET_FEATURE_KEY,
  initialState: initialBudgetState,
  reducers: {
    add: budgetAdapter.addOne,
    addMany: budgetAdapter.addMany,
    remove: budgetAdapter.removeOne,
    removeAll: budgetAdapter.removeAll,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBudget.pending, (state: BudgetState) => {
        state.loadingStatus = 'loading';
      })
      .addCase(
        fetchBudget.fulfilled,
        (state: BudgetState, action: PayloadAction<BudgetEntity[]>) => {
          budgetAdapter.setAll(state, action.payload);
          state.loadingStatus = 'loaded';
        }
      )
      .addCase(fetchBudget.rejected, (state: BudgetState, action) => {
        state.loadingStatus = 'error';
        state.error = action.error.message ?? '';
      });
  },
});

/*
 * Export reducer for store configuration.
 */
export const budgetReducer = budgetSlice.reducer;

/*
 * Export action creators to be dispatched. For use with the `useDispatch` hook.
 *
 * e.g.
 * ```
 * import React, { useEffect } from 'react';
 * import { useDispatch } from 'react-redux';
 *
 * // ...
 *
 * const dispatch = useDispatch();
 * useEffect(() => {
 *   dispatch(budgetActions.add({ id: 1 }))
 * }, [dispatch]);
 * ```
 *
 * See: https://react-redux.js.org/next/api/hooks#usedispatch
 */
export const budgetActions = budgetSlice.actions;

/*
 * Export selectors to query state. For use with the `useSelector` hook.
 *
 * e.g.
 * ```
 * import { useSelector } from 'react-redux';
 *
 * // ...
 *
 * const entities = useSelector(selectAllBudget);
 * ```
 *
 * See: https://react-redux.js.org/next/api/hooks#useselector
 */
const { selectAll, selectEntities } = budgetAdapter.getSelectors();

export const getBudgetState = (rootState: any): BudgetState =>
  rootState[BUDGET_FEATURE_KEY];

export const selectAllBudget = createSelector(getBudgetState, selectAll);

export const selectAllIncomes = createSelector(getBudgetState, (state: BudgetState) => {
  return selectAll(state).filter(x => x.type === 'income');
});

export const selectAllExpenses = createSelector(getBudgetState, (state: BudgetState) => {
  return selectAll(state).filter(x => x.type === 'expense');
});

export const selectBudgetEntities = createSelector(
  getBudgetState,
  selectEntities,
);
