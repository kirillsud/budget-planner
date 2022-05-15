import { FormEvent, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { BudgetRecord, TimestampInMsec } from '@planner/budget-domain';
import { config } from '@planner/core-web';
import { selectAuthToken } from '@planner/auth-feature';
import { budgetActions } from '../../budget.slice';
import styles from './budget-create.module.css';

const { apiUrl } = config();

export interface BudgetCreateProps {
  type: BudgetRecord['type'];
}

export function BudgetCreate(props: BudgetCreateProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const authToken = useSelector(selectAuthToken);

  const { type } = props;
  const date = new Date().toISOString().substring(0, 10);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [form, setForm] = useState({
    title: '',
    amount: 0,
    date,
  });

  return (
    <div>
      <h2>Добавление {type === 'income' ? 'дохода' : 'расхода'}</h2>

      <form onSubmit={submit}>
        {error && <div>{error}</div>}
        <fieldset disabled={loading}>
          <p>
            <label className={styles['label']}>Описание</label>
            <input
              type="text"
              value={form.title}
              onChange={(evt) => setForm({ ...form, title: evt.target.value })}
            />
          </p>
          <p>
            <label className={styles['label']}>Сумма</label>
            <input
              type="number"
              value={form.amount}
              onChange={(evt) =>
                setForm({ ...form, amount: parseInt(evt.target.value) })
              }
            />
          </p>
          <p>
            <label className={styles['label']}>Дата</label>
            <input
              type="date"
              value={form.date}
              onChange={(evt) => setForm({ ...form, date: evt.target.value })}
            />
          </p>
          <p>
            <button type="submit">Создать</button>
          </p>
        </fieldset>
      </form>
    </div>
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authToken) {
      return;
    }

    const date = new Date(form.date).valueOf() as TimestampInMsec;

    setLoading(true);

    const response = await fetch(`${apiUrl}/budget`, {
      method: 'PUT',
      body: JSON.stringify({
        ...form,
        type,
        date: {
          from: date,
          to: date,
        },
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
      },
    });

    setLoading(false);

    const data: BudgetRecord | { message: string } = await response.json();

    if (response.status === 200 && 'id' in data) {
      dispatch(
        budgetActions.add({
          id: data.id,
          record: data,
          loadingStatus: 'loaded',
        })
      );

      navigate(-1);
      return;
    }

    setError('message' in data ? data.message : 'Неизвестная ошибка');
  }
}

export default BudgetCreate;
