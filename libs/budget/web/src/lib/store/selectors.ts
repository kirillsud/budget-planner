import { createSelector, EntityId } from '@reduxjs/toolkit';
import { BudgetState, BUDGET_FEATURE_KEY } from './constants';
import { budgetSelectors } from './adapter';

export const getBudgetState = (
  rootState: Record<string, unknown>
): BudgetState => rootState[BUDGET_FEATURE_KEY] as BudgetState;

export const selectAllBudget = createSelector(
  getBudgetState,
  budgetSelectors.selectAll
);

export const selectBudgetEntities = createSelector(
  getBudgetState,
  budgetSelectors.selectEntities
);

export const selectBudgetLoading = createSelector(
  getBudgetState,
  (x) => x.loading
);

export const selectBudgetCreating = createSelector(
  getBudgetState,
  (x) => x.creating
);

export const selectBudgetById = (id: EntityId) =>
  createSelector(getBudgetState, (x) => budgetSelectors.selectById(x, id));
