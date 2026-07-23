import { act } from 'react-test-renderer';
import {
  authState,
  flushAsync,
  mockSupabaseClient,
  renderHook,
  resetMockSupabase,
  tableData,
} from '@/hooks/testUtils';
import { useChurch, type ChurchGroup } from '@/hooks/useChurch';

jest.mock('@/constants/supabase', () => ({
  supabase: mockSupabaseClient,
}));

type ActionResult = { ok: boolean; error?: string };

beforeEach(() => {
  resetMockSupabase();
});

describe('useChurch — refresh()', () => {
  it(
    'regresyon: church_group_members birden fazla satır dönerse (kullanıcı DB kısıtı ' +
      'öncesinden iki gruba üye olmuşsa) hata fırlatmadan en eski üyeliği seçer',
    async () => {
      authState.user = { id: 'user-1', email: 'user1@example.com' };
      // .maybeSingle() kullanılsaydı bu 2 satır PGRST116 hatası fırlatırdı — kod artık
      // .order('joined_at', asc).limit(1) kullanıyor, bu yüzden en eski satır (group-old)
      // sessizce ve doğru şekilde seçilmeli.
      tableData.church_group_members = [
        {
          group_id: 'group-old',
          role: 'member',
          joined_at: '2020-01-01T00:00:00.000Z',
          church_groups: {
            id: 'group-old',
            code: 'OLDCODE',
            group_name: 'Eski Grup',
            church_name: 'Eski Kilise',
            plan_reference: null,
            plan_days_left: null,
          },
        },
        {
          group_id: 'group-new',
          role: 'admin',
          joined_at: '2024-06-01T00:00:00.000Z',
          church_groups: {
            id: 'group-new',
            code: 'NEWCODE',
            group_name: 'Yeni Grup',
            church_name: 'Yeni Kilise',
            plan_reference: null,
            plan_days_left: null,
          },
        },
      ];

      const { result } = renderHook(() => useChurch());
      await flushAsync();

      await act(async () => {
        const refreshResult: ChurchGroup | null = await result.current.refresh();
        expect(refreshResult).not.toBeNull();
        expect(refreshResult?.id).toBe('group-old');
        expect(refreshResult?.code).toBe('OLDCODE');
      });
    }
  );

  it('joinGroup: kod doğru olsa bile refresh() null dönerse {ok:false} döner', async () => {
    authState.user = { id: 'user-1', email: 'user1@example.com' };
    tableData.church_groups = [{ id: 'group-1', code: 'ABC123' }];
    // Üyelik satırı hiç yok → insert "başarılı" olsa da refresh() içindeki üyelik
    // sorgusu boş döner → membership null → refresh() null döner.
    tableData.church_group_members = [];

    const { result } = renderHook(() => useChurch());
    await flushAsync();

    let joinResult: ActionResult = { ok: true };
    await act(async () => {
      joinResult = await result.current.joinGroup('ABC123');
    });

    expect(joinResult.ok).toBe(false);
    expect(joinResult.error).toBeTruthy();
  });

  it('createGroup: grup/üyelik insert edilse bile refresh() null dönerse {ok:false} döner', async () => {
    authState.user = { id: 'user-1', email: 'user1@example.com' };
    // insert().select('id').single() bu satırı "yeni oluşturulan grup" gibi döndürsün.
    tableData.church_groups = [{ id: 'group-new-1' }];
    // Üyelik satırı yok → refresh() null döner.
    tableData.church_group_members = [];

    const { result } = renderHook(() => useChurch());
    await flushAsync();

    let createResult: ActionResult = { ok: true };
    await act(async () => {
      createResult = await result.current.createGroup('Grubum', 'Kilisem');
    });

    expect(createResult.ok).toBe(false);
    expect(createResult.error).toBeTruthy();
  });
});
