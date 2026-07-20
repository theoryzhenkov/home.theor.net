import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import { THEOR_BRAND_VARIANTS, renderTheorBrandSvg } from '../src/lib/theor-brand';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(projectRoot, 'public');
const brandDir = join(publicDir, 'brand');

async function run(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore' });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function renderPng(svgPath: string, pngPath: string, size: number) {
  const attempts: Array<[string, string[]]> = [
    [
      'rsvg-convert',
      ['--width', `${size}`, '--height', `${size}`, '--output', pngPath, svgPath],
    ],
    ['magick', [svgPath, '-background', 'none', '-resize', `${size}x${size}`, pngPath]],
  ];

  let lastError: unknown;

  for (const [command, args] of attempts) {
    try {
      await run(command, args);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function main() {
  await mkdir(brandDir, { recursive: true });

  for (const variant of THEOR_BRAND_VARIANTS) {
    const svg = renderTheorBrandSvg(variant);
    const svgPath = join(brandDir, `theor-${variant}.svg`);
    const pngPath = join(brandDir, `theor-${variant}-256.png`);

    await writeFile(svgPath, svg, 'utf8');
    await renderPng(svgPath, pngPath, 256);
  }

  const homeSvg = renderTheorBrandSvg('home');
  const homeSvgPath = join(brandDir, 'theor-home.svg');

  await writeFile(join(publicDir, 'favicon.svg'), homeSvg, 'utf8');
  await renderPng(homeSvgPath, join(publicDir, 'theor-home-256.png'), 256);
  await renderPng(homeSvgPath, join(publicDir, 'apple-touch-icon.png'), 180);

  console.log(`Generated brand assets for ${THEOR_BRAND_VARIANTS.join(', ')}`);
}

await main();
