import { Route, Routes, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Login, selectAuthToken, authLogout } from '@planner/auth-feature';
import { BudgetList } from '@planner/budget-feature';
import ProtectedRoute from './protected-route/protected-route';

const App = () => {
  const authToken = useSelector(selectAuthToken);
  const dispatch = useDispatch();

  async function logout() {
    dispatch(authLogout() as any);
  }

  return (
    <>
      <h1>Планирование бюджета</h1>
      {authToken && <button onClick={logout}>Выйти</button>}

      <Routes>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/home" element={<ProtectedRoute />}>
          <Route path="" element={<BudgetList />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={'404 :('} />
      </Routes>
    </>
  );
};

export default App;
