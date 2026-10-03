import { render } from '@testing-library/react';

import BudgetEdit from './budget-edit';

describe('BudgetEdit', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<BudgetEdit />);
    expect(baseElement).toBeTruthy();
  });
});
