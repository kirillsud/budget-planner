import { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Login, selectAuthToken, authLogout } from '@planner/auth-web';
import { BudgetFeature, budgetThunks } from '@planner/budget-web';
import ProtectedRoute from './protected-route/protected-route';

const App = () => {
  const dispatch = useDispatch();
  const authToken = useSelector(selectAuthToken);
  const { t } = useTranslation();

  useEffect(() => {
    dispatch(budgetThunks.fetchAll());
  }, [dispatch, authToken]);

  async function logout() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch(authLogout() as any);
  }

  return (
    <>
      <h1>{t('Budget planner')}</h1>

      {authToken && <button onClick={logout}>{t('Logout')}</button>}

      <Routes>
        <Route path="/" element={<Navigate to="/budget" />} />
        <Route
          path="/budget/*"
          element={<ProtectedRoute element={<BudgetFeature />} />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<p>{t('Not found')}</p>} />
      </Routes>
    </>
  );
};

export default App;
