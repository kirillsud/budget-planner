import { useSelector } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import { selectBudgetLoading } from './store/selectors';
import BudgetCreate from './components/budget-create/budget-create';
import BudgetEdit from './components/budget-edit/budget-edit';
import BudgetList from './components/budget-list/budget-list';
import { Preloader } from '@planner/common-web';

/* eslint-disable-next-line */
export interface BudgetFeatureProps {}

export function BudgetFeature(props: BudgetFeatureProps) {
  const loading = useSelector(selectBudgetLoading) !== 'loaded';

  if (loading) {
    return <Preloader />;
  }

  return (
    <Routes>
      <Route path="/" element={<BudgetList />} />
      <Route path="edit/:recordId" element={<BudgetEdit />} />
      <Route path="create/income" element={<BudgetCreate type="income" />} />
      <Route path="create/expense" element={<BudgetCreate type="expense" />} />
    </Routes>
  );
}

export default BudgetFeature;
