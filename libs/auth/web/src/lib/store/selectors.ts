import { createSelector } from '@reduxjs/toolkit';
import { AuthState, AUTH_FEATURE_KEY } from './constants';

export const getAuthState = (rootState: Record<string, unknown>): AuthState =>
  rootState[AUTH_FEATURE_KEY] as AuthState;

export const selectAuthToken =
  createSelector(getAuthState, (x) => x.token);

export const selectAuthLoadingStatus =
  createSelector(getAuthState, (x) => x.loading);
