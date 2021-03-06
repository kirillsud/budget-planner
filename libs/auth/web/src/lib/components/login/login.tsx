import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  authThunks,
  selectAuthLoadingStatus,
  selectAuthToken,
} from '../../store';

export interface LoginRouteState {
  from: string;
}

/* eslint-disable-next-line */
export interface LoginProps {}

export function Login(props: LoginProps) {
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const token = useSelector(selectAuthToken);
  const loading = useSelector(selectAuthLoadingStatus);

  const error = loading instanceof Error ? loading : undefined;

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  if (token) {
    const path = (location.state as LoginRouteState)?.from ?? '/';
    return <Navigate to={path} />;
  }

  async function login() {
    dispatch(authThunks.login({ email, password, remember: false }));
  }

  return (
    <>
      <form>
        <fieldset disabled={loading === 'loading'}>
          <label>{t('Login form.Email')}:</label>
          <input
            type="text"
            value={email}
            onChange={(evt) => setEmail(evt.target.value)}
          />{' '}
          <label>{t('Login form.Password')}:</label>
          <input
            type="password"
            value={password}
            onChange={(evt) => setPassword(evt.target.value)}
          />
          <button onClick={login} disabled={loading === 'loading'}>
            {t('Login form.Submit')}
          </button>
          {error && <div>{error.message}</div>}
        </fieldset>
      </form>
      <style jsx>{`
        fieldset {
          border: 0;
        }
        label {
          display: block;
        }
        input {
          display: block;
          margin-bottom: 0.5em;
        }
        button {
          display: block;
          margin-top: 0.5em;
        }
      `}</style>
    </>
  );
}

export default Login;
