import { FormEvent, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BudgetRecord, TimestampInMsec } from '@planner/budget-core';
import { ErrorAlert, getFormErrors } from '@planner/common-web';
import { budgetThunks, selectBudgetCreating } from '../../store';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';
import Button from '@mui/material/Button';

export interface BudgetCreateProps {
  type: BudgetRecord['type'];
}

export function BudgetCreate(props: BudgetCreateProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const loading = useSelector(selectBudgetCreating);
  const { t } = useTranslation();

  useEffect(() => {
    dispatch(budgetThunks.resetCreating());

    return () => {
      dispatch(budgetThunks.resetCreating());
    };
  }, [dispatch]);

  const { type } = props;

  const error = loading instanceof Error ? loading : undefined;
  const formErrors = error && getFormErrors(error, 'Budget form');

  const titleError = formErrors?.fields?.['title']?.();
  const amountError = formErrors?.fields?.['amount']?.();
  const dateError = formErrors?.fields?.['date.from']?.();

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          '& button': { mt: 1, mb: 1 },
        }}
      >
        <Typography component="h1" variant="h5">
          {type === 'income' ? t('Create income') : t('Create expense')}
        </Typography>

        {formErrors?.common && (
          <ErrorAlert param="" error={formErrors.common} />
        )}

        <Box component="form" onSubmit={submit} noValidate sx={{ mt: 1 }}>
          {formErrors?.common && (
            <ErrorAlert param="" error={formErrors.common} />
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            id="title"
            label={t('Budget form.Title')}
            name="title"
            type="text"
            disabled={loading === 'loading'}
            autoComplete="budget-title"
            autoFocus
            error={!!titleError}
            helperText={titleError}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="amount"
            label={t('Budget form.Amount')}
            type="number"
            id="amount"
            disabled={loading === 'loading'}
            error={!!amountError}
            helperText={amountError}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="date"
            label={t('Budget form.Date.from')}
            type="date"
            id="date"
            disabled={loading === 'loading'}
            error={!!dateError}
            helperText={dateError}
            InputLabelProps={{ shrink: true }}
          />

          <LoadingButton
            type="submit"
            fullWidth
            variant="contained"
            color="success"
            loading={loading === 'loading'}
          >
            {t('Budget form.Create')}
          </LoadingButton>

          <Button onClick={navigateBack} fullWidth variant="outlined">
            {t('Budget form.Cancel')}
          </Button>
        </Box>
      </Box>
    </Container>
  );

  function navigateBack() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const returnUrl = (location.state as any)?.from || '../../';
    navigate(returnUrl);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget.elements;

    const title = form.namedItem('title') as HTMLInputElement;
    const amount = form.namedItem('amount') as HTMLInputElement;
    const date = form.namedItem('date') as HTMLInputElement;

    const timestamp = date.value
      ? (new Date(date.value).getTime() as TimestampInMsec)
      : undefined;

    const result = await dispatch(
      budgetThunks.createOne({
        title: title.value,
        amount: amount.value ? Number(amount.value) : undefined,
        type,
        date: {
          from: timestamp,
          to: timestamp,
        },
      } as BudgetRecord)
    );

    if (!result.error) {
      navigateBack();
    }
  }
}

export default BudgetCreate;
