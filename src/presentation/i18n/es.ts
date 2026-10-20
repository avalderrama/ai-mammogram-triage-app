import type { Messages } from './messages';

const percent = (value: number) => new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 0 }).format(value);
const sides = { R: 'Mama derecha', L: 'Mama izquierda', unknown: 'Mama' } as const;
const views = { CC: 'CC', MLO: 'MLO', unknown: 'proyección sin indicar' } as const;

/** Español (tuteo, voz del producto; los errores orientan, no se disculpan). */
export const es: Messages = {
  locale: 'es',
  app: {
    name: 'Triaje de mamografías',
    tag: 'Prueba',
    titleSuffix: 'Triaje de mamografías',
    skipLink: 'Saltar al contenido',
    navLabel: 'Principal',
    navHome: 'Inicio',
    navSettings: 'Ajustes',
    languageLabel: 'Idioma',
    footer: 'Herramienta de investigación. Las imágenes no se guardan.',
    offlineTitle: 'Sin conexión a internet',
    offlineBody: 'Puedes seguir revisando la imagen. Para analizarla necesitas conexión.',
  },
  disclaimer: 'Resultado orientativo de una herramienta de investigación. No sustituye la lectura del radiólogo ni es un '
    + 'dispositivo médico aprobado.',
  levels: {
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
  },
  quality: {
    low_resolution: { problem: 'Resolución baja.', action: 'Acércate a la pantalla o usa la imagen original.' },
    blurry: { problem: 'Foto borrosa.', action: 'Toca la mama en la pantalla del celular para enfocar y no te muevas.' },
    glare: { problem: 'Reflejos o zonas quemadas.', action: 'Apaga las luces sobre la pantalla y no uses flash.' },
    small_breast: { problem: 'La mama ocupa poco de la foto.', action: 'Acércate o recorta la imagen.' },
  },
  sides,
  views,
  breastTitle: (side, panel) => (side === 'unknown' ? `Imagen (${panel.replace('panel', 'vista')})` : sides[side]),
  failures: {
    not_configured: {
      title: 'Falta configurar la conexión',
      body: () => 'Indica la dirección del servidor (https) y la clave de acceso del piloto.',
    },
    not_an_image: {
      title: 'El archivo no es una imagen',
      body: () => 'Elige una foto o una captura de pantalla en formato JPG, PNG o WebP.',
    },
    not_a_mammogram: {
      title: 'La imagen no parece una mamografía',
      body: () => 'Solo se analizan mamografías 2D en proyección CC o MLO. Las ecografías, resonancias y cortes de '
        + 'tomosíntesis no se analizan, así que no se muestra ningún resultado BI-RADS.',
    },
    unreadable_image: {
      title: 'No se pudo leer la imagen',
      body: () => 'El archivo puede estar dañado o en un formato no compatible. Prueba con otra foto o captura.',
    },
    too_large: {
      title: 'La imagen es demasiado grande',
      body: () => 'Supera el tamaño que acepta el servidor incluso después de reducirla. Recórtala a la mamografía o '
        + 'usa una captura de pantalla.',
    },
    invalid_input: {
      title: 'La solicitud no es válida',
      body: () => 'Si indicaste el número de vistas o el lado de cada una, revísalo o elige «Detectar automáticamente». '
        + 'Si no, prueba con otra imagen.',
    },
    unauthorized: {
      title: 'La clave de acceso no es válida',
      body: () => 'Revísala en Ajustes o pide una nueva al responsable del piloto.',
    },
    server_misconfigured: {
      title: 'El servidor rechaza esta conexión',
      body: () => 'La configuración del servidor no admite esta dirección. El responsable del piloto debe añadirla a '
        + 'MAMMO_ALLOWED_HOSTS (y la dirección de esta app a MAMMO_ALLOWED_ORIGINS).',
    },
    app_outdated: {
      title: 'Hay una versión nueva de la app',
      body: () => 'Recarga la página para usarla. Los ajustes se conservan; vuelve a elegir la imagen después de recargar.',
    },
    server_busy: {
      title: 'El servidor está ocupado',
      body: () => 'Es temporal: está analizando otras imágenes. Vuelve a intentarlo en unos segundos.',
    },
    rate_limited: {
      title: 'Hiciste muchas solicitudes seguidas',
      body: (s) => `Es temporal. Espera ${s ?? 60} segundos y vuelve a intentarlo.`,
    },
    offline: {
      title: 'Sin conexión a internet',
      body: () => 'Conéctate a una red y vuelve a intentarlo. La imagen sigue seleccionada.',
    },
    server_unreachable: {
      title: 'No se pudo contactar el servidor',
      body: () => 'Puede estar apagado, su dirección cambió (los túneles temporales cambian al reiniciarse) o no '
        + 'admite solicitudes desde esta app (MAMMO_ALLOWED_ORIGINS). Vuelve a intentarlo o comprueba la dirección en '
        + 'Ajustes.',
    },
    timeout: {
      title: 'El análisis tardó demasiado',
      body: () => 'El servidor no respondió a tiempo. Suele ser temporal: vuelve a intentarlo en un momento.',
    },
    cancelled: {
      title: 'Cancelaste el análisis',
      body: () => 'No se obtuvo ningún resultado. Puedes volver a analizar la misma imagen.',
    },
    unexpected: {
      title: 'Algo no funcionó como se esperaba',
      body: () => 'Vuelve a intentarlo. Si se repite, comparte el código de referencia con el responsable del piloto.',
    },
  },
  reload: 'Recargar la página',
  failurePanel: {
    reviewedPanels: (n) => `Vistas revisadas: ${n}. Ninguna se reconoció como mamografía.`,
    reference: 'Código de referencia:',
  },
  picker: {
    takePhoto: 'Tomar foto',
    choosePhoto: 'Elegir imagen guardada',
    takePhotoHint: 'Usa la cámara del celular sobre la pantalla o la placa',
    choosePhotoHint: 'Una foto, captura de pantalla o archivo exportado',
  },
  home: {
    docTitle: 'Inicio',
    title: 'Triaje orientativo de mamografías',
    lead: 'Fotografía una mamografía en pantalla o en placa y obtén, para cada mama, un nivel de prioridad: alta '
      + 'prioridad, revisar o sin hallazgos sospechosos.',
    beforeStartTitle: 'Antes de empezar',
    beforeStartBody: 'Configura la dirección del servidor y la clave de acceso en',
    settingsLink: 'Ajustes',
    eyebrow: 'Piloto de investigación',
    howTitle: 'Cómo funciona',
    howSteps: [
      { title: 'Fotografía', body: 'Toma una foto de la mamografía o elige una imagen guardada.' },
      { title: 'Protege', body: 'Los datos personales de la imagen se tapan antes del análisis.' },
      { title: 'Prioriza', body: 'Obtén un nivel de prioridad por mama y mira dónde se fija el modelo.' },
    ],
    tipsTitle: 'Cómo tomar una buena foto',
    tips: [
      'Encuadra una sola mamografía o las vistas que quieras comparar, sin el resto de la pantalla.',
      'Ponte de frente a la pantalla, sin flash y sin luces que se reflejen.',
      'Toca la mama en la pantalla del celular para enfocar y mantén el pulso firme.',
      'Si tienes el archivo original, úsalo: con más resolución se activa el mapa de calor.',
    ],
    privacy: 'Antes de analizarla se tapan los datos personales visibles en la imagen. Las imágenes no se guardan ni en '
      + 'este dispositivo ni en el servidor.',
  },
  review: {
    docTitle: 'Revisar imagen',
    title: 'Revisar imagen',
    emptyTitle: 'Todavía no elegiste ninguna imagen',
    emptyBody: 'Toma una foto de la mamografía o elige una imagen guardada para revisarla antes de analizarla.',
    previewAlt: 'Vista previa de la imagen elegida',
    panelCountLegend: '¿Cuántas vistas hay en la imagen?',
    panelCounts: { auto: 'Detectar automáticamente', one: '1 vista', two: '2 vistas lado a lado', four: '4 vistas lado a lado' },
    layoutSummary: 'Opcional: indicar la mama y la proyección de cada vista',
    layoutHint: 'Las vistas se cuentan de izquierda a derecha. Las que marques como la misma mama se combinan en un '
      + 'solo resultado; las que dejes en «No lo sé» se evalúan por separado.',
    panelLegend: (n) => `Vista ${n}`,
    sideLabel: 'Mama',
    viewLabel: 'Proyección',
    unknownOption: 'No lo sé',
    right: 'Derecha',
    left: 'Izquierda',
    cc: 'CC (craneocaudal)',
    mlo: 'MLO (oblicua mediolateral)',
    blockedNotConfigured: 'Primero configura el servidor y la clave en Ajustes.',
    blockedOffline: 'Sin conexión a internet: conéctate para analizar.',
    goToSettings: 'Ir a Ajustes',
    analyze: 'Analizar imagen',
    wrongImage: '¿No es la imagen correcta?',
  },
  analyzing: {
    docTitle: 'Analizando',
    title: 'Analizando la imagen',
    lead: 'Suele tardar entre 5 y 30 segundos. Puedes cancelar en cualquier momento.',
    stepsLabel: 'Pasos del análisis',
    stepPreparing: 'Preparar la imagen en este dispositivo',
    stepAnalyzing: 'Tapar datos personales, comprobar que sea una mamografía y analizar cada mama',
    done: ' (completado)',
    current: ' (en curso)',
    pending: ' (pendiente)',
    elapsed: (s) => `Tiempo transcurrido: ${s} s`,
    cancel: 'Cancelar análisis',
  },
  result: {
    docTitle: 'Resultado',
    title: 'Resultado del triaje',
    loading: 'Cargando el resultado',
    emptyTitle: 'Todavía no hay ningún resultado',
    emptyBody: 'Los resultados no se guardan: solo ves el último análisis mientras la app está abierta.',
    pickImage: 'Elegir una imagen',
    retry: 'Volver a intentarlo',
    goToSettings: 'Ir a Ajustes',
    pickOther: 'Elegir otra imagen',
    overall: 'Resultado general',
    partialTitle: 'Resultado parcial',
    rejectedPanels: (panels) => `No se analizaron ${panels.length === 1 ? 'la vista' : 'las vistas'} ${panels.join(', ')} `
      + 'porque no parecen mamografías.',
    globalOnly: 'La resolución no alcanza para el análisis detallado ni el mapa de calor en algunas vistas: se usó solo '
      + 'el modelo general.',
    qualityTitle: 'Mejora la foto para un resultado más fiable',
    masked: (n) => (n === 0 ? 'No se encontró texto con datos personales en la imagen.'
      : n === 1 ? 'Antes de analizar se tapó 1 zona de texto con posibles datos personales.'
        : `Antes de analizar se taparon ${n} zonas de texto con posibles datos personales.`),
    modelVersion: (v) => `Versión del modelo: ${v}.`,
    analyzeAnother: 'Analizar otra imagen',
    backToImage: 'Volver a la imagen',
    probabilitiesLabel: 'Probabilidad estimada por grupo BI-RADS',
    groups: { routine: 'BI-RADS 1-2 (control habitual)', shortFollowUp: 'BI-RADS 3 (seguimiento corto)', biopsy: 'BI-RADS 4-5 (biopsia)' },
    viewName: (side, panel, view) => `${side === 'unknown' ? `Vista ${panel}` : sides[side]}, ${views[view]}`,
    heatmapUnavailable: (name, low) => `Mapa de calor no disponible (${name}): ${low
      ? 'la imagen necesita al menos 1500 píxeles de alto. Usa la imagen original o acércate más.'
      : 'no se generó para esta vista.'}`,
    heatmapAlt: (name) => `Mapa de calor de ${name}: las zonas en rojo son las que más llamaron la atención del modelo.`,
    heatmapCaption: (name) => `${name}. En rojo, las zonas que más llamaron la atención del modelo.`,
    regionsTitle: 'Dónde mira el modelo',
    regionsNote: 'Los recuadros numerados marcan las zonas más sospechosas, de mayor a menor. Orientan la lectura; no '
      + 'son el contorno de una lesión.',
    showMarkers: 'Mostrar marcadores',
    region: (n, depth, vertical) => `Zona ${n}: ${({ posterior: 'tercio posterior (cerca de la pared torácica)',
      middle: 'tercio medio', anterior: 'tercio anterior (cerca del pezón)' })[depth]}, parte ${({ upper: 'superior',
      middle: 'media', lower: 'inferior' })[vertical]} de la mama`,
    noRegions: 'En esta vista no destaca claramente ninguna zona.',
    summaryNextStep: 'Lee este estudio con el flujo habitual del radiólogo; este resultado solo ayuda a decidir el orden.',
  },
  settings: {
    docTitle: 'Ajustes',
    title: 'Ajustes de conexión',
    lead: 'Datos que te da el responsable del piloto para conectar la app con el servidor de análisis.',
    required: '(obligatoria)',
    serverLabel: 'Dirección del servidor',
    serverHint: 'Termina en /mcp. Ejemplo: https://ejemplo.trycloudflare.com/mcp',
    keyLabel: 'Clave de acceso',
    keyHint: 'No se guarda en este dispositivo salvo que marques la casilla de abajo.',
    show: 'Mostrar',
    hide: 'Ocultar',
    remember: 'Recordar la clave mientras esta pestaña esté abierta',
    save: 'Guardar y probar conexión',
    testing: 'Probando conexión…',
    connecting: 'Conectando con el servidor…',
    okTitle: 'Conexión correcta',
    okBody: 'Los ajustes se guardaron y el servidor respondió con la herramienta de análisis disponible.',
    tryAgain: 'Probar de nuevo',
    savedAnyway: 'Los ajustes se guardaron igualmente; puedes corregirlos arriba.',
    errors: {
      serverMissing: 'Escribe la dirección del servidor.',
      serverInvalid: 'Usa una dirección que empiece por https:// (por ejemplo https://ejemplo.trycloudflare.com/mcp).',
      keyMissing: 'Escribe la clave de acceso.',
      keyShort: 'La clave tiene al menos 24 caracteres. Revisa que esté completa.',
    },
  },
  notFound: {
    docTitle: 'Página no encontrada',
    title: 'Esta página no existe',
    body: 'La dirección no corresponde a ninguna sección de la app.',
    home: 'Ir al inicio',
  },
  percent,
  megabytes: (bytes) => `${new Intl.NumberFormat('es', { maximumFractionDigits: 1 }).format(bytes / 1_000_000)} MB`,
};
