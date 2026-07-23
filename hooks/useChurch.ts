import { supabase } from '@/constants/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const CACHE_KEY = '@soz/church';

export type ChurchGroup = {
  id: string;
  code: string;
  groupName: string;
  churchName: string;
  role: 'admin' | 'member';
  joinedAt: string;
  planReference: string | null;
  planDaysLeft: number | null;
};

export type ChurchMember = {
  userId: string;
  displayName: string;
  role: 'admin' | 'member';
  joinedAt: string;
  completed: boolean;
};

export type ChurchPrayer = {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
};

type ActionResult = { ok: boolean; error?: string };

export function generateGroupCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function myDisplayName(userId: string, fallbackEmail?: string | null): Promise<string> {
  if (supabase) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();
      const name = (data as { display_name: string | null } | null)?.display_name?.trim();
      if (name) return name;
    } catch {
      /* ignore */
    }
  }
  return fallbackEmail?.split('@')[0]?.trim() || 'Üye';
}

export function useChurch() {
  const [church, setChurchState] = useState<ChurchGroup | null>(null);
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [prayers, setPrayers] = useState<ChurchPrayer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async (groupId: string, planReference: string | null) => {
    if (!supabase) return;
    try {
      const { data: memberRows, error } = await supabase
        .from('church_group_members')
        .select('user_id, display_name, role, joined_at')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });
      if (error || !memberRows) {
        setMembers([]);
        return;
      }
      let completedIds = new Set<string>();
      if (planReference) {
        const { data: completions } = await supabase
          .from('church_plan_completions')
          .select('user_id')
          .eq('group_id', groupId)
          .eq('plan_reference', planReference);
        completedIds = new Set(
          ((completions ?? []) as { user_id: string }[]).map((c) => c.user_id)
        );
      }
      setMembers(
        (memberRows as { user_id: string; display_name: string; role: string; joined_at: string }[]).map(
          (m) => ({
            userId: m.user_id,
            displayName: m.display_name,
            role: m.role as 'admin' | 'member',
            joinedAt: m.joined_at,
            completed: completedIds.has(m.user_id),
          })
        )
      );
    } catch (e) {
      console.warn('[Church] loadMembers failed:', e);
      setMembers([]);
    }
  }, []);

  const loadPrayers = useCallback(async (groupId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('church_prayers')
        .select('id, user_id, display_name, text, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error || !data) {
        setPrayers([]);
        return;
      }
      setPrayers(
        (
          data as { id: string; user_id: string; display_name: string; text: string; created_at: string }[]
        ).map((p) => ({
          id: p.id,
          userId: p.user_id,
          displayName: p.display_name,
          text: p.text,
          createdAt: p.created_at,
        }))
      );
    } catch (e) {
      console.warn('[Church] loadPrayers failed:', e);
      setPrayers([]);
    }
  }, []);

  const refresh = useCallback(async (): Promise<ChurchGroup | null> => {
    if (!supabase) {
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setChurchState(null);
        setMembers([]);
        setPrayers([]);
        return null;
      }
      // .maybeSingle() beklediği tek satır yerine 2+ satır dönerse Postgrest
      // hata fırlatır (kullanıcı DB kısıtı eklenmeden önce birden fazla gruba
      // üye olmuşsa) — order+limit(1) ile en eski üyeliği deterministik
      // olarak seçip bu senaryoda da sessizce "üye değilsin" durumuna
      // düşmemiş oluyoruz.
      const { data: membershipRows, error } = await supabase
        .from('church_group_members')
        .select(
          'group_id, role, joined_at, church_groups(id, code, group_name, church_name, plan_reference, plan_days_left)'
        )
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true })
        .limit(1);
      if (error) {
        console.warn('[Church] refresh membership fetch:', error.message);
      }
      const membership = membershipRows?.[0] ?? null;
      const groupRow = (
        membership as {
          role: string;
          joined_at: string;
          church_groups: {
            id: string;
            code: string;
            group_name: string;
            church_name: string;
            plan_reference: string | null;
            plan_days_left: number | null;
          } | null;
        } | null
      )?.church_groups;
      if (error || !membership || !groupRow) {
        setChurchState(null);
        setMembers([]);
        setPrayers([]);
        await AsyncStorage.removeItem(CACHE_KEY);
        return null;
      }
      const next: ChurchGroup = {
        id: groupRow.id,
        code: groupRow.code,
        groupName: groupRow.group_name,
        churchName: groupRow.church_name,
        role: (membership as { role: string }).role as 'admin' | 'member',
        joinedAt: (membership as { joined_at: string }).joined_at,
        planReference: groupRow.plan_reference,
        planDaysLeft: groupRow.plan_days_left,
      };
      setChurchState(next);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
      await Promise.all([loadMembers(groupRow.id, groupRow.plan_reference), loadPrayers(groupRow.id)]);
      return next;
    } catch (e) {
      // Çevrimdışıyken cache'ten yüklenen değer ekranda kalsın
      console.warn('[Church] refresh failed:', e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadMembers, loadPrayers]);

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then((raw) => {
      if (!raw) return;
      try {
        setChurchState(JSON.parse(raw) as ChurchGroup);
      } catch {
        /* ignore */
      }
    });
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinGroup = useCallback(
    async (code: string): Promise<ActionResult> => {
      if (!supabase) return { ok: false, error: 'Sunucuya bağlanılamıyor.' };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: 'Önce giriş yapmalısınız.' };
      try {
        const { data: group, error: findErr } = await supabase
          .from('church_groups')
          .select('id')
          .eq('code', code)
          .maybeSingle();
        if (findErr || !group) return { ok: false, error: 'Geçersiz kod.' };
        const name = await myDisplayName(user.id, user.email);
        const { error: insertErr } = await supabase.from('church_group_members').insert({
          group_id: (group as { id: string }).id,
          user_id: user.id,
          display_name: name,
          role: 'member',
        });
        if (insertErr) {
          if ((insertErr as { code?: string }).code === '23505') {
            return { ok: false, error: 'Zaten bir gruba üyesiniz. Önce mevcut gruptan ayrılmalısınız.' };
          }
          return { ok: false, error: insertErr.message };
        }
        const joined = await refresh();
        if (!joined) {
          return { ok: false, error: 'Gruba katıldınız ama yüklenemedi, lütfen tekrar deneyin.' };
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Bir hata oluştu.' };
      }
    },
    [refresh]
  );

  const createGroup = useCallback(
    async (groupName: string, churchName: string): Promise<ActionResult> => {
      if (!supabase) return { ok: false, error: 'Sunucuya bağlanılamıyor.' };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: 'Önce giriş yapmalısınız.' };
      const name = await myDisplayName(user.id, user.email);
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateGroupCode();
        try {
          const { data: group, error: insertErr } = await supabase
            .from('church_groups')
            .insert({ code, group_name: groupName, church_name: churchName, created_by: user.id })
            .select('id')
            .single();
          if (insertErr) {
            if ((insertErr as { code?: string }).code === '23505') continue;
            return { ok: false, error: insertErr.message };
          }
          const { error: memberErr } = await supabase.from('church_group_members').insert({
            group_id: (group as { id: string }).id,
            user_id: user.id,
            display_name: name,
            role: 'admin',
          });
          if (memberErr) {
            if ((memberErr as { code?: string }).code === '23505') {
              return { ok: false, error: 'Zaten bir gruba üyesiniz. Önce mevcut gruptan ayrılmalısınız.' };
            }
            return { ok: false, error: memberErr.message };
          }
          const created = await refresh();
          if (!created) {
            return { ok: false, error: 'Grup oluşturuldu ama yüklenemedi, lütfen tekrar deneyin.' };
          }
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : 'Bir hata oluştu.' };
        }
      }
      return { ok: false, error: 'Kod oluşturulamadı, tekrar deneyin.' };
    },
    [refresh]
  );

  const leaveGroup = useCallback(async (): Promise<void> => {
    if (supabase && church) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('church_group_members')
            .delete()
            .eq('group_id', church.id)
            .eq('user_id', user.id);
        }
      } catch (e) {
        console.warn('[Church] leaveGroup failed:', e);
      }
    }
    setChurchState(null);
    setMembers([]);
    setPrayers([]);
    await AsyncStorage.removeItem(CACHE_KEY);
  }, [church]);

  const setWeeklyPlan = useCallback(
    async (reference: string, daysLeft: number): Promise<ActionResult> => {
      if (!supabase || !church) return { ok: false, error: 'Grup bulunamadı.' };
      try {
        const { error } = await supabase
          .from('church_groups')
          .update({
            plan_reference: reference,
            plan_days_left: daysLeft,
            plan_updated_at: new Date().toISOString(),
          })
          .eq('id', church.id);
        if (error) return { ok: false, error: error.message };
        await refresh();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Bir hata oluştu.' };
      }
    },
    [church, refresh]
  );

  const sendPrayer = useCallback(
    async (text: string): Promise<ActionResult> => {
      if (!supabase || !church) return { ok: false, error: 'Grup bulunamadı.' };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: 'Önce giriş yapmalısınız.' };
      const name = await myDisplayName(user.id, user.email);
      try {
        const { error } = await supabase
          .from('church_prayers')
          .insert({ group_id: church.id, user_id: user.id, display_name: name, text });
        if (error) return { ok: false, error: error.message };
        await loadPrayers(church.id);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Bir hata oluştu.' };
      }
    },
    [church, loadPrayers]
  );

  const toggleMyCompletion = useCallback(async (): Promise<void> => {
    if (!supabase || !church || !church.planReference) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const alreadyDone = members.some((m) => m.userId === user.id && m.completed);
    try {
      if (alreadyDone) {
        await supabase
          .from('church_plan_completions')
          .delete()
          .eq('group_id', church.id)
          .eq('user_id', user.id)
          .eq('plan_reference', church.planReference);
      } else {
        await supabase
          .from('church_plan_completions')
          .insert({ group_id: church.id, user_id: user.id, plan_reference: church.planReference });
      }
      await loadMembers(church.id, church.planReference);
    } catch (e) {
      console.warn('[Church] toggleMyCompletion failed:', e);
    }
  }, [church, members, loadMembers]);

  return {
    church,
    members,
    prayers,
    loading,
    joinGroup,
    createGroup,
    leaveGroup,
    setWeeklyPlan,
    sendPrayer,
    toggleMyCompletion,
    refresh,
  };
}
