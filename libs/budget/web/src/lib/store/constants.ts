import { BudgetRecord } from '@planner/budget-domain';

export type BudgetId = BudgetRecord['id'];

export interface BudgetEntity {
  id: BudgetId;
  record: BudgetRecord;
  loadingStatus: 'loading' | 'loaded' | 'error';
  error?: string | Error;
}

export const BUDGET_FEATURE_KEY = 'budget';
