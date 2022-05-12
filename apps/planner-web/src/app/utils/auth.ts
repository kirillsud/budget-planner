import { createContext, useContext } from 'react';

export type AuthToken = string;

export const AuthContext = createContext<AuthToken | undefined>(undefined);

export function useAuth() {
  return useContext(AuthContext);
}
