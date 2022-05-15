import { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Login, selectAuthToken, authLogout } from '@planner/auth-feature';
import { BudgetFeature, fetchBudget } from '@planner/budget-feature';
import ProtectedRoute from './protected-route/protected-route';

const App = () => {
  const dispatch = useDispatch();
  const authToken = useSelector(selectAuthToken);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch(fetchBudget() as any);
  }, [dispatch, authToken]);

  async function logout() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch(authLogout() as any);
  }

  return (
    <>
      <h1>Планирование бюджета</h1>

      {authToken && <button onClick={logout}>Выйти</button>}

      <Routes>
        <Route path="/" element={<Navigate to="/budget" />} />
        <Route
          path="/budget/*"
          element={<ProtectedRoute element={<BudgetFeature />} />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<p>404 Not Found :(</p>} />
      </Routes>
    </>
  );
};

export default App;
