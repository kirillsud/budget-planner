import { BudgetRecord, parseRecordsFromJson } from '@planner/budget-domain';
import { useEffect, useState, DependencyList } from 'react';

type AuthToken = string;

function useEffectAsync(effect: () => Promise<void>, deps?: DependencyList) {
  useEffect(() => { effect(); }, deps);
}

const API_URL = 'http://localhost:3333/api';

const authTokenStorageKey = 'authToken';
const App = () => {
  const [authToken, setAuthToken] = useState<AuthToken>();
  const [authEmail, setAuthEmail] = useState<string>();
  const [authPassword, setAuthPassword] = useState<string>();

  const [incomes, setIncomes] = useState<BudgetRecord[]>([]);
  const [expenses, setExpenses] = useState<BudgetRecord[]>([]);

  useEffect(() => {
    const savedToken = localStorage.getItem(authTokenStorageKey);

    if (savedToken) {
      setAuthToken(savedToken);
    }
  }, []);

  useEffectAsync(async () => {
    if (!authToken) {
      return;
    }

    const data = await fetch(`${API_URL}/income`, {
      headers: {
        'Authorization': authToken,
      }
    })
      .then(_ => _.text())
      .then(parseRecordsFromJson);

    setIncomes(data);
  }, [authToken]);

  useEffectAsync(async () => {
    if (!authToken) {
      return;
    }
    
    const data = await fetch(`${API_URL}/expense`, {
      headers: {
        'Authorization': authToken,
      }
    })
      .then(_ => _.text())
      .then(parseRecordsFromJson);

    setExpenses(data);
  }, [authToken]);

  async function login() {
    const data = await fetch(`${API_URL}/auth`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
        }),
    }).then(_ => _.json());

    setAuthToken(data.jwt);

    localStorage.setItem(authTokenStorageKey, data.jwt);
  }

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

  const dates: Map<number, {incomes: BudgetRecord[], goals: BudgetRecord[]}> = new Map();

  incomes.forEach((income) => {
    const key = income.date.from.getTime();
    const date = dates.get(key) ?? {incomes: [], goals: []};

    date.incomes.push(income);

    dates.set(key, date);
  });

  expenses.forEach((goal) => {
    const key = goal.date.from.getTime();
    const date = dates.get(key) ?? {incomes: [], goals: []};

    date.goals.push(goal);

    dates.set(key, date);
  });

  const dateGroups = Array.from(dates);

  return (
    <>
      <h1>Planner</h1>
      {!!authToken === false ?
        <div>
          <h2>Login</h2>
          <p>email: <input type="text" value={authEmail} onChange={evt => setAuthEmail(evt.target.value)}/></p>
          <p>passowrd: <input type="password" value={authPassword} onChange={evt => setAuthPassword(evt.target.value)}/></p>
          <button onClick={login}>Войти</button>
        </div>
        : ''
      }
      <ul>
        {dateGroups.map(([time, {incomes, goals: expenses}]) => (
          <li>
            <h2>{new Date(time).toLocaleDateString()}</h2>
            {incomes.map(x => <div className={'income'}>{x.title}, +{x.amount}</div>)}
            {expenses.map(x => <div className={'goal'}>{x.title}, -{x.amount}</div>)}
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
};

export default App;
