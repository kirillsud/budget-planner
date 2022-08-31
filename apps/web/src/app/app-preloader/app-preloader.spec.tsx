import { render } from '@testing-library/react';

import AppPreloader from './app-preloader';

describe('AppPreloader', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<AppPreloader />);
    expect(baseElement).toBeTruthy();
  });
});
