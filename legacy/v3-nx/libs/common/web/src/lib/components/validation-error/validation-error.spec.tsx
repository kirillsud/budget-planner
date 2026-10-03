import { render } from '@testing-library/react';

import ValidationError from './validation-error';

describe('ValidationError', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<ValidationError />);
    expect(baseElement).toBeTruthy();
  });
});
