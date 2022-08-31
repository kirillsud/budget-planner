import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

/* eslint-disable-next-line */
export interface AppPreloaderProps {}

export function AppPreloader(props: AppPreloaderProps) {
  const { t } = useTranslation();

  return (
    <Fade in appear timeout={1000}>
      <Container
        sx={{
          display: 'flex',
          flexFlow: 'column',
          alignItems: 'center',
          marginTop: 'calc(33vh)',
          textAlign: 'center',
        }}
      >
        <Typography variant="h1" gutterBottom>
          {t('Budget planner')}
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          {t('Application loading')}
        </Typography>
        <CircularProgress />
      </Container>
    </Fade>
  );
}

export default AppPreloader;
