import { BudgetRecord, parseRecordsFromJson } from '@planner/budget-domain';
import { useContext, useState } from 'react';
import { useEffectAsync } from '../utils/react';
import { AuthContext } from '../utils/auth';
import { API_URL } from '../utils/rest-api';
import styles from './home.module.css';

/* eslint-disable-next-line */
export interface HomeProps {}

export function Home(props: HomeProps) {
  const authToken = useContext(AuthContext);
  
  const [incomes, setIncomes] = useState<BudgetRecord[]>([]);
  const [expenses, setExpenses] = useState<BudgetRecord[]>([]);

  useEffectAsync(async () => {
    if (!authToken) {
      setIncomes([]);
      return;
    }

    const data = await fetch(`${API_URL}/income`, {
      headers: {
        Authorization: authToken,
      },
    })
      .then((_) => _.text())
      .then(parseRecordsFromJson);

    setIncomes(data);
  }, [authToken]);

  useEffectAsync(async () => {
    if (!authToken) {
      setExpenses([]);
      return;
    }

    const data = await fetch(`${API_URL}/expense`, {
      headers: {
        Authorization: authToken,
      },
    })
      .then((_) => _.text())
      .then(parseRecordsFromJson);

    setExpenses(data);
  }, [authToken]);

  function addIncome() {
    fetch(`${API_URL}/income`)
      .then((_) => _.json())
      .then((newIncome) => {
        setIncomes([...incomes, newIncome]);
      });
  }

  function addGoal() {
    fetch('/api/goal', {
      method: 'POST',
      body: '',
    })
      .then((_) => _.json())
      .then((newGoal) => {
        setIncomes([...incomes, newGoal]);
      });
  }

  const dates: Map<
    number,
    { incomes: BudgetRecord[]; expenses: BudgetRecord[] }
  > = new Map();

  incomes.forEach((income) => {
    const key = income.date.from.getTime();
    const date = dates.get(key) ?? { incomes: [], expenses: [] };

    date.incomes.push(income);

    dates.set(key, date);
  });

  expenses.forEach((goal) => {
    const key = goal.date.from.getTime();
    const date = dates.get(key) ?? { incomes: [], expenses: [] };

    date.expenses.push(goal);

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

export default Home;
