import { useTranslation } from 'react-i18next';

/* eslint-disable-next-line */
export interface PreloaderProps {}

export function Preloader(props: PreloaderProps) {
  const { t } = useTranslation();

  return (
    <div>
      {t('Loading')}
      <style jsx>{``}</style>
    </div>
  );
}

export default Preloader;
