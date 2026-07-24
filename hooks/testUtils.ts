/**
 * Test-only yardımcılar (renderHook + Supabase query-builder mock'u).
 *
 * Bu dosya `__tests__` klasörünün DIŞINDA duruyor çünkü jest'in varsayılan
 * testMatch deseni (`**\/__tests__/**\/*.[jt]s?(x)`) o klasördeki HER dosyayı
 * test dosyası sayar — içinde `it()/describe()` olmayan bir yardımcı dosya
 * oraya konursa "test suite must contain at least one test" hatası verir.
 */
import * as React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

// ---------------------------------------------------------------------------
// renderHook — @testing-library/react-hooks projede kurulu değil; react-test-renderer
// üzerine minimal bir eşdeğerini kuruyoruz (useSync.test.ts saf fonksiyon test ettiği
// için buna ihtiyaç duymamıştı).
// ---------------------------------------------------------------------------

export function renderHook<T>(callback: () => T) {
  const result: { current: T } = { current: undefined as unknown as T };
  let renderer: ReactTestRenderer;

  function TestComponent() {
    result.current = callback();
    return null;
  }

  act(() => {
    renderer = create(React.createElement(TestComponent));
  });

  return {
    result,
    rerender: () => {
      act(() => {
        renderer.update(React.createElement(TestComponent));
      });
    },
    unmount: () => {
      act(() => {
        renderer.unmount();
      });
    },
  };
}

/** Mount anında tetiklenen (bekletilmeyen) async efektlerin oturmasına izin verir. */
export async function flushAsync(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

// ---------------------------------------------------------------------------
// Supabase mock — .from(table).select().eq().order().limit()/.single()/.maybeSingle()
// zincirini gerçek @supabase/supabase-js'e yakın şekilde simüle eder.
// ---------------------------------------------------------------------------

export type MockRow = Record<string, unknown>;

/** Tablo adı -> o tabloya "await"lendiğinde dönecek satırlar. Testler bunu doldurur. */
export const tableData: Record<string, MockRow[]> = {};

export const authState: { user: { id: string; email?: string | null } | null } = {
  user: null,
};

type ThenableBuilder = PromiseLike<{ data: MockRow[]; error: unknown }> & {
  select: (...args: unknown[]) => ThenableBuilder;
  eq: (...args: unknown[]) => ThenableBuilder;
  neq: (...args: unknown[]) => ThenableBuilder;
  or: (...args: unknown[]) => ThenableBuilder;
  in: (...args: unknown[]) => ThenableBuilder;
  is: (...args: unknown[]) => ThenableBuilder;
  order: (...args: unknown[]) => ThenableBuilder;
  limit: (n: number) => ThenableBuilder;
  insert: (...args: unknown[]) => ThenableBuilder;
  update: (...args: unknown[]) => ThenableBuilder;
  delete: (...args: unknown[]) => ThenableBuilder;
  single: () => Promise<{ data: MockRow | null; error: unknown }>;
  maybeSingle: () => Promise<{ data: MockRow | null; error: unknown }>;
};

function multipleRowsError() {
  return { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' };
}

function makeBuilder(table: string): ThenableBuilder {
  const filters: Array<(row: MockRow) => boolean> = [];
  let pendingUpdate: MockRow | null = null;
  let pendingDelete = false;
  let limitN: number | null = null;

  const matching = (row: MockRow) => filters.every((f) => f(row));

  const currentRows = (): MockRow[] => {
    let rows = [...(tableData[table] ?? [])];
    rows = rows.filter(matching);
    if (limitN != null) rows = rows.slice(0, limitN);
    return rows;
  };

  const applyMutation = () => {
    if (pendingUpdate) {
      const rows = tableData[table] ?? [];
      for (let i = 0; i < rows.length; i++) {
        if (matching(rows[i]!)) {
          rows[i] = { ...rows[i], ...pendingUpdate };
        }
      }
      pendingUpdate = null;
    }
    if (pendingDelete) {
      const rows = tableData[table] ?? [];
      tableData[table] = rows.filter((r) => !matching(r));
      pendingDelete = false;
    }
  };

  const builder: ThenableBuilder = {
    select: () => builder,
    eq: (col, val) => {
      filters.push((r) => r[String(col)] === val);
      return builder;
    },
    neq: (col, val) => {
      filters.push((r) => r[String(col)] !== val);
      return builder;
    },
    or: () => builder,
    in: (col, vals) => {
      const arr = Array.isArray(vals) ? vals : [];
      filters.push((r) => arr.includes(r[String(col)]));
      return builder;
    },
    is: (col, val) => {
      filters.push((r) => (val === null ? r[String(col)] == null : r[String(col)] === val));
      return builder;
    },
    order: () => builder,
    limit: (n: number) => {
      limitN = n;
      return builder;
    },
    insert: () => builder,
    update: (patch) => {
      pendingUpdate = (patch ?? {}) as MockRow;
      return builder;
    },
    delete: () => {
      pendingDelete = true;
      return builder;
    },
    single: () => {
      applyMutation();
      const rows = currentRows();
      if (rows.length !== 1) {
        return Promise.resolve({ data: null, error: multipleRowsError() });
      }
      return Promise.resolve({ data: rows[0], error: null });
    },
    maybeSingle: () => {
      applyMutation();
      const rows = currentRows();
      if (rows.length > 1) {
        return Promise.resolve({ data: null, error: multipleRowsError() });
      }
      return Promise.resolve({ data: rows[0] ?? null, error: null });
    },
    then: (resolve, reject) => {
      applyMutation();
      return Promise.resolve({ data: currentRows(), error: null }).then(resolve, reject);
    },
  };
  return builder;
}

export const mockSupabaseClient = {
  auth: {
    getUser: async () => ({ data: { user: authState.user } }),
  },
  from: (table: string) => makeBuilder(table),
  // hooks/useMessages.ts realtime abonelik açıyor — gerçek bağlantı kurmadan
  // no-op bir kanal döndürüyoruz ki `.channel(...).on(...).subscribe()` patlamasın.
  channel: (_name: string, _opts?: unknown) => {
    const chan = {
      on: () => chan,
      subscribe: () => chan,
      send: async () => ({ status: 'ok' as const }),
    };
    return chan;
  },
  removeChannel: async (_channel: unknown) => {},
};

/** Her testten önce çağır — tablolar ve auth state'i temizler. */
export function resetMockSupabase(): void {
  for (const key of Object.keys(tableData)) delete tableData[key];
  authState.user = null;
}
