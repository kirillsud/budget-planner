import { FormEvent, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { BudgetRecord, TimestampInMsec } from '@planner/budget-domain';
import { HttpValidationError, ValidationError } from '@planner/common-web';
import { selectAuthToken } from '@planner/auth-web';
import { budgetActions } from '../../budget.slice';
import { createRecord } from '../../utils/api';

export interface BudgetCreateProps {
  type: BudgetRecord['type'];
}

export function BudgetCreate(props: BudgetCreateProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const authToken = useSelector(selectAuthToken);

  const { type } = props;
  const date = new Date().toISOString().substring(0, 10);

  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [error, setError] = useState<HttpValidationError | undefined>();
  const [form, setForm] = useState({
    title: '',
    amount: 0,
    date,
  });

  const stringError = error?.message && Object.keys(error.validation).length === 0;
  const validationError = error?.validation['body'] ?? undefined;

  return (
    <div>
      <h2>Добавление {type === 'income' ? 'дохода' : 'расхода'}</h2>

      <form onSubmit={submit}>
        {stringError && <div>{stringError}</div>}
        <fieldset disabled={loadingStatus}>
          <p>
            <label>Описание</label>
            <input
              type="text"
              value={form.title}
              onChange={(evt) => setForm({ ...form, title: evt.target.value })}
            />
            <ValidationError error={validationError?.['title']} />
          </p>
          <p>
            <label>Сумма</label>
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
            <label>Дата</label>
            <input
              type="date"
              value={form.date}
              onChange={(evt) => setForm({ ...form, date: evt.target.value })}
            />
            <ValidationError error={validationError?.['date']} />
          </p>
          <p>
            <button type="submit">Создать</button>
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

    if (!authToken) {
      return;
    }

    const date = new Date(form.date).valueOf() as TimestampInMsec;

    setLoadingStatus(true);

    try {
      const data = await createRecord(
        {
          ...form,
          type,
          date: {
            from: date,
            to: date,
          },
        },
        authToken
      );

      setError(undefined);

      dispatch(
        budgetActions.add({
          id: data.id,
          record: data,
          loadingStatus: 'loaded',
        })
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = location.state as any;
      navigate(state?.['from'] || '../../');
    } catch (error: unknown | HttpValidationError) {
      setError(error as HttpValidationError);
    } finally {
      setLoadingStatus(false);
    }
  }
}

export default BudgetCreate;
