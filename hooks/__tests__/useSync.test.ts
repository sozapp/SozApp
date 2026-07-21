import { planMerge } from '@/hooks/useSync';

const T1 = '2026-01-01T00:00:00.000Z';
const T2 = '2026-01-02T00:00:00.000Z';
const T3 = '2026-01-03T00:00:00.000Z';

describe('planMerge', () => {
  it('does nothing when both sides already agree', () => {
    const plan = planMerge({ a: T1 }, { a: T1 }, { a: T1 });
    expect(plan).toEqual({ push: [], pull: [], deleteRemote: [], deleteLocal: [] });
  });

  it('pushes when the local copy is newer than remote', () => {
    const plan = planMerge({ a: T2 }, { a: T1 }, { a: T1 });
    expect(plan.push).toEqual(['a']);
    expect(plan.pull).toEqual([]);
  });

  it('pulls when the remote copy is newer than local', () => {
    const plan = planMerge({ a: T1 }, { a: T2 }, { a: T1 });
    expect(plan.pull).toEqual(['a']);
    expect(plan.push).toEqual([]);
  });

  it('pushes a brand new local item never seen before', () => {
    const plan = planMerge({ a: T1 }, {}, {});
    expect(plan.push).toEqual(['a']);
  });

  it('pulls a brand new remote item never seen before', () => {
    const plan = planMerge({}, { a: T1 }, {});
    expect(plan.pull).toEqual(['a']);
  });

  it('propagates a local deletion to the remote when remote is unchanged since last sync', () => {
    // Item was synced at T1, remote still shows T1 (untouched), local has removed it.
    const plan = planMerge({}, { a: T1 }, { a: T1 });
    expect(plan.deleteRemote).toEqual(['a']);
    expect(plan.pull).toEqual([]);
  });

  it('propagates a remote deletion to the local copy when local is unchanged since last sync', () => {
    const plan = planMerge({ a: T1 }, {}, { a: T1 });
    expect(plan.deleteLocal).toEqual(['a']);
    expect(plan.push).toEqual([]);
  });

  it('does NOT delete remotely if remote was edited after the last known sync (resurrection case)', () => {
    // Snapshot says T1 was the last agreed state; local has deleted it, but remote
    // has since moved on to T3 (edited on another device) — that edit must win.
    const plan = planMerge({}, { a: T3 }, { a: T1 });
    expect(plan.pull).toEqual(['a']);
    expect(plan.deleteRemote).toEqual([]);
  });

  it('does NOT delete locally if local was edited after the last known sync (recreate case)', () => {
    const plan = planMerge({ a: T3 }, {}, { a: T1 });
    expect(plan.push).toEqual(['a']);
    expect(plan.deleteLocal).toEqual([]);
  });

  it('handles multiple independent ids in a single pass', () => {
    const plan = planMerge(
      { newLocal: T1, agree: T1, deletedRemotely: T1 },
      { agree: T1, newRemote: T1 },
      { agree: T1, deletedRemotely: T1 }
    );
    expect(plan.push.sort()).toEqual(['newLocal']);
    expect(plan.pull.sort()).toEqual(['newRemote']);
    expect(plan.deleteLocal.sort()).toEqual(['deletedRemotely']);
    expect(plan.deleteRemote).toEqual([]);
  });
});
