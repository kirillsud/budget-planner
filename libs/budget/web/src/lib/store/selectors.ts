import { createSelector, EntityId } from '@reduxjs/toolkit';
import { budgetAdapter, BudgetState } from './adapter';
import { BUDGET_FEATURE_KEY } from './constants';

const { selectAll, selectEntities, selectById } = budgetAdapter.getSelectors();

export const getBudgetState = (rootState: Record<string, unknown>): BudgetState =>
  rootState[BUDGET_FEATURE_KEY] as BudgetState;

export const selectAllBudget = createSelector(getBudgetState, selectAll);

export const selectBudgetEntities = createSelector(
  getBudgetState,
  selectEntities
);

export const selectBudgetLoading =
  createSelector(getBudgetState, (x) => x.loadingStatus);

export const selectBudgetCreating =
  createSelector(getBudgetState, (x) => x.createStatus);

export const selectBudgetCreatingError =
  createSelector(getBudgetState, (x) => x.createError);

export const selectBudgetById = (id: EntityId) =>
  createSelector(getBudgetState, (state) => selectById(state, id));
