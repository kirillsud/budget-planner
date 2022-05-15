import { useSelector } from 'react-redux';
import { BudgetRecord } from '@planner/budget-domain';
import { selectAllBudget } from '../../budget.slice';
import { Link, useNavigate } from 'react-router-dom';
import styles from './budget-list.module.css';

/* eslint-disable-next-line */
export interface BudgetListProps {}

export function BudgetList(props: BudgetListProps) {
  const navigate = useNavigate();
  const budgetRecords = useSelector(selectAllBudget);

  function editRecord(record: BudgetRecord) {
    navigate(`edit/${record.id}`);
  }

  const dates: Map<
    number,
    { incomes: BudgetRecord[]; expenses: BudgetRecord[] }
  > = new Map();

  budgetRecords.forEach(({ record }) => {
    const key = record.date.from;
    const date = dates.get(key) ?? { incomes: [], expenses: [] };

    switch (record.type) {
      case 'income':
        date.incomes.push(record);
        break;

      case 'expense':
        date.expenses.push(record);
        break;
    }

    dates.set(key, date);
  });

  const dateGroups = Array.from(dates).sort((a, b) => a[0] - b[0]);

  return (
    <>
      <Link to="create/income" className={styles['menu-button']}>
        <button>Добавить доход</button>
      </Link>

      <Link to="create/expense" className={styles['menu-button']}>
        <button>Добавить расход</button>
      </Link>

      <ul>
        {dateGroups.map(([time, { incomes, expenses }]) => (
          <li key={time}>
            <h2>{new Date(time).toLocaleDateString()}</h2>
            {incomes.map((x) => (
              <div
                className={styles['income']}
                key={x.id}
                onClick={() => editRecord(x)}
              >
                +{x.amount}, {x.title}
              </div>
            ))}
            {expenses.map((x) => (
              <div
                className={styles['expense']}
                key={x.id}
                onClick={() => editRecord(x)}
              >
                -{x.amount}, {x.title}
              </div>
            ))}
          </li>
        ))}
      </ul>
    </>
  );
}

export default BudgetList;
