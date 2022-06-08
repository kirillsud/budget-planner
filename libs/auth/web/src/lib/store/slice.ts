import { createSlice } from '@reduxjs/toolkit';
import { AuthState, AUTH_FEATURE_KEY } from './constants';
import { login } from './thunks/login';
import { logout } from './thunks/logout';
import { refresh } from './thunks/refresh';

export const initialAuthState: AuthState = {
  token: null,
  loading: 'not loaded',
};

export const authSlice = createSlice({
  name: AUTH_FEATURE_KEY,
  initialState: initialAuthState,
  reducers: {},
  extraReducers: (builder) => {
    login.reducers(builder, void 0);
    refresh.reducers(builder, void 0);
    logout.reducers(builder, void 0);
  },
});

export const authReducer = authSlice.reducer;

export const authActions = authSlice.actions;

export const authThunks = {
  login,
  logout,
  refresh,
};
