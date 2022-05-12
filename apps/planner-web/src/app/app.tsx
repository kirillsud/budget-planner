import { useEffect, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { AuthContext, AuthToken } from './utils/auth';
import { API_URL } from './utils/rest-api';
import Home from './home/home';
import Login from './login/login';
import ProtectedRoute from './protected-route/protected-route';

const authTokenStorageKey = 'authToken';

const App = () => {
  const navigate = useNavigate();
  
  const [authToken, setAuthToken] = useState<AuthToken | undefined>();

  useEffect(() => {
    const savedToken = localStorage.getItem(authTokenStorageKey);

    if (savedToken) {
      setAuthToken(savedToken);

      if (window.location.pathname === '/login') {
        navigate('/');
      }
    }
  }, []);

  function login(token: AuthToken) {
    setAuthToken(token);
    localStorage.setItem(authTokenStorageKey, token);
    navigate('/');
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
          <Route path="/login" element={<Login onAuth={login} />}/>
          <Route path="/" element={<ProtectedRoute element={ <Home /> } />} />
        </Routes>
      </AuthContext.Provider>
    </>
  );
};

export default App;
