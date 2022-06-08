import { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Login,
  selectAuthToken,
  selectAuthLoadingStatus,
  authThunks,
} from '@planner/auth-web';
import { BudgetFeature, budgetThunks } from '@planner/budget-web';
import { Preloader } from '@planner/common-web';
import ProtectedRoute from './protected-route/protected-route';

const App = () => {
  const dispatch = useDispatch();
  const authToken = useSelector(selectAuthToken);
  const authLoading = useSelector(selectAuthLoadingStatus);
  const { t } = useTranslation();

  useEffect(() => {
    if (authToken) {
      dispatch(budgetThunks.fetchAll());
    }
  }, [dispatch, authToken]);

  async function logout() {
    dispatch(authThunks.logout());
  }

  return (
    <>
      <h1>{t('Budget planner')}</h1>

      {authLoading === 'loading' ? (
        <Preloader />
      ) : (
        <>
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
      )}
    </>
  );
};

export default App;
