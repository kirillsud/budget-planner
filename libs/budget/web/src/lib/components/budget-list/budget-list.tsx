import { useSelector } from 'react-redux';
import { BudgetRecord } from '@planner/budget-domain';
import { selectAllBudget } from '../../store';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';

/* eslint-disable-next-line */
export interface BudgetListProps {}

export function BudgetList(props: BudgetListProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const budgetRecords = useSelector(selectAllBudget);

  function editRecord(record: BudgetRecord) {
    navigate(`edit/${record.id}`, { state: { from: location.pathname } });
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
      <Link to="create/income" state={{ from: location.pathname }}>
        <Button variant="outlined" className="menu-button">
          Добавить доход
        </Button>
      </Link>

      <Link to="create/expense" state={{ from: location.pathname }}>
        <Button variant="outlined" className="menu-button">
          Добавить расход
        </Button>
      </Link>

      <ul>
        {dateGroups.map(([time, { incomes, expenses }]) => (
          <li key={time}>
            <h2>{new Date(time).toLocaleDateString()}</h2>
            {incomes.map((x) => (
              <div className="income" key={x.id} onClick={() => editRecord(x)}>
                +{x.amount}, {x.title}
              </div>
            ))}
            {expenses.map((x) => (
              <div className="expense" key={x.id} onClick={() => editRecord(x)}>
                -{x.amount}, {x.title}
              </div>
            ))}
          </li>
        ))}
      </ul>

      <style jsx>{`
        .income {
          color: hsl(124deg 76% 55%);
        }

        .expense {
          color: hsl(0deg 100% 72%);
        }

        // .menu-button {
        //   margin-left: 0.5rem;
        //   // text-decoration: none;
        // }
      `}</style>
    </>
  );
}

export default BudgetList;
