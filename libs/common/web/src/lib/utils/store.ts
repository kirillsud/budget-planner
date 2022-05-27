import { AsyncThunkPayloadCreator, AsyncThunk, ActionReducerMapBuilder, createAsyncThunk, PayloadAction, EntityAdapter, EntityState } from '@reduxjs/toolkit';

export type LoadingState<Additional = '', Failed = Error, Success = 'loaded', Progress = 'loading'> = Progress | Success | Failed | Additional;

export function createAsyncThunkWithReducers<State extends EntityState<unknown>, Returned, ThunkArg = void>(
  typePrefix: string,
  payloadCreater: AsyncThunkPayloadCreator<Returned, ThunkArg>,
  reducers: (thunk: AsyncThunk<Returned, ThunkArg, EmptyObject>, builder: ActionReducerMapBuilder<State>, adapter: EntityAdapter<StateEntity<State>>) => void,
) {
  const wrapper: AsyncThunkPayloadCreator<Returned, ThunkArg> = async (arg, thunkAPI) => {
    try {
      const result = await payloadCreater(arg, thunkAPI);
      return result;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  };

  const thunk = createAsyncThunk(typePrefix, wrapper) as AsyncThunkWithReducers<Returned, State, ThunkArg>;
  thunk.reducers = reducers.bind(undefined, thunk);

  return thunk;
}

type EmptyObject = Record<string, never>;

type RecordElement<M extends Record<string, unknown>> =
  M extends Record<string, (infer ElementType)> ? Exclude<ElementType, undefined> : never;

type StateEntity<State extends EntityState<unknown>> = RecordElement<State['entities']>;

export type AsyncThunkWithReducers<Returned, State extends EntityState<unknown>, ThunkArg = void> =
  // Overrite AsyncThunk callable becasue @reduxjs/toolkit doesn't export field `type`
  ((arg: ThunkArg) => Promise<PayloadAction<Returned, string, { arg: ThunkArg }, Error | string>> & { type: string; }) &
  AsyncThunk<Returned, ThunkArg, EmptyObject> &
  {
    reducers(builder: ActionReducerMapBuilder<State>, adapter: EntityAdapter<StateEntity<State>>): void;
  }

// Describe the interface becasue @reduxjs/toolkit doesn't export it as public
export interface ThunkAPI {
  getState(): unknown;
}