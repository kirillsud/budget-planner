import { render } from '@testing-library/react';

import BudgetFeature from './budget-feature';

describe('BudgetFeature', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<BudgetFeature />);
    expect(baseElement).toBeTruthy();
  });
});
