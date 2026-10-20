import { Banner, Disclaimer } from '../components/Feedback';
import { ImagePicker } from '../components/ImagePicker';
import { useViewHeading } from '../hooks';
import { ROUTES } from '../routing';

export function HomeView({ configured, onPick }: { configured: boolean; onPick: (file: File) => void }) {
  const heading = useViewHeading<HTMLHeadingElement>('Inicio');
  return (
    <>
      <h1 ref={heading} tabIndex={-1}>Triaje orientativo de mamografías</h1>
      <p className="lead">
        Fotografía una mamografía en pantalla o en placa y obtén, para cada mama, un nivel de prioridad:
        alta prioridad, revisar o sin hallazgos sospechosos.
      </p>
      <Disclaimer />
      {!configured && (
        <Banner tone="info" title="Antes de empezar">
          <p>Configura la dirección del servidor y la clave de acceso en <a href={ROUTES.settings}>Ajustes</a>.</p>
        </Banner>
      )}
      <ImagePicker onPick={onPick} />
      <section aria-labelledby="tips-title" className="card">
        <h2 id="tips-title">Cómo tomar una buena foto</h2>
        <ul className="list">
          <li>Encuadra una sola mamografía o las vistas que quieras comparar, sin el resto de la pantalla.</li>
          <li>Ponte de frente a la pantalla, sin flash y sin luces que se reflejen.</li>
          <li>Toca la mama en la pantalla del celular para enfocar y mantén el pulso firme.</li>
          <li>Si tienes el archivo original, úsalo: con más resolución se activa el mapa de calor.</li>
        </ul>
        <p className="text-secondary">
          Antes de analizarla se tapan los datos personales visibles en la imagen. Las imágenes no se guardan ni en
          este dispositivo ni en el servidor.
        </p>
      </section>
    </>
  );
}
