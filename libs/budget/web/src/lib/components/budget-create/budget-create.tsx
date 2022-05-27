import { FormEvent, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BudgetRecord, TimestampInMsec } from '@planner/budget-domain';
import { HttpValidationError, ValidationError } from '@planner/common-web';
import { budgetThunks, selectBudgetCreating } from '../../store';

export interface BudgetCreateProps {
  type: BudgetRecord['type'];
}

export function BudgetCreate(props: BudgetCreateProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const { type } = props;
  const date = new Date().toISOString().substring(0, 10);

  const loading = useSelector(selectBudgetCreating);

  const [form, setForm] = useState({
    title: '',
    amount: 0,
    date,
  });

  const error = loading instanceof Error ? loading : undefined;
  const stringError = !(error instanceof HttpValidationError)
    ? error?.message
    : undefined;
  const validationError =
    error instanceof HttpValidationError ? error.validation['body'] : undefined;

  return (
    <div>
      <h2>{type === 'income' ? t('Create income') : t('Create expense')}</h2>

      <form onSubmit={submit}>
        {stringError && <div>{stringError}</div>}
        <fieldset disabled={loading === 'loading'}>
          <p>
            <label>{t('Budget form.Title')}</label>
            <input
              type="text"
              value={form.title}
              onChange={(evt) => setForm({ ...form, title: evt.target.value })}
            />
            <ValidationError error={validationError?.['title']} />
          </p>
          <p>
            <label>{t('Budget form.Amount')}</label>
            <input
              type="number"
              value={form.amount}
              onChange={(evt) => {
                setForm({ ...form, amount: parseInt(evt.target.value || '0') });
              }}
            />
            <ValidationError error={validationError?.['amount']} />
          </p>
          <p>
            <label>{t('Budget form.Date')}</label>
            <input
              type="date"
              value={form.date}
              onChange={(evt) => setForm({ ...form, date: evt.target.value })}
            />
            <ValidationError error={validationError?.['date']} />
          </p>
          <p>
            <button type="submit">{t('Budget form.Create')}</button>
          </p>
        </fieldset>
      </form>

      <style jsx>{`
        label {
          margin: 0.5em;
          width: 80px;
          display: inline-block;
        }

        input {
          width: 200px;
        }
      `}</style>
    </div>
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const date = new Date(form.date).valueOf() as TimestampInMsec;

    const result = await dispatch(
      budgetThunks.createOne({
        ...form,
        type,
        date: {
          from: date,
          to: date,
        },
      })
    );

    if (!result.error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = location.state as any;
      navigate(state?.['from'] || '../../');
    }
  }
}

export default BudgetCreate;
