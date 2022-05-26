import { TimestampInMsec } from '@planner/budget-domain';
import { HttpValidationError, ValidationError } from '@planner/common-web';
import { FormEvent, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { selectBudgetById, budgetThunks } from '../../store';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BudgetEditProps {}

export function BudgetEdit(props: BudgetEditProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    title: '',
    amount: 0,
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
      amount: record.amount,
      date,
    });
  }, [entity]);

  if (!entity) {
    // TODO: replace with loading component
    return <div>Выполняет загрузка данных...</div>;
  }

  const { record, loadingStatus, error } = entity;
  const type = record.type;

  const stringError = (typeof error === 'string' && error) || undefined;
  const validationError =
    (error instanceof HttpValidationError && error.validation['body']) ||
    undefined;

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
            <button type="button" onClick={remove}>
              Удалить
            </button>
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

    const date = new Date(form.date).valueOf() as TimestampInMsec;

    const result = await dispatch(
      budgetThunks.updateOne({
        id: record.id,
        changes: {
          ...form,
          date: {
            from: date,
            to: date,
          },
        },
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
