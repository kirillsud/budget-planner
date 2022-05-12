import { useState } from 'react';
import { AuthToken } from '../utils/auth';
import { API_URL } from '../utils/rest-api';

/* eslint-disable-next-line */
export interface LoginProps {
  onAuth(token: AuthToken): void;
}

export function Login(props: LoginProps) {
  const [authEmail, setAuthEmail] = useState<string>();
  const [authPassword, setAuthPassword] = useState<string>();

  async function login() {
    const data = await fetch(`${API_URL}/auth/login`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: authEmail,
        password: authPassword,
      }),
    }).then((_) => _.json());

    setAuthEmail('');
    setAuthPassword('');

    props.onAuth(data.jwt);
  }

  return (
    <>
      e-mail:{' '}
      <input
        type="text"
        value={authEmail}
        onChange={(evt) => setAuthEmail(evt.target.value)}
      />{' '}
      пароль:{' '}
      <input
        type="password"
        value={authPassword}
        onChange={(evt) => setAuthPassword(evt.target.value)}
      />
      <button onClick={login}>Войти</button>
    </>
  );
}

export default Login;
