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
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ProtectedRoute from './protected-route/protected-route';
import AppPreloader from './app-preloader/app-preloader';
import LoadingButton from '@mui/lab/LoadingButton';

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

  if (authLoading === 'refreshing') {
    return <AppPreloader />;
  }

  return (
    <Container>
      <h1
      //  sx={{ alignSelf: 'center' }}
      >
        {t('Budget planner')}
      </h1>

      <div className="header">
        {authToken && (
          <LoadingButton
            sx={{ marginLeft: 2, marginRight: 2 }}
            variant="contained"
            size="small"
            loading={authLoading === 'loading'}
            onClick={logout}
          >
            {t('Logout')}
          </LoadingButton>
        )}

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            '& > *': {
              m: 1,
            },
          }}
        >
          <ButtonGroup variant="text" aria-label="text button group">
            {/* <Stack spacing={2} direction="row"> */}
            <Typography sx={{ alignSelf: 'center' }}>{t('Locale')}</Typography>
            <Button
              // variant="outlined"
              size="small"
              onClick={() => setLocale('ru')}
            >
              рус
            </Button>
            <Button
              // variant="outlined"
              size="small"
              onClick={() => setLocale('en')}
            >
              eng
            </Button>
            {/* </Stack> */}
          </ButtonGroup>
        </Box>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/budget" />} />
        <Route
          path="/budget/*"
          element={<ProtectedRoute element={<BudgetFeature />} />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<p>{t('Not found')}</p>} />
      </Routes>
    </Container>
  );

  function setLocale(locale: string): void {
    localStorage.setItem('i18nextLng', locale);
    window.location.reload();
  }
};

export default App;
