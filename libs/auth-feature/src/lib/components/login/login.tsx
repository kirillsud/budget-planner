import {
  authLogin,
  selectAuthError,
  selectAuthLoadingStatus,
  selectAuthToken,
} from '@planner/auth-feature';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

export interface LoginRouteState {
  from: string;
}

/* eslint-disable-next-line */
export interface LoginProps {}

export function Login(props: LoginProps) {
  const location = useLocation();
  const dispatch = useDispatch();

  const token = useSelector(selectAuthToken);
  const loading = useSelector(selectAuthLoadingStatus);
  const error = useSelector(selectAuthError);

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  if (token) {
    const path = (location.state as LoginRouteState)?.from ?? '/';
    return <Navigate to={path} />;
  }

  async function login() {
    dispatch(authLogin({ email, password, remember: false }) as any);
  }

  return (
    <>
      e-mail:{' '}
      <input
        type="text"
        value={email}
        onChange={(evt) => setEmail(evt.target.value)}
      />{' '}
      пароль:{' '}
      <input
        type="password"
        value={password}
        onChange={(evt) => setPassword(evt.target.value)}
      />
      <button onClick={login} disabled={loading === 'loading'}>
        Войти
      </button>
      {error && <div>{error}</div>}
    </>
  );
}

export default Login;
