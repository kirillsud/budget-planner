import { configureStore } from '@reduxjs/toolkit';
import { BUDGET_FEATURE_KEY, budgetReducer } from '@planner/budget-web';
import { AUTH_FEATURE_KEY, authReducer } from '@planner/auth-web';

const store = configureStore({
  reducer: {
    [BUDGET_FEATURE_KEY]: budgetReducer,
    [AUTH_FEATURE_KEY]: authReducer,
  },
  // Additional middleware can be passed to this array
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: false
  }),
  devTools: process.env['NODE_ENV'] !== 'production',
  // Optional Redux store enhancers
  enhancers: [],
});

export default store;
