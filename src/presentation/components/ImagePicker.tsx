import { useRef, type ChangeEvent } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { Icon } from './Icon';

/**
 * Camera and gallery pickers. The camera permission is requested by the OS only when the user taps
 * "Take photo" (UX-CNF-005). The picked file stays in memory; nothing is uploaded until "Analyze".
 * `tiles` is the large two-option layout of the home screen; `compact` is a pair of secondary buttons.
 */
export function ImagePicker({ onPick, variant = 'tiles' }: { onPick: (file: File) => void; variant?: 'tiles' | 'compact' }) {
  const { t } = useI18n();
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const handle = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow picking the same file again
    if (file) onPick(file);
  };
  const inputs = (
    <>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="visually-hidden"
        tabIndex={-1} aria-hidden="true" onChange={handle} />
      <input ref={gallery} type="file" accept="image/*" className="visually-hidden" tabIndex={-1}
        aria-hidden="true" onChange={handle} />
    </>
  );

  if (variant === 'compact') {
    return (
      <div className="actions">
        <button type="button" className="button button--secondary" onClick={() => camera.current?.click()}>
          <Icon name="camera" /> {t.picker.takePhoto}
        </button>
        <button type="button" className="button button--secondary" onClick={() => gallery.current?.click()}>
          <Icon name="image" /> {t.picker.choosePhoto}
        </button>
        {inputs}
      </div>
    );
  }
  return (
    <div className="picker">
      <button type="button" className="tile tile--primary" onClick={() => camera.current?.click()}>
        <span className="tile__icon"><Icon name="camera" size="lg" /></span>
        <span className="tile__text">
          <span className="tile__title">{t.picker.takePhoto}</span>
          <span className="tile__hint">{t.picker.takePhotoHint}</span>
        </span>
      </button>
      <button type="button" className="tile" onClick={() => gallery.current?.click()}>
        <span className="tile__icon"><Icon name="image" size="lg" /></span>
        <span className="tile__text">
          <span className="tile__title">{t.picker.choosePhoto}</span>
          <span className="tile__hint">{t.picker.choosePhotoHint}</span>
        </span>
      </button>
      {inputs}
    </div>
  );
}
