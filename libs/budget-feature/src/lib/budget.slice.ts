import { selectAuthToken } from '@planner/auth-feature';
import { BudgetRecord } from '@planner/budget-domain';
import { config } from '@planner/core-web';
import {
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
  createSlice,
  EntityId,
  EntityState,
  Update,
} from '@reduxjs/toolkit';

const { apiUrl } = config();

export const BUDGET_FEATURE_KEY = 'budget';

export interface BudgetEntity {
  id: EntityId;
  record: BudgetRecord;
  loadingStatus: 'loading' | 'loaded' | 'error';
  error?: string;
}

export interface BudgetState extends EntityState<BudgetEntity> {
  loadingStatus: 'not loaded' | 'loading' | 'loaded' | 'error';
  error?: string;
}

export const budgetAdapter = createEntityAdapter<BudgetEntity>();

export const fetchBudget = createAsyncThunk<BudgetRecord[]>(
  'budget/fetchAll',
  async (_, thunkAPI) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authToken = selectAuthToken(thunkAPI.getState() as any);

    if (!authToken) {
      return [];
    }

    const data = await fetch(`${apiUrl}/budget`, {
      headers: {
        Authorization: authToken,
      },
    }).then((_) => _.json());

    return data;
  }
);

export const updateBudget = createAsyncThunk(
  'budget/updateOne',
  async (update: Update<BudgetRecord>, thunkAPI) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = thunkAPI.getState() as any;
    const authToken = selectAuthToken(state);
    const entity = selectBudgetById(update.id)(state);
    
    if (!entity) {
      throw new Error(`Budget record with id ${update.id} not found`);
    }

    const { record } = entity;

    if (!authToken) {
      return record;
    }

    const response = await fetch(`${apiUrl}/budget/${update.id}`, {
      method: 'POST',
      body: JSON.stringify({
        type: record.type,
        ...update.changes,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken,
      },
    });
    
    const data = await response.json();

    if (response.status !== 200) {
      return thunkAPI.rejectWithValue(data.message);
    }

    return data as BudgetRecord;
  }
);

export const initialBudgetState: BudgetState = budgetAdapter.getInitialState({
  loadingStatus: 'not loaded'
});

export const budgetSlice = createSlice({
  name: BUDGET_FEATURE_KEY,
  initialState: initialBudgetState,
  reducers: {
    add: budgetAdapter.addOne,
    remove: budgetAdapter.removeOne,
    removeAll: budgetAdapter.removeAll,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBudget.pending, (state: BudgetState) => {
        state.loadingStatus = 'loading';
      })
      .addCase(fetchBudget.fulfilled, (state, action) => {
        budgetAdapter.setAll(state, action.payload.map(record => ({
          id: record.id,
          record,
          loadingStatus: 'loaded'
        })));

        state.loadingStatus = 'loaded';
      })
      .addCase(fetchBudget.rejected, (state, action) => {
        state.loadingStatus = 'error';
        state.error = action.error.message ?? '';
      });

    builder
      .addCase(updateBudget.pending, (state, action) => {
        const { id } = action.meta.arg;

        budgetAdapter.updateOne(state, {
          id,
          changes: {
            loadingStatus: 'loading',
          }
        });
      })
      .addCase(updateBudget.fulfilled, (state, action) => {
        const record = action.payload;

        budgetAdapter.updateOne(state, {
          id: record.id,
          changes: {
            record,
            loadingStatus: 'loaded',
          },
        });
      })
      .addCase(updateBudget.rejected, (state, action) => {
        const { id } = action.meta.arg;

        budgetAdapter.updateOne(state, {
          id,
          changes: {
            loadingStatus: 'error',
            error: action.payload as string ?? '',
          }
        });
      });
  },
});

export const budgetReducer = budgetSlice.reducer;
export const budgetActions = budgetSlice.actions;

const { selectAll, selectEntities, selectById } = budgetAdapter.getSelectors();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getBudgetState = (rootState: any): BudgetState =>
  rootState[BUDGET_FEATURE_KEY];

export const selectAllBudget = createSelector(getBudgetState, selectAll);

export const selectBudgetEntities = createSelector(getBudgetState, selectEntities);

export const selectBudgetLoading = createSelector(getBudgetState, x => x.loadingStatus);

export const selectBudgetById = (id: EntityId) =>
  createSelector(getBudgetState, (state) => selectById(state, id));
