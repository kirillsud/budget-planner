import { fetchBudget, budgetAdapter, budgetReducer } from './budget.slice';

describe('budget reducer', () => {
  it('should handle initial state', () => {
    const expected = budgetAdapter.getInitialState({
      loadingStatus: 'not loaded',
      error: null,
    });

    expect(budgetReducer(undefined, { type: '' })).toEqual(expected);
  });

  it('should handle fetchBudgets', () => {
    let state = budgetReducer(undefined, fetchBudget.pending(null, null));

    expect(state).toEqual(
      expect.objectContaining({
        loadingStatus: 'loading',
        error: null,
        entities: {},
      })
    );

    state = budgetReducer(
      state,
      fetchBudget.fulfilled([{ id: 1 }], null, null)
    );

    expect(state).toEqual(
      expect.objectContaining({
        loadingStatus: 'loaded',
        error: null,
        entities: { 1: { id: 1 } },
      })
    );

    state = budgetReducer(
      state,
      fetchBudget.rejected(new Error('Uh oh'), null, null)
    );

    expect(state).toEqual(
      expect.objectContaining({
        loadingStatus: 'error',
        error: 'Uh oh',
        entities: { 1: { id: 1 } },
      })
    );
  });
});
