import AsyncStorage from '@react-native-async-storage/async-storage';

export type PlanProgress = {
  planId: string;
  startDate: string;
  completedDays: number[];
  lastReadDate: string | null;
  streak: number;
};

const STORAGE_KEY = '@soz/plan-progress';

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function getPlanProgress(planId: string): Promise<PlanProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const data = JSON.parse(raw) as Record<string, PlanProgress>;
    const progress = data[planId] ?? null;
    if (progress == null) return null;
    progress.streak = await calculateStreak(progress);
    return progress;
  } catch (_) {
    return null;
  }
}

export async function savePlanProgress(progress: PlanProgress): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const data: Record<string, PlanProgress> = raw != null ? JSON.parse(raw) : {};
    data[progress.planId] = progress;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {
    // ignore
  }
}

export async function calculateStreak(progress: PlanProgress): Promise<number> {
  if (progress.lastReadDate == null) return 0;
  const today = todayString();
  const yesterday = yesterdayString();
  if (progress.lastReadDate === today || progress.lastReadDate === yesterday) {
    return progress.streak;
  }
  return 0;
}

export async function markDayComplete(planId: string, day: number): Promise<PlanProgress> {
  const today = todayString();
  const yesterday = yesterdayString();

  let progress = await getPlanProgress(planId);

  if (progress == null) {
    progress = {
      planId,
      startDate: today,
      completedDays: [day],
      lastReadDate: today,
      streak: 1,
    };
  } else {
    const completedSet = new Set(progress.completedDays);
    if (!completedSet.has(day)) {
      completedSet.add(day);
      progress.completedDays = Array.from(completedSet).sort((a, b) => a - b);
    }
    const prevLast = progress.lastReadDate;
    progress.lastReadDate = today;
    if (prevLast === yesterday) {
      progress.streak += 1;
    } else if (prevLast !== today) {
      progress.streak = 1;
    }
  }

  await savePlanProgress(progress);
  return progress;
}
