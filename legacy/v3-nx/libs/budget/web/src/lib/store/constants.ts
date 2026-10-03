import { BudgetRecord } from '@planner/budget-domain';
import { LoadingState } from '@planner/common-web';
import { EntityState } from '@reduxjs/toolkit';

export const BUDGET_FEATURE_KEY = 'budget';

export type BudgetId = BudgetRecord['id'];

export interface BudgetEntity {
  id: BudgetId;
  record: BudgetRecord;
  loading: LoadingState;
}

export interface BudgetState extends EntityState<BudgetEntity> {
  loading: LoadingState<'not loaded'>;
  creating: LoadingState<'not created', Error, 'success'>;
}
