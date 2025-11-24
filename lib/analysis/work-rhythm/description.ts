import { BestFocusWindow } from '@/types/api/work-rhythm';

export function buildWorkRhythmDescription({
  bestFocusWindows,
  avgDeepWorkBlocksPerWeek,
  eveningSharePercent,
}: {
  bestFocusWindows: BestFocusWindow[];
  avgDeepWorkBlocksPerWeek: number;
  eveningSharePercent: number;
}): string {
  if (!bestFocusWindows.length) {
    return 'We analyzed your activity to map out your typical weekly rhythm.';
  }

  const parts: string[] = [];

  // Primary
  const primary = bestFocusWindows[0];
  parts.push(`Your most consistent focus time is ${primary.label}`);
  if (bestFocusWindows.length > 1) {
    const second = bestFocusWindows[1];
    if (second.score >= primary.score * 0.6) {
      parts.push(`with a strong secondary window on ${second.label}`);
    }
  }

  // Deep-work blocks
  if (avgDeepWorkBlocksPerWeek >= 2) {
    parts.push(
      `. You typically get about ${avgDeepWorkBlocksPerWeek} deep-work blocks each week`
    );
  }

  // Evening share
  if (eveningSharePercent >= 20) {
    parts.push(
      `. Around ${eveningSharePercent}% of your overall activity lands in the evening`
    );
  }

  return parts.join(' ') + '.';
}
