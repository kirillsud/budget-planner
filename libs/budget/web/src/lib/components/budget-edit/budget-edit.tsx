import { TimestampInMsec } from '@planner/budget-domain';
import { ValidationError } from '@planner/common-web';
import { PayloadAction } from '@reduxjs/toolkit';
import { FormEvent, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { selectBudgetById, updateBudget } from '../../budget.slice';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BudgetEditProps {}

export function BudgetEdit(props: BudgetEditProps) {
  const navigate = useNavigate();
  const location = useLocation();
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

  const stringError = (typeof error === 'string' && error) || undefined;
  const validationError =
    (typeof error === 'object' && error.validation['body']) || undefined;

  const [form, setForm] = useState({
    title: record.title,
    amount: record.amount,
    date,
  });

  return (
    <div>
      <h2>Редактирование {type === 'income' ? 'дохода' : 'расхода'}</h2>

      <form onSubmit={submit}>
        {stringError && <div>{stringError}</div>}
        <fieldset disabled={loadingStatus === 'loading'}>
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
              onChange={(evt) =>
                setForm({ ...form, amount: parseInt(evt.target.value || '0') })
              }
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
            <button type="submit">Сохранить</button>
          </p>
        </fieldset>
      </form>

      <style jsx>{`
        label {
          margin: .5em;
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

    if (!record) {
      return;
    }

    const date = new Date(form.date).valueOf() as TimestampInMsec;

    const result = await dispatch<PayloadAction<void, string, never, string>>(
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

    if (!result.error) {
      const state = location.state as any;
      navigate(state?.['from'] || '../../');
    }
  }
}

export default BudgetEdit;
