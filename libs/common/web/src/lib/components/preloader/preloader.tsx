import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import { useTranslation } from 'react-i18next';

/* eslint-disable-next-line */
export interface PreloaderProps {}

export function Preloader(props: PreloaderProps) {
  const { t } = useTranslation();

  return (
    <Container
      sx={{
        display: 'flex',
        flexFlow: 'column',
        alignItems: 'center',
        marginTop: 'calc(10vh)',
        textAlign: 'center',
      }}
    >
      <CircularProgress title={t('Loading')} />
    </Container>
  );
}

export default Preloader;
