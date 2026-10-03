import { render } from '@testing-library/react';

import BudgetList from './budget-list';

describe('Home', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<BudgetList />);
    expect(baseElement).toBeTruthy();
  });
});
