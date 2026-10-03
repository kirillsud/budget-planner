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

      <div className="header">
        {authLoading === 'loaded' && authToken && (
          <button onClick={logout}>{t('Logout')}</button>
        )}
        <div>
          <span>{t('Locale')}</span>
          <button onClick={() => setLocale('ru')}>рус</button>
          <button onClick={() => setLocale('en')}>eng</button>
        </div>
      </div>

      {authLoading === 'loading' ? (
        <Preloader />
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to="/budget" />} />
          <Route
            path="/budget/*"
            element={<ProtectedRoute element={<BudgetFeature />} />}
          />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<p>{t('Not found')}</p>} />
        </Routes>
      )}

      <style jsx>{`
        .header {
          display: flex;
          flex-direction: row-reverse;
        }
        .header > * {
          margin-left: 1em;
        }
        .header * + button {
          margin-left: 0.5em;
        }
      `}</style>
    </>
  );

  function setLocale(locale: string): void {
    localStorage.setItem('i18nextLng', locale);
    window.location.reload();
  }
};

export default App;
