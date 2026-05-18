import type { MaterialsConfiguratorOption } from '@/types/catalog';

export const METRO_ID_PATTERN = /^metro[_ -]/i;

const FRAME_COLOR_FROM_NAME: Record<string, string> = {
  white: 'RAL9003',
  black: 'RAL9005',
  grey: 'RAL9006',
  gray: 'RAL9006',
};

export function parsePackshotImage(filename: string | undefined): {
  topCode?: string;
  frameCode?: string;
} {
  if (!filename) return {};
  const base = filename.split('/').pop() ?? '';
  const stem = base.replace(/\.[^.]+$/, '').split('__')[0];
  const tokens = stem.split('_');
  const topToken = tokens[1];
  const frameToken = tokens[2];
  const topCode =
    topToken && /^[UW]\d+$/i.test(topToken)
      ? topToken.toUpperCase()
      : undefined;

  let frameCode: string | undefined;
  if (frameToken) {
    if (/^RAL\d+$/i.test(frameToken)) {
      frameCode = frameToken.toUpperCase();
    } else {
      frameCode = FRAME_COLOR_FROM_NAME[frameToken.toLowerCase()];
    }
  }
  return { topCode, frameCode };
}

export function pickConfiguratorOption(
  options: MaterialsConfiguratorOption[] | undefined,
  code: string | undefined,
): MaterialsConfiguratorOption | undefined {
  if (!options || !code) return undefined;
  const upper = code.toUpperCase();
  const matches = options.filter(
    (option) => option.code.toUpperCase() === upper,
  );
  if (matches.length === 0) return undefined;

  const metroEntry = matches.find((option) => METRO_ID_PATTERN.test(option.id));
  const swatchEntry = matches.find(
    (option) => !METRO_ID_PATTERN.test(option.id),
  );

  if (metroEntry && swatchEntry) {
    return {
      ...metroEntry,
      label: swatchEntry.label,
      thumbnail: swatchEntry.image,
    };
  }
  return swatchEntry ?? metroEntry ?? matches[0];
}

export function dedupeByCode(options: MaterialsConfiguratorOption[]) {
  const seen = new Set<string>();
  const result: MaterialsConfiguratorOption[] = [];
  for (const option of options) {
    if (seen.has(option.code)) continue;
    const preferred = pickConfiguratorOption(options, option.code);
    if (!preferred) continue;
    seen.add(option.code);
    result.push(preferred);
  }
  return result;
}

export function orderOptions(
  options: MaterialsConfiguratorOption[],
  orderedCodes: string[],
): MaterialsConfiguratorOption[] {
  return orderedCodes.flatMap((code) => {
    const option = pickConfiguratorOption(options, code);
    return option ? [option] : [];
  });
}

export function formatOptionCode(code: string): string {
  return code.startsWith('RAL') ? `RAL ${code.slice(3)}` : code;
}
