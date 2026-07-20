export type TheorBrandVariant = 'core' | 'home' | 'graph' | 'schedule' | 'cue';

type GlyphKey = 'T' | 'h' | 'g' | 's' | 'c';
type FillLayer = 'core' | 'site';

type Placement = {
  glyph: GlyphKey;
  fill: FillLayer;
  x: number;
  y: number;
  scale: number;
};

type TheorBrandVariantDefinition = {
  title: string;
  description: string;
  siteGlyph?: Exclude<GlyphKey, 'T'>;
  siteToken?: string;
  siteFillLight?: string;
  siteFillDark?: string;
};

export const THEOR_BRAND_VIEWBOX = '0 0 128 128';
export const THEOR_BRAND_CORE_LIGHT = '#111111';
export const THEOR_BRAND_CORE_DARK = '#FFFFFF';

const glyphs = {
  T: 'M 30.464844 0 L 46.464844 0 L 46.464844 -75.519531 L 71.679688 -75.519531 L 71.679688 -89.601562 L 5.121094 -89.601562 L 5.121094 -75.519531 L 30.464844 -75.519531 Z M 30.464844 0',
  h: 'M 12.160156 0 L 27.519531 0 L 27.519531 -40.320312 C 27.519531 -50.433594 33.023438 -57.601562 40.703125 -57.601562 C 46.847656 -57.601562 50.558594 -52.992188 50.558594 -45.441406 L 50.558594 0 L 65.921875 0 L 65.921875 -46.71875 C 65.921875 -61.054688 57.726562 -70.398438 45.183594 -70.398438 C 37.503906 -70.398438 31.742188 -66.945312 28.03125 -60.671875 L 27.519531 -60.671875 L 27.519531 -94.847656 L 12.160156 -94.847656 Z M 12.160156 0',
  g: 'M 11.777344 -46.335938 C 11.777344 -39.808594 14.078125 -34.175781 18.046875 -29.953125 C 14.335938 -27.390625 12.160156 -23.550781 12.160156 -18.816406 C 12.160156 -14.59375 13.953125 -10.878906 16.894531 -8.320312 L 16.894531 -7.808594 C 10.878906 -4.863281 7.296875 0.128906 7.296875 6.527344 C 7.296875 18.433594 19.96875 26.878906 37.761719 26.878906 C 57.214844 26.878906 70.65625 17.152344 70.65625 3.199219 C 70.65625 -8.320312 61.441406 -15.617188 47.105469 -15.617188 L 29.441406 -15.617188 C 26.753906 -15.617188 24.960938 -17.40625 24.960938 -19.96875 C 24.960938 -21.632812 25.726562 -23.039062 27.007812 -24.191406 C 30.078125 -22.910156 33.535156 -22.273438 37.375 -22.273438 C 52.222656 -22.273438 62.976562 -32.382812 62.976562 -46.335938 C 62.976562 -49.664062 62.335938 -52.863281 61.183594 -55.679688 L 61.183594 -56.320312 L 70.015625 -56.320312 L 70.015625 -69.121094 L 46.078125 -69.121094 C 43.390625 -70.015625 40.449219 -70.398438 37.375 -70.398438 C 22.527344 -70.398438 11.777344 -60.289062 11.777344 -46.335938 Z M 29.441406 -1.535156 L 45.183594 -1.535156 C 51.585938 -1.535156 55.296875 0.769531 55.296875 4.734375 C 55.296875 10.238281 48.382812 14.078125 38.015625 14.078125 C 28.03125 14.078125 21.375 10.496094 21.375 5.121094 C 21.375 1.28125 24.703125 -1.535156 29.441406 -1.535156 Z M 37.375 -35.070312 C 30.847656 -35.070312 26.496094 -39.550781 26.496094 -46.078125 C 26.496094 -52.609375 30.847656 -57.089844 37.375 -57.089844 C 43.902344 -57.089844 48.257812 -52.609375 48.257812 -46.078125 C 48.257812 -39.550781 43.902344 -35.070312 37.375 -35.070312 Z M 37.375 -35.070312',
  s: 'M 11.136719 -19.199219 C 11.136719 -7.167969 22.785156 1.792969 38.398438 1.792969 C 54.527344 1.792969 65.664062 -7.808594 65.664062 -21.632812 C 65.664062 -33.28125 57.726562 -39.679688 40.960938 -41.601562 L 37.503906 -41.984375 C 31.105469 -42.753906 28.289062 -45.054688 28.289062 -49.28125 C 28.289062 -54.398438 32.382812 -57.601562 38.910156 -57.601562 C 45.3125 -57.601562 50.046875 -54.527344 50.558594 -49.921875 L 64.894531 -49.921875 C 64.382812 -61.695312 53.246094 -70.398438 38.65625 -70.398438 C 23.425781 -70.398438 13.183594 -61.054688 13.183594 -47.359375 C 13.183594 -35.710938 20.734375 -29.3125 36.480469 -27.519531 L 39.9375 -27.136719 C 47.230469 -26.367188 50.304688 -24.191406 50.304688 -19.710938 C 50.304688 -14.464844 45.953125 -11.136719 39.296875 -11.136719 C 32.511719 -11.136719 26.753906 -14.59375 25.984375 -19.199219 Z M 11.136719 -19.199219',
  c: 'M 52.609375 -19.199219 C 51.199219 -15.230469 46.976562 -12.800781 41.472656 -12.800781 C 30.847656 -12.800781 24.191406 -21.632812 24.191406 -35.070312 C 24.191406 -48 30.464844 -56.320312 40.574219 -56.320312 C 46.078125 -56.320312 50.304688 -53.886719 51.96875 -49.921875 L 67.328125 -49.921875 C 65.40625 -62.078125 54.398438 -70.398438 40.574219 -70.398438 C 22.144531 -70.398438 8.832031 -55.550781 8.832031 -34.945312 C 8.832031 -14.207031 22.398438 1.28125 40.832031 1.28125 C 54.398438 1.28125 65.664062 -7.039062 68.222656 -19.199219 Z M 52.609375 -19.199219',
} as const;

