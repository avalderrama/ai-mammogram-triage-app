import { useRef, type ChangeEvent } from 'react';
import { Icon } from './Icon';

/**
 * Camera and gallery pickers. The camera permission is requested by the OS only when the user taps
 * "Tomar foto" (UX-CNF-005). The picked file stays in memory; nothing is uploaded until "Analizar".
 */
export function ImagePicker({ onPick, primary = 'camera' }: { onPick: (file: File) => void; primary?: 'camera' | 'none' }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const handle = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow picking the same file again
    if (file) onPick(file);
  };
  return (
    <div className="actions">
      <button type="button" className={`button ${primary === 'camera' ? 'button--primary' : 'button--secondary'}`}
        onClick={() => camera.current?.click()}>
        <Icon name="camera" /> Tomar foto
      </button>
      <button type="button" className="button button--secondary" onClick={() => gallery.current?.click()}>
        <Icon name="image" /> Elegir imagen guardada
      </button>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="visually-hidden"
        tabIndex={-1} aria-hidden="true" onChange={handle} />
      <input ref={gallery} type="file" accept="image/*" className="visually-hidden" tabIndex={-1}
        aria-hidden="true" onChange={handle} />
    </div>
  );
}
