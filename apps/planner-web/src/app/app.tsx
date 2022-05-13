import { useEffect, useState } from 'react';
import { Route, Routes, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AuthContext, AuthToken } from './utils/auth';
import { API_URL } from './utils/rest-api';
import Home from './home/home';
import Login from './login/login';
import ProtectedRoute, { RedirectRouteState } from './protected-route/protected-route';

const authTokenStorageKey = 'authToken';

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [authToken, setAuthToken] = useState<AuthToken | undefined>();

  useEffect(() => {
    const savedToken = localStorage.getItem(authTokenStorageKey);

    if (savedToken) {
      setAuthToken(savedToken);

      // Use window.location istead of useLocation() because of wrong path on startup
      if (window.location.pathname === '/login') {
        navigate('/home');
      }
    }
  }, []);

  function login(token: AuthToken) {
    setAuthToken(token);
    localStorage.setItem(authTokenStorageKey, token);
    navigate((location.state as RedirectRouteState)?.from);
  }

  async function logout() {
    if (!authToken) {
      return;
    }

    await fetch(`${API_URL}/auth/logout`, {
      headers: {
        Authorization: authToken,
      },
    });

    setAuthToken(undefined);
    localStorage.removeItem(authTokenStorageKey);
  }

  return (
    <>
      <h1>Планирование бюджета</h1>
      {authToken && <button onClick={logout}>Выйти</button>}


      <AuthContext.Provider value={authToken}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/home" element={<ProtectedRoute/>}>
            <Route path="" element={ <Home /> } />
          </Route>
          <Route path="/login" element={<Login onLogin={login} />} />
          <Route path="*" element={"404 :("} />
        </Routes>
      </AuthContext.Provider>
    </>
  );
};

export default App;
