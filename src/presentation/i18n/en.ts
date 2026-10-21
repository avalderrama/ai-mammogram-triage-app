import type { Messages } from './messages';

const percent = (value: number) => new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 }).format(value);
const sides = { R: 'Right breast', L: 'Left breast', unknown: 'Breast' } as const;
const views = { CC: 'CC', MLO: 'MLO', unknown: 'view not specified' } as const;

/** English (default). Plain, direct product voice; errors say what to do (UX-TXT-*). */
export const en: Messages = {
  locale: 'en',
  app: {
    name: 'Mammogram triage',
    tag: 'Pilot',
    titleSuffix: 'Mammogram triage',
    skipLink: 'Skip to content',
    navLabel: 'Main',
    navHome: 'Home',
    navSettings: 'Settings',
    languageLabel: 'Language',
    footer: 'Research tool. Images are never stored.',
    offlineTitle: 'No internet connection',
    offlineBody: 'You can keep reviewing the image. You need a connection to analyze it.',
  },
  disclaimer: 'Indicative result from a research tool. It does not replace the radiologist’s reading and is not an '
    + 'approved medical device.',
  levels: {
    high_priority: {
      label: 'High priority',
      explanation: 'The model found findings it associates with BI-RADS 4-5. Read this study first.',
    },
    review: {
      label: 'Review',
      explanation: 'The model found findings that deserve a careful look. It neither confirms nor rules out anything.',
    },
    no_suspicious_findings: {
      label: 'No suspicious findings',
      explanation: 'The model found nothing suspicious. The radiologist’s reading is still required.',
    },
  },
  quality: {
    low_resolution: { problem: 'Low resolution.', action: 'Move closer to the screen or use the original image.' },
    blurry: { problem: 'Blurry photo.', action: 'Tap the breast on the phone screen to focus and hold still.' },
    glare: { problem: 'Glare or burnt-out areas.', action: 'Turn off lights reflecting on the screen and don’t use the flash.' },
    small_breast: { problem: 'The breast fills little of the photo.', action: 'Move closer or crop the image.' },
  },
  sides,
  views,
  breastTitle: (side, panel) => (side === 'unknown' ? `Image (${panel.replace('panel', 'view')})` : sides[side]),
  failures: {
    not_configured: {
      title: 'The connection is not set up',
      body: () => 'Enter the server address (https).',
    },
    not_an_image: {
      title: 'The file is not an image',
      body: () => 'Choose a photo or screenshot in JPG, PNG or WebP format.',
    },
    not_a_mammogram: {
      title: 'The image doesn’t look like a mammogram',
      body: () => 'Only 2D mammograms in CC or MLO view are analyzed. Ultrasound, MRI and tomosynthesis slices are not, '
        + 'so no BI-RADS result is shown.',
    },
    unreadable_image: {
      title: 'The image could not be read',
      body: () => 'The file may be damaged or in an unsupported format. Try another photo or screenshot.',
    },
    too_large: {
      title: 'The image is too large',
      body: () => 'It exceeds what the server accepts even after resizing. Crop it to the mammogram or use a screenshot.',
    },
    invalid_input: {
      title: 'The request is not valid',
      body: () => 'If you set the number of views or the side of each one, check it or choose “Detect '
        + 'automatically”. Otherwise, try another image.',
    },
    unauthorized: {
      title: 'Access was denied',
      body: () => 'If the pilot gave you an access key, check it in Settings or ask the pilot administrator for a new '
        + 'one. If you sign in with your e-mail, reload the page; if it keeps happening, tell the pilot administrator.',
    },
    session_expired: {
      title: 'Your session has expired',
      body: () => 'Reload the page and sign in again with your e-mail and the code you receive. Then choose the image '
        + 'again.',
    },
    server_misconfigured: {
      title: 'The server rejects this connection',
      body: () => 'The server configuration does not accept this address. The pilot administrator must add it to '
        + 'MAMMO_ALLOWED_HOSTS (and this app’s address to MAMMO_ALLOWED_ORIGINS).',
    },
    app_outdated: {
      title: 'A new version of the app is available',
      body: () => 'Reload the page to use it. Your settings are kept; choose the image again after reloading.',
    },
    server_busy: {
      title: 'The server is busy',
      body: () => 'This is temporary: it is analyzing other images. Try again in a few seconds.',
    },
    rate_limited: {
      title: 'Too many requests in a row',
      body: (s) => `This is temporary. Wait ${s ?? 60} seconds and try again.`,
    },
    offline: {
      title: 'No internet connection',
      body: () => 'Connect to a network and try again. Your image is still selected.',
    },
    server_unreachable: {
      title: 'The server could not be reached',
      body: () => 'It may be off, its address may have changed (temporary tunnels change on restart) or it may not '
        + 'accept requests from this app (MAMMO_ALLOWED_ORIGINS). Try again or check the address in Settings.',
    },
    timeout: {
      title: 'The analysis took too long',
      body: () => 'The server did not answer in time. This is usually temporary: try again in a moment.',
    },
    cancelled: {
      title: 'You cancelled the analysis',
      body: () => 'No result was produced. You can analyze the same image again.',
    },
    unexpected: {
      title: 'Something didn’t work as expected',
      body: () => 'Try again. If it keeps happening, share the reference code with the pilot administrator.',
    },
  },
  reload: 'Reload the page',
  failurePanel: {
    reviewedPanels: (n) => `Views checked: ${n}. None was recognized as a mammogram.`,
    reference: 'Reference code:',
  },
  picker: {
    takePhoto: 'Take photo',
    choosePhoto: 'Choose saved image',
    takePhotoHint: 'Use the phone camera on a screen or film',
    choosePhotoHint: 'A photo, screenshot or exported file',
  },
  home: {
    docTitle: 'Home',
    title: 'Indicative mammogram triage',
    lead: 'Photograph a mammogram on a screen or film and get a priority level for each breast: high priority, '
      + 'review or no suspicious findings.',
    beforeStartTitle: 'Before you start',
    beforeStartBody: 'Set the server address in',
    settingsLink: 'Settings',
    eyebrow: 'Research pilot',
    howTitle: 'How it works',
    howSteps: [
      { title: 'Photograph', body: 'Take a photo of the mammogram or choose a saved image.' },
      { title: 'Protect', body: 'Personal data on the image is covered before the analysis.' },
      { title: 'Prioritize', body: 'Get a priority level per breast and see where the model looks.' },
    ],
    tipsTitle: 'How to take a good photo',
    tips: [
      'Frame a single mammogram, or the views you want to compare, without the rest of the screen.',
      'Face the screen squarely, with no flash and no reflected lights.',
      'Tap the breast on the phone screen to focus and keep your hand steady.',
      'If you have the original file, use it: higher resolution enables the heatmap.',
    ],
    privacy: 'Personal data visible on the image is covered before analysis. Images are not stored on this device or '
      + 'on the server.',
  },
  review: {
    docTitle: 'Review image',
    title: 'Review image',
    emptyTitle: 'You haven’t chosen an image yet',
    emptyBody: 'Take a photo of the mammogram or choose a saved image to review it before analyzing.',
    previewAlt: 'Preview of the chosen image',
    panelCountLegend: 'How many views are in the image?',
    panelCounts: { auto: 'Detect automatically', one: '1 view', two: '2 views side by side', four: '4 views side by side' },
    layoutSummary: 'Optional: set the breast and the view of each panel',
    layoutHint: 'Views are counted left to right. Views you mark as the same breast are combined into one result; '
      + 'views left as “I don’t know” are evaluated on their own.',
    panelLegend: (n) => `View ${n}`,
    sideLabel: 'Breast',
    viewLabel: 'Projection',
    unknownOption: 'I don’t know',
    right: 'Right',
    left: 'Left',
    cc: 'CC (craniocaudal)',
    mlo: 'MLO (mediolateral oblique)',
    blockedNotConfigured: 'First set up the server in Settings.',
    blockedOffline: 'No internet connection: connect to analyze.',
    goToSettings: 'Go to Settings',
    analyze: 'Analyze image',
    wrongImage: 'Not the right image?',
  },
  analyzing: {
    docTitle: 'Analyzing',
    title: 'Analyzing the image',
    lead: 'It usually takes 5 to 30 seconds. You can cancel at any time.',
    stepsLabel: 'Analysis steps',
    stepPreparing: 'Prepare the image on this device',
    stepAnalyzing: 'Cover personal data, check it is a mammogram and analyze each breast',
    done: ' (done)',
    current: ' (in progress)',
    pending: ' (pending)',
    elapsed: (s) => `Elapsed time: ${s} s`,
    cancel: 'Cancel analysis',
  },
  result: {
    docTitle: 'Result',
    title: 'Triage result',
    loading: 'Loading the result',
    emptyTitle: 'There is no result yet',
    emptyBody: 'Results are not stored: you only see the latest analysis while the app is open.',
    pickImage: 'Choose an image',
    retry: 'Try again',
    goToSettings: 'Go to Settings',
    pickOther: 'Choose another image',
    overall: 'Overall result',
    partialTitle: 'Partial result',
    rejectedPanels: (panels) => `${panels.length === 1 ? 'View' : 'Views'} ${panels.join(', ')} ${panels.length === 1
      ? 'was' : 'were'} not analyzed because ${panels.length === 1 ? 'it doesn’t' : 'they don’t'} look like mammograms.`,
    globalOnly: 'Resolution is not enough for the detailed analysis or the heatmap in some views: only the general '
      + 'model was used.',
    qualityTitle: 'Improve the photo for a more reliable result',
    masked: (n) => (n === 0 ? 'No text with personal data was found on the image.'
      : `Before analysis, ${n} text ${n === 1 ? 'area' : 'areas'} with possible personal data ${n === 1 ? 'was' : 'were'} covered.`),
    modelVersion: (v) => `Model version: ${v}.`,
    analyzeAnother: 'Analyze another image',
    backToImage: 'Back to the image',
    probabilitiesLabel: 'Estimated probability per BI-RADS group',
    groups: { routine: 'BI-RADS 1-2 (routine follow-up)', shortFollowUp: 'BI-RADS 3 (short-term follow-up)', biopsy: 'BI-RADS 4-5 (biopsy)' },
    viewName: (side, panel, view) => `${side === 'unknown' ? `View ${panel}` : sides[side]}, ${views[view]}`,
    heatmapUnavailable: (name, low) => `Heatmap not available (${name}): ${low
      ? 'the image needs at least 1500 pixels of height. Use the original image or move closer.'
      : 'it was not generated for this view.'}`,
    heatmapAlt: (name) => `Heatmap of ${name}: the red areas drew the model’s attention the most.`,
    heatmapCaption: (name) => `${name}. In red, the areas that drew the model’s attention the most.`,
    regionsTitle: 'Where the model looks',
    regionsNote: 'Numbered boxes mark the most suspicious areas, strongest first. They guide the reading; they are not '
      + 'an outline of a lesion.',
    showMarkers: 'Show markers',
    region: (n, depth, vertical) => `Area ${n}: ${({ posterior: 'posterior third (near the chest wall)', middle: 'middle third',
      anterior: 'anterior third (near the nipple)' })[depth]}, ${vertical} part of the breast`,
    noRegions: 'No single area stands out clearly in this view.',
    summaryNextStep: 'Read this study with the radiologist’s usual workflow; this result only helps decide the order.',
  },
  settings: {
    docTitle: 'Settings',
    title: 'Connection settings',
    lead: 'Details from the pilot administrator to connect the app to the analysis server.',
    required: '(required)',
    optional: '(optional)',
    serverLabel: 'Server address',
    serverHint: 'Ends in /mcp. Example: https://example.trycloudflare.com/mcp',
    keyLabel: 'Access key',
    keyHint: 'Only if the pilot gave you one: you don’t need it when you sign in with your e-mail. It is not stored on '
      + 'this device unless you tick the box below.',
    show: 'Show',
    hide: 'Hide',
    remember: 'Remember the key while this tab is open',
    save: 'Save and test connection',
    testing: 'Testing connection…',
    connecting: 'Connecting to the server…',
    okTitle: 'Connection OK',
    okBody: 'Settings were saved and the server answered with the analysis tool available.',
    tryAgain: 'Test again',
    savedAnyway: 'Settings were saved anyway; you can correct them above.',
    errors: {
      serverMissing: 'Enter the server address.',
      serverInvalid: 'Use an address starting with https:// (for example https://example.trycloudflare.com/mcp).',
      keyShort: 'The key has at least 24 characters. Check that it is complete.',
    },
  },
  notFound: {
    docTitle: 'Page not found',
    title: 'This page doesn’t exist',
    body: 'The address doesn’t match any section of the app.',
    home: 'Go to home',
  },
  percent,
  megabytes: (bytes) => `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(bytes / 1_000_000)} MB`,
};
