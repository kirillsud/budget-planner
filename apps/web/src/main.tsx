import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';

import { authThunks } from '@planner/auth-web';

import store from './utils/store';
import localize from './utils/localize';
import App from './app/app';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

localize();

const theme = createTheme();

// Refresh token on page load
store.dispatch(authThunks.refresh());

root.render(
  <Provider store={store}>
    <StrictMode>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>
  </Provider>
);
