import { AuthToken, selectAuthToken, AuthorizationError } from '@planner/auth-web';
import { ThunkAPI } from '@planner/common-web';
import { BudgetEntity } from './constants';
import { selectBudgetById } from './selectors';

export function getStateFromThunk(thunkAPI: { getState(): unknown }) {
  return thunkAPI.getState() as Record<string, unknown>;
}

export function getAuthTokenFromThunk(thunkAPI: ThunkAPI): AuthToken {
  const state = getStateFromThunk(thunkAPI);
  const authToken = selectAuthToken(state);

  if (!authToken) {
    throw new AuthorizationError();
  }

  return authToken;
}

export function getEntityFromThunk(id: BudgetEntity['id'], thunkAPI: ThunkAPI): BudgetEntity {
  const state = getStateFromThunk(thunkAPI);
  const entity = selectBudgetById(id)(state);

  if (!entity) {
    throw new Error(`Budget record with id ${id} not found`);
  }

  return entity;
}
