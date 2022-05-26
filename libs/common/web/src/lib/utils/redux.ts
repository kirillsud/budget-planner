import { AsyncThunkPayloadCreator, AsyncThunk, ActionReducerMapBuilder, createAsyncThunk, AsyncThunkAction, PayloadAction } from '@reduxjs/toolkit';

export function createAsyncThunkWithReducers<State, Returned, ThunkArg = void>(
  typePrefix: string,
  payloadCreater: AsyncThunkPayloadCreator<Returned, ThunkArg>,
  reducers: (thunk: AsyncThunk<Returned, ThunkArg, EmptyObject>, builder: ActionReducerMapBuilder<State>) => void,
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

export type AsyncThunkWithReducers<Returned, State, ThunkArg = void> =
  // Overrite AsyncThunk callable becasue @reduxjs/toolkit doesn't export field `type`
  ((arg: ThunkArg) => Promise<PayloadAction<Returned, string, { arg: ThunkArg }, Error | string>> & { type: string; }) &
  AsyncThunk<Returned, ThunkArg, EmptyObject> &
  {
    reducers(builder: ActionReducerMapBuilder<State>): void;
  }

// Describe the interface becasue @reduxjs/toolkit doesn't export it as public
export interface ThunkAPI {
  getState(): unknown;
}