const corePlacement: Placement = {
  glyph: 'T',
  fill: 'core',
  x: 24,
  y: 104,
  scale: 0.84,
};

const pairCorePlacement: Placement = {
  glyph: 'T',
  fill: 'core',
  x: 3,
  y: 104,
  scale: 0.84,
};

const sitePlacements: Record<Exclude<GlyphKey, 'T'>, Placement> = {
  h: { glyph: 'h', fill: 'site', x: 60.5, y: 104, scale: 0.84 },
  c: { glyph: 'c', fill: 'site', x: 60.5, y: 104, scale: 0.84 },
  s: { glyph: 's', fill: 'site', x: 59.5, y: 104, scale: 0.84 },
  g: { glyph: 'g', fill: 'site', x: 59.5, y: 96, scale: 0.8 },
};

export const theorBrandVariants: Record<TheorBrandVariant, TheorBrandVariantDefinition> = {
  core: {
    title: 'TheoR.net',
    description: 'Root domain mark with the family T anchor only.',
  },
  home: {
    title: 'home.theor.net',
    description: 'Ink-blue h for the content-first home property.',
    siteGlyph: 'h',
    siteToken: 'var(--color-accent)',
    siteFillLight: '#3A4E68',
    siteFillDark: '#6F88A8',
  },
  graph: {
    title: 'graph.theor.net',
    description: 'Structural slate g for relation and graph views.',
    siteGlyph: 'g',
    siteToken: 'var(--color-rel-hierarchy)',
    siteFillLight: '#46637D',
    siteFillDark: '#7A95A2',
  },
  schedule: {
    title: 'schedule.theor.net',
    description: 'Muted olive s for sequence, time, and booking flows.',
    siteGlyph: 's',
    siteToken: 'var(--color-rel-sequence)',
    siteFillLight: '#5E7850',
    siteFillDark: '#8FA27A',
  },
  cue: {
    title: 'cue.theor.net',
    description: 'Muted mauve c for generative and art-adjacent work.',
    siteGlyph: 'c',
    siteToken: 'var(--color-rel-type)',
    siteFillLight: '#7A5567',
    siteFillDark: '#A27A8F',
  },
};

export const THEOR_BRAND_VARIANTS = Object.keys(theorBrandVariants) as TheorBrandVariant[];

export function getTheorMarkLayers(variant: TheorBrandVariant) {
  const definition = theorBrandVariants[variant];
  const placements = definition.siteGlyph
    ? [pairCorePlacement, sitePlacements[definition.siteGlyph]]
    : [corePlacement];

  return placements.map((placement) => ({
    d: glyphs[placement.glyph],
    fill: placement.fill,
    transform: `translate(${placement.x} ${placement.y}) scale(${placement.scale})`,
  }));
}

export function getTheorMarkSiteFill(variant: TheorBrandVariant) {
  return theorBrandVariants[variant].siteToken ?? 'currentColor';
}

export function renderTheorBrandSvg(variant: TheorBrandVariant) {
  const definition = theorBrandVariants[variant];
  const layers = getTheorMarkLayers(variant);
  const paths = layers
    .map(({ d, fill, transform }) => {
      const className = fill === 'core' ? 'theor-mark__core' : 'theor-mark__site';
      return `  <path class="${className}" d="${d}" transform="${transform}" />`;
    })
    .join('\n');

  const siteStyles =
    definition.siteFillLight && definition.siteFillDark
      ? `\n    .theor-mark__site { fill: ${definition.siteFillLight}; }\n    @media (prefers-color-scheme: dark) {\n      .theor-mark__site { fill: ${definition.siteFillDark}; }\n    }`
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${THEOR_BRAND_VIEWBOX}" fill="none" aria-label="${definition.title}">
${paths}
  <style>
    .theor-mark__core { fill: ${THEOR_BRAND_CORE_LIGHT}; }${siteStyles}
    @media (prefers-color-scheme: dark) {
      .theor-mark__core { fill: ${THEOR_BRAND_CORE_DARK}; }
    }
  </style>
</svg>
`;
}
