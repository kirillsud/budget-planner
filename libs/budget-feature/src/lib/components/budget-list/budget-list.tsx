import { useDispatch, useSelector } from 'react-redux';
import { BudgetRecord } from '@planner/budget-domain';
import { selectAuthToken } from '@planner/auth-feature';
import { config, useEffectAsync } from '@planner/core-web';
import { budgetActions, selectAllExpenses, selectAllIncomes } from '../../budget.slice';
import styles from './budget-list.module.css';

const API_URL = config().apiUrl;

/* eslint-disable-next-line */
export interface BudgetListProps {}

export function BudgetList(props: BudgetListProps) {
  const dispatch = useDispatch();
  const authToken = useSelector(selectAuthToken);
  const incomes = useSelector(selectAllIncomes);
  const expenses = useSelector(selectAllExpenses);

  useEffectAsync(async () => {
    if (!authToken) {
      dispatch(budgetActions.removeAll());
      return;
    }

    const data = await fetch(`${API_URL}/income`, {
      headers: {
        Authorization: authToken,
      },
    }).then((_) => _.json());

    dispatch(budgetActions.addMany(data));
  }, [dispatch, authToken]);

  useEffectAsync(async () => {
    if (!authToken) {
      dispatch(budgetActions.removeAll());
      return;
    }

    const data = await fetch(`${API_URL}/expense`, {
      headers: {
        Authorization: authToken,
      },
    }).then((_) => _.json());

    dispatch(budgetActions.addMany(data));
  }, [authToken]);

  function addIncome() {
    fetch(`${API_URL}/income`)
      .then((_) => _.json())
      .then((newIncome) => {
        dispatch(budgetActions.add(newIncome));
      });
  }

  function addGoal() {
    fetch('/api/goal', {
      method: 'POST',
      body: '',
    })
      .then((_) => _.json())
      .then((newGoal) => {
        dispatch(budgetActions.add(newGoal));
      });
  }

  const dates: Map<number, { incomes: BudgetRecord[]; expenses: BudgetRecord[]}> = new Map();

  incomes.forEach((income) => {
    const key = income.date.from;
    const date = dates.get(key) ?? { incomes: [], expenses: [] };

    date.incomes.push(income);

    dates.set(key, date);
  });

  expenses.forEach((expense) => {
    const key = expense.date.from;
    const date = dates.get(key) ?? { incomes: [], expenses: [] };

    date.expenses.push(expense);

    dates.set(key, date);
  });

  const dateGroups = Array.from(dates).sort((a, b) => a[0] - b[0]);

  return (
    <>
      <ul>
        {dateGroups.map(([time, { incomes, expenses }]) => (
          <li key={time}>
            <h2>{new Date(time).toLocaleDateString()}</h2>
            {incomes.map((x) => (
              <div className={styles['income']} key={x.id}>
                +{x.amount}, {x.title}
              </div>
            ))}
            {expenses.map((x) => (
              <div className={styles['expense']} key={x.id}>
                -{x.amount}, {x.title}
              </div>
            ))}
          </li>
        ))}
      </ul>
      <button id={'add-income'} onClick={addIncome}>
        Добавить доход
      </button>
      <button id={'add-goal'} onClick={addGoal}>
        Добавить расход
      </button>
    </>
  );
}

export default BudgetList;
