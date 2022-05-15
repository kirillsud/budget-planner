import { render } from '@testing-library/react';

import BudgetEdit from './budget-create';

describe('BudgetEdit', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<BudgetEdit />);
    expect(baseElement).toBeTruthy();
  });
});
