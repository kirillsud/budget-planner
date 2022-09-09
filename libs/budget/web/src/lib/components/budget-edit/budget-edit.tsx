import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';
import Button from '@mui/material/Button';
import { FormEvent, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BudgetRecord, TimestampInMsec } from '@planner/budget-domain';
import { Preloader, ErrorAlert, getFormErrors } from '@planner/common-web';
import { selectBudgetById, budgetThunks } from '../../store';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BudgetEditProps {}

export function BudgetEdit(props: BudgetEditProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [form, setForm] = useState({
    title: '',
    amount: '',
    date: '',
  });

  const { recordId } = useParams();
  if (!recordId) {
    throw new Error('recordId is required');
  }

  const entity = useSelector(selectBudgetById(recordId));

  useEffect(() => {
    if (!entity) {
      return;
    }

    const { record } = entity;
    const date = new Date(record.date.from).toISOString().substring(0, 10);

    setForm({
      title: record.title,
      amount: record.amount.toString(10),
      date,
    });

    dispatch(budgetThunks.resetOneLoading(entity.id));

    return () => {
      dispatch(budgetThunks.resetOneLoading(entity.id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!entity) {
    return <Preloader />;
  }

  const { record, loading } = entity;
  const type = record.type;

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
          {type === 'income' ? t('Edit income') : t('Edit expense')}
        </Typography>

        {formErrors?.common && (
          <ErrorAlert param="" error={formErrors.common} />
        )}

        <Box component="form" onSubmit={submit} noValidate sx={{ mt: 1 }}>
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
            value={form.title}
            onChange={(evt) => setForm({ ...form, title: evt.target.value })}
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
            value={form.amount}
            onChange={(evt) =>
              setForm({
                ...form,
                amount: evt.target.value,
              })
            }
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
            value={form.date}
            onChange={(evt) => setForm({ ...form, date: evt.target.value })}
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
            {t('Budget form.Save')}
          </LoadingButton>

          <LoadingButton
            onClick={remove}
            fullWidth
            variant="contained"
            color="error"
            loading={loading === 'loading'}
          >
            {t('Budget form.Delete')}
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

    if (!record) {
      return;
    }

    const form = event.currentTarget.elements;

    const title = form.namedItem('title') as HTMLInputElement;
    const amount = form.namedItem('amount') as HTMLInputElement;
    const date = form.namedItem('date') as HTMLInputElement;

    const timestamp = date.value
      ? (new Date(date.value).getTime() as TimestampInMsec)
      : undefined;

    const result = await dispatch(
      budgetThunks.updateOne({
        id: record.id,
        changes: {
          title: title.value,
          amount: amount.value ? Number(amount.value) : undefined,
          date: {
            from: timestamp,
            to: timestamp,
          },
        } as BudgetRecord,
      })
    );

    if (!result.error) {
      navigateBack();
    }
  }

  async function remove() {
    if (!record) {
      return;
    }

    const result = await dispatch(budgetThunks.removeOne(record.id));

    if (!result.error) {
      navigateBack();
    }
  }
}

export default BudgetEdit;
