import { Banner, Disclaimer } from '../components/Feedback';
import { ImagePicker } from '../components/ImagePicker';
import { useViewHeading } from '../hooks';
import { useI18n } from '../i18n/I18nProvider';
import { ROUTES } from '../routing';

export function HomeView({ configured, onPick }: { configured: boolean; onPick: (file: File) => void }) {
  const { t } = useI18n();
  const heading = useViewHeading<HTMLHeadingElement>(t.home.docTitle);
  return (
    <>
      <h1 ref={heading} tabIndex={-1}>{t.home.title}</h1>
      <p className="lead">{t.home.lead}</p>
      <Disclaimer />
      {!configured && (
        <Banner tone="info" title={t.home.beforeStartTitle}>
          <p>{t.home.beforeStartBody} <a href={ROUTES.settings}>{t.home.settingsLink}</a>.</p>
        </Banner>
      )}
      <ImagePicker onPick={onPick} />
      <section aria-labelledby="tips-title" className="card">
        <h2 id="tips-title">{t.home.tipsTitle}</h2>
        <ul className="list">
          {t.home.tips.map((tip) => <li key={tip}>{tip}</li>)}
        </ul>
        <p className="text-secondary">{t.home.privacy}</p>
      </section>
    </>
  );
}
