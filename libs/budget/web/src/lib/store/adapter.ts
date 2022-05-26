import { EntityState, createEntityAdapter } from '@reduxjs/toolkit';
import { BudgetEntity } from './constants';

export interface BudgetState extends EntityState<BudgetEntity> {
  loadingStatus: 'not loaded' | 'loading' | 'loaded' | 'error';
  createStatus: 'not created' | 'loading' | 'success' | 'error';
  createError?: string | Error;
  error?: string;
}

export const budgetAdapter = createEntityAdapter<BudgetEntity>();