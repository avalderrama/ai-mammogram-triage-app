import { Banner, Disclaimer } from '../components/Feedback';
import { Icon, type IconName } from '../components/Icon';
import { ImagePicker } from '../components/ImagePicker';
import { useViewHeading } from '../hooks';
import { useI18n } from '../i18n/I18nProvider';
import { ROUTES } from '../routing';

const STEP_ICONS: readonly IconName[] = ['camera', 'shield', 'eye'];

export function HomeView({ configured, onPick }: { configured: boolean; onPick: (file: File) => void }) {
  const { t } = useI18n();
  const heading = useViewHeading<HTMLHeadingElement>(t.home.docTitle);
  return (
    <>
      <section className="hero" aria-labelledby="home-title">
        <div className="hero__text">
          <p className="eyebrow eyebrow--on-hero">{t.home.eyebrow}</p>
          <h1 id="home-title" ref={heading} tabIndex={-1}>{t.home.title}</h1>
          <p className="hero__lead">{t.home.lead}</p>
        </div>
        <ImagePicker onPick={onPick} />
      </section>
      {!configured && (
        <Banner tone="info" title={t.home.beforeStartTitle}>
          <p>{t.home.beforeStartBody} <a href={ROUTES.settings}>{t.home.settingsLink}</a>.</p>
        </Banner>
      )}
      <section aria-labelledby="how-title" className="section">
        <h2 id="how-title">{t.home.howTitle}</h2>
        <ol className="how">
          {t.home.howSteps.map((step, i) => (
            <li key={step.title} className="how__step">
              <span className="how__icon"><Icon name={STEP_ICONS[i] ?? 'info'} size="lg" /></span>
              <span className="how__title">{step.title}</span>
              <span className="how__body">{step.body}</span>
            </li>
          ))}
        </ol>
      </section>
      <div className="grid-2">
        <section aria-labelledby="tips-title" className="card">
          <h2 id="tips-title" className="heading-sm">{t.home.tipsTitle}</h2>
          <ul className="checklist">
            {t.home.tips.map((tip) => <li key={tip}><Icon name="check" />{tip}</li>)}
          </ul>
        </section>
        <section className="card card--quiet" aria-label={t.app.footer}>
          <p className="privacy"><Icon name="shield" size="lg" /><span>{t.home.privacy}</span></p>
          <Disclaimer />
        </section>
      </div>
    </>
  );
}
