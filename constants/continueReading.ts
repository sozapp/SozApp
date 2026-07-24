import { FREE_PLAN_ID } from '@/constants/premium';
import { plans, type ReadingPlan } from '@/constants/plans';
import { getPlanProgress, type PlanProgress } from '@/constants/storage';

/** plans.ts bookShort → read.tsx bookId */
export const BOOK_SHORT_TO_ID: Record<string, string> = {
  Mat: 'mat',
  Mar: 'mar',
  Luk: 'luk',
  Yuh: 'joh',
  Elç: 'act',
  Rom: 'rom',
  '1Ko': '1co',
  '2Ko': '2co',
  Gal: 'gal',
  Ef: 'eph',
  Flp: 'php',
  Kol: 'col',
  '1Se': '1th',
  '2Se': '2th',
  '1Ti': '1ti',
  '2Ti': '2ti',
  Tit: 'tit',
  Flm: 'phm',
};

export function getPlanCurrentDay(progress: PlanProgress | null, totalDays: number): number {
  if (progress == null) return 1;
  const start = new Date(progress.startDate).getTime();
  const dayIndex = Math.floor((Date.now() - start) / 86400000);
  return Math.min(totalDays, Math.max(1, dayIndex + 1));
}

export type ContinueReadingDestination = {
  pathname: '/(tabs)/read';
  params?: { bookId: string; chapter: string };
};

/**
 * Okuma planındaki kaldığın güne giden navigasyon hedefi.
 * plans.tsx handleStartOrContinue ile aynı bookId/chapter mantığı.
 */
export async function resolveContinueReadingDestination(): Promise<ContinueReadingDestination> {
  let best: { plan: ReadingPlan; progress: PlanProgress } | null = null;

  for (const plan of plans) {
    try {
      const progress = await getPlanProgress(plan.id);
      if (!progress) continue;
      const bestKey = best?.progress.lastReadDate ?? best?.progress.startDate ?? '';
      const thisKey = progress.lastReadDate ?? progress.startDate;
      if (!best || thisKey >= bestKey) {
        best = { plan, progress };
      }
    } catch {
      /* ignore */
    }
  }

  const plan =
    best?.plan ?? plans.find((p) => p.id === FREE_PLAN_ID) ?? plans[0];
  if (!plan) {
    return { pathname: '/(tabs)/read' };
  }

  const progress = best?.progress ?? null;
  const currentDay = getPlanCurrentDay(progress, plan.totalDays);
  const dayInfo = plan.days.find((d) => d.day === currentDay);
  const bookId = dayInfo ? BOOK_SHORT_TO_ID[dayInfo.bookShort] : undefined;

  if (dayInfo && bookId) {
    return {
      pathname: '/(tabs)/read',
      params: { bookId, chapter: String(dayInfo.chapter) },
    };
  }
  return { pathname: '/(tabs)/read' };
}
