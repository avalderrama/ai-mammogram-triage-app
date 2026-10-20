/** Interface copy in Spanish (tuteo, product voice, UX-TXT-*). Centralized so it can be translated. */
import type { FailureKind } from '../application/errors';
import type { BreastSide, QualityIssue, TriageLevel, ViewType } from '../domain/triage';

export const APP_NAME = 'Triaje de mamografías';

export const DISCLAIMER =
  'Resultado orientativo de una herramienta de investigación. No sustituye la lectura del radiólogo ni es un '
  + 'dispositivo médico aprobado.';

export const LEVEL_COPY: Record<TriageLevel, { label: string; explanation: string }> = {
  high_priority: {
    label: 'Alta prioridad',
    explanation: 'El modelo encontró hallazgos que asocia con BI-RADS 4-5. Prioriza la lectura de este estudio.',
  },
  review: {
    label: 'Revisar',
    explanation: 'El modelo encontró hallazgos que merecen una mirada atenta. No confirma ni descarta nada.',
  },
  no_suspicious_findings: {
    label: 'Sin hallazgos sospechosos',
    explanation: 'El modelo no encontró hallazgos sospechosos. La lectura del radiólogo sigue siendo necesaria.',
  },
};

export const QUALITY_COPY: Record<QualityIssue, { problem: string; action: string }> = {
  low_resolution: { problem: 'Resolución baja.', action: 'Acércate a la pantalla o usa la imagen original.' },
  blurry: { problem: 'Foto borrosa.', action: 'Toca la mama en la pantalla del celular para enfocar y no te muevas.' },
  glare: { problem: 'Reflejos o zonas quemadas.', action: 'Apaga las luces sobre la pantalla y no uses flash.' },
  small_breast: { problem: 'La mama ocupa poco de la foto.', action: 'Acércate o recorta la imagen.' },
};

export const SIDE_COPY: Record<BreastSide, string> = { R: 'Mama derecha', L: 'Mama izquierda', unknown: 'Mama' };
export const VIEW_COPY: Record<ViewType, string> = { CC: 'CC', MLO: 'MLO', unknown: 'proyección sin indicar' };

export function breastTitle(side: BreastSide, label: string): string {
  return side === 'unknown' ? `Imagen (${label.replace('panel', 'vista')})` : SIDE_COPY[side];
}

export function percent(value: number): string {
  return new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 0 }).format(value);
}

export interface FailureCopy {
  title: string;
  body: (retryAfterSeconds?: number) => string;
  /** Where the user can fix it. */
  fix: 'settings' | 'image' | 'retry';
}

export const FAILURE_COPY: Record<FailureKind, FailureCopy> = {
  not_configured: {
    title: 'Falta configurar la conexión',
    body: () => 'Indica la dirección del servidor (https) y la clave de acceso del piloto.',
    fix: 'settings',
  },
  not_an_image: {
    title: 'El archivo no es una imagen',
    body: () => 'Elige una foto o una captura de pantalla en formato JPG, PNG o WebP.',
    fix: 'image',
  },
  not_a_mammogram: {
    title: 'La imagen no parece una mamografía',
    body: () => 'Solo se analizan mamografías 2D en proyección CC o MLO. Las ecografías, resonancias y cortes de '
      + 'tomosíntesis no se analizan, así que no se muestra ningún resultado BI-RADS.',
    fix: 'image',
  },
  unreadable_image: {
    title: 'No se pudo leer la imagen',
    body: () => 'El archivo puede estar dañado o en un formato no compatible. Prueba con otra foto o captura.',
    fix: 'image',
  },
  too_large: {
    title: 'La imagen es demasiado grande',
    body: () => 'Supera el tamaño que acepta el servidor incluso después de reducirla. Recórtala a la mamografía o '
      + 'usa una captura de pantalla.',
    fix: 'image',
  },
  invalid_input: {
    title: 'La solicitud no es válida',
    body: () => 'Si indicaste el número de vistas o el lado de cada una, revísalo o elige «Detectar automáticamente». '
      + 'Si no, prueba con otra imagen.',
    fix: 'image',
  },
  unauthorized: {
    title: 'La clave de acceso no es válida',
    body: () => 'Revísala en Ajustes o pide una nueva al responsable del piloto.',
    fix: 'settings',
  },
  server_misconfigured: {
    title: 'El servidor rechaza esta conexión',
    body: () => 'La configuración del servidor no admite esta dirección. El responsable del piloto debe añadirla a '
      + 'MAMMO_ALLOWED_HOSTS (y la dirección de esta app a MAMMO_ALLOWED_ORIGINS).',
    fix: 'settings',
  },
  server_busy: {
    title: 'El servidor está ocupado',
    body: () => 'Es temporal: está analizando otras imágenes. Vuelve a intentarlo en unos segundos.',
    fix: 'retry',
  },
  rate_limited: {
    title: 'Hiciste muchas solicitudes seguidas',
    body: (s) => `Es temporal. Espera ${s ?? 60} segundos y vuelve a intentarlo.`,
    fix: 'retry',
  },
  offline: {
    title: 'Sin conexión a internet',
    body: () => 'Conéctate a una red y vuelve a intentarlo. La imagen sigue seleccionada.',
    fix: 'retry',
  },
  server_unreachable: {
    title: 'No se pudo contactar el servidor',
    body: () => 'Puede estar apagado, su dirección cambió (los túneles temporales cambian al reiniciarse) o no '
      + 'admite solicitudes desde esta app (MAMMO_ALLOWED_ORIGINS). Vuelve a intentarlo o comprueba la dirección en '
      + 'Ajustes.',
    fix: 'retry',
  },
  timeout: {
    title: 'El análisis tardó demasiado',
    body: () => 'El servidor no respondió a tiempo. Suele ser temporal: vuelve a intentarlo en un momento.',
    fix: 'retry',
  },
  cancelled: {
    title: 'Cancelaste el análisis',
    body: () => 'No se obtuvo ningún resultado. Puedes volver a analizar la misma imagen.',
    fix: 'retry',
  },
  unexpected: {
    title: 'Algo no funcionó como se esperaba',
    body: () => 'Vuelve a intentarlo. Si se repite, comparte el código de referencia con el responsable del piloto.',
    fix: 'retry',
  },
};
