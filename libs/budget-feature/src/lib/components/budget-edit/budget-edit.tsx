import { TimestampInMsec } from '@planner/budget-domain';
import { FormEvent, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { selectBudgetById, updateBudget } from '../../budget.slice';
import styles from './budget-edit.module.css';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BudgetEditProps {}

export function BudgetEdit(props: BudgetEditProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { recordId } = useParams();
  if (!recordId) {
    throw new Error('recordId is required');
  }

  const entity = useSelector(selectBudgetById(recordId));
  if (!entity) {
    throw new Error('Record not found');
  }

  const { record, loadingStatus, error } = entity;
  const type = record.type;
  const date = new Date(record.date.from).toISOString().substring(0, 10);

  const [form, setForm] = useState({
    title: record.title,
    amount: record.amount,
    date,
  });

  return (
    <div>
      <h2>Редактирование {type === 'income' ? 'дохода' : 'расхода'}</h2>

      <form onSubmit={submit}>
        {error && <div>{error}</div>}
        <fieldset disabled={loadingStatus === 'loading'}>
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
            <button type="submit">Сохранить</button>
          </p>
        </fieldset>
      </form>
    </div>
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!record) {
      return;
    }

    const date = new Date(form.date).valueOf() as TimestampInMsec;

    await dispatch(
      updateBudget({
        id: record.id,
        changes: {
          ...form,
          date: {
            from: date,
            to: date,
          },
        },
      }) as any
    );

    navigate(-1);
  }
}

export default BudgetEdit;
