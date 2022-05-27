import { createEntityAdapter } from '@reduxjs/toolkit';
import { BudgetEntity } from './constants';

export const budgetAdapter = createEntityAdapter<BudgetEntity>();

export const budgetSelectors = budgetAdapter.getSelectors();
