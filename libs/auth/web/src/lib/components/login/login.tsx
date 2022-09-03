import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import LoadingButton from '@mui/lab/LoadingButton';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ErrorAlert,
  HttpValidationError,
  translateError,
} from '@planner/common-web';
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
  const [checked, setChecked] = useState(true);
  const { t } = useTranslation();

  const token = useSelector(selectAuthToken);
  const loading = useSelector(selectAuthLoadingStatus);

  const error = loading instanceof Error ? loading : undefined;

  const commonError = !(error instanceof HttpValidationError)
    ? error
    : undefined;

  const validationError =
    (error instanceof HttpValidationError && error.validation['body']) ||
    undefined;

  const emailError = fieldError('email');
  const passwordError = fieldError('password');

  if (token) {
    const path = (location.state as LoginRouteState)?.from ?? '/';
    return <Navigate to={path} />;
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = event.currentTarget.elements.namedItem(
      'email'
    ) as HTMLInputElement;

    const password = event.currentTarget.elements.namedItem(
      'password'
    ) as HTMLInputElement;

    const remember = event.currentTarget.elements.namedItem(
      'remember'
    ) as HTMLInputElement;

    dispatch(
      authThunks.login({
        email: email.value,
        password: password.value,
        remember: remember.checked,
      })
    );
  }

  function fieldError(field: string) {
    const errorData = validationError?.[field];
    const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1);
    return errorData
      ? translateError(errorData, `Login form.${capitalizedField}`)
      : undefined;
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar>

        <Typography component="h1" variant="h5">
          {t('Sign in')}
        </Typography>

        <Box component="form" onSubmit={login} noValidate sx={{ mt: 1 }}>
          {commonError && <ErrorAlert param="" error={commonError} />}

          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label={t('Login form.Email')}
            name="email"
            type="email"
            disabled={loading === 'loading'}
            autoComplete="email"
            autoFocus
            error={!!emailError}
            helperText={emailError}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label={t('Login form.Password')}
            type="password"
            id="password"
            disabled={loading === 'loading'}
            autoComplete="current-password"
            error={!!passwordError}
            helperText={passwordError}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={checked}
                onChange={(event) => setChecked(event.target.checked)}
                name="remember"
                color="primary"
                disabled={loading === 'loading'}
              />
            }
            label={t('Login form.Remember me')}
          />

          <LoadingButton
            type="submit"
            fullWidth
            variant="contained"
            loading={loading === 'loading'}
            sx={{ mt: 3, mb: 2 }}
          >
            {t('Login form.Submit')}
          </LoadingButton>

          <Grid container>
            <Grid item xs>
              <Link href="#" variant="body2">
                {t('Forgot password?')}
              </Link>
            </Grid>
            <Grid item>
              <Link href="#" variant="body2">
                {t("Don't have an account? Sign Up")}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
}

export default Login;
