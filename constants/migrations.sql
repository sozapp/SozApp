-- Söz uygulaması Supabase şeması
-- Supabase Dashboard > SQL Editor'da çalıştırın.

-- Kullanıcı profili (auth.users ile bağlantılı)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notlar (ayet bazlı)
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  verse_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, verse_id)
);

-- Vurgular (ayet + renk)
CREATE TABLE IF NOT EXISTS highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  verse_id TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, verse_id)
);

-- Favoriler (ayet id listesi)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  verse_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, verse_id)
);

-- Okuma planı ilerlemesi
CREATE TABLE IF NOT EXISTS plan_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  plan_id TEXT NOT NULL,
  completed_days INTEGER[] DEFAULT '{}',
  streak INTEGER DEFAULT 0,
  last_read_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, plan_id)
);

-- Arkadaşlık (profiles_select politikası bunlara referans verdiği için tablolar RLS bölümünden önce olmalı)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS friend_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  verse_id TEXT,
  book TEXT,
  chapter INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_activity_user_created ON friend_activity(user_id, created_at DESC);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id = profiles.id)
          OR (f.friend_id = auth.uid() AND f.user_id = profiles.id)
        )
    )
    OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'pending' AND f.friend_id = auth.uid() AND f.user_id = profiles.id
    )
  );

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  USING (auth.uid() = id);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own notes" ON notes;
DROP POLICY IF EXISTS "Users own highlights" ON highlights;
DROP POLICY IF EXISTS "Users own favorites" ON favorites;
DROP POLICY IF EXISTS "Users own plan_progress" ON plan_progress;

CREATE POLICY "Users own notes" ON notes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own highlights" ON highlights
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own plan_progress" ON plan_progress
  FOR ALL USING (auth.uid() = user_id);

-- Profil e-postası (arkadaş daveti için)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
UPDATE profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), profiles.display_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Arkadaşlık RLS (tablolar yukarıda oluşturuldu)
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_select" ON friendships;
DROP POLICY IF EXISTS "friendships_insert" ON friendships;
DROP POLICY IF EXISTS "friendships_update" ON friendships;
DROP POLICY IF EXISTS "friendships_delete" ON friendships;

CREATE POLICY "friendships_select" ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "friendships_insert" ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id AND user_id <> friend_id);

CREATE POLICY "friendships_update" ON friendships FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "friendships_delete" ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "friend_activity_insert" ON friend_activity;
DROP POLICY IF EXISTS "friend_activity_select" ON friend_activity;

CREATE POLICY "friend_activity_insert" ON friend_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "friend_activity_select" ON friend_activity FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id = friend_activity.user_id)
          OR (f.friend_id = auth.uid() AND f.user_id = friend_activity.user_id)
        )
    )
  );

-- E-posta ile kullanıcı bul (davet için)
CREATE OR REPLACE FUNCTION public.find_user_by_email(search_email text)
RETURNS TABLE (uid uuid, uname text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT p.id, COALESCE(NULLIF(trim(p.display_name), ''), split_part(u.email, '@', 1))::text
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE lower(trim(u.email)) = lower(trim(search_email))
    AND u.id <> auth.uid()
    AND COALESCE(u.is_anonymous, false) = false
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;

-- Premium / RevenueCat (webhook tarafından güncellenir)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenuecat_app_user_id TEXT;

-- AI günlük kullanım (edge function service role ile yazar)
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id UUID REFERENCES auth.users NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own ai_usage" ON ai_usage;
CREATE POLICY "Users read own ai_usage" ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Atomik günlük AI sayacı (ask-ai edge function)
CREATE OR REPLACE FUNCTION public.increment_daily_ai_usage(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO ai_usage (user_id, usage_date, question_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET question_count = ai_usage.question_count + 1
  RETURNING question_count INTO v_count;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_daily_ai_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_daily_ai_usage(uuid) TO service_role;

-- Çoklu cihaz senkronu: hangi tarafın değişikliğinin daha yeni olduğunu
-- bilmek için highlights ve favorites tablolarına da updated_at eklenir
-- (notes'ta zaten vardı). useSync.ts artık son senkronun anlık görüntüsüyle
-- üç yönlü birleştirme yapıyor; bu sütunlar olmadan silme/güncelleme
-- çakışmaları yanlış tarafı kazanıyordu.
ALTER TABLE highlights ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Kilise Grubu: önceden tamamen yerel/sahte olan özellik (sabit kodlanmış
-- "SOZI23" demo kodu, hayalet üye listesi) gerçek çok kullanıcılı bir
-- gruba çevriliyor. display_name satırlara denormalize ediliyor (friend_activity
-- ile aynı desen) — profiles tablosuna grup üyeliği üzerinden erişim açmaya
-- gerek kalmasın diye.
CREATE TABLE IF NOT EXISTS church_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  group_name TEXT NOT NULL,
  church_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users NOT NULL,
  plan_reference TEXT,
  plan_days_left INTEGER,
  plan_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS church_group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES church_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS church_prayers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES church_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  display_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS church_plan_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES church_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  plan_reference TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id, plan_reference)
);

CREATE INDEX IF NOT EXISTS idx_church_group_members_group ON church_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_church_group_members_user ON church_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_church_prayers_group ON church_prayers(group_id);
CREATE INDEX IF NOT EXISTS idx_church_plan_completions_group ON church_plan_completions(group_id, plan_reference);

ALTER TABLE church_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_plan_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "church_groups_select" ON church_groups;
DROP POLICY IF EXISTS "church_groups_insert" ON church_groups;
DROP POLICY IF EXISTS "church_groups_update" ON church_groups;

-- Kod ile katılabilmek için grup satırı üyelik şartı olmadan okunabilir
-- olmalı (kodu bilen zaten davetlidir sayılır) — grup adı/kilise adı/kod
-- hassas veri değil.
CREATE POLICY "church_groups_select" ON church_groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "church_groups_insert" ON church_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "church_groups_update" ON church_groups FOR UPDATE
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "church_group_members_select" ON church_group_members;
DROP POLICY IF EXISTS "church_group_members_insert" ON church_group_members;
DROP POLICY IF EXISTS "church_group_members_delete" ON church_group_members;

CREATE POLICY "church_group_members_select" ON church_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM church_group_members me
      WHERE me.group_id = church_group_members.group_id AND me.user_id = auth.uid()
    )
  );

CREATE POLICY "church_group_members_insert" ON church_group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "church_group_members_delete" ON church_group_members FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "church_prayers_select" ON church_prayers;
DROP POLICY IF EXISTS "church_prayers_insert" ON church_prayers;

CREATE POLICY "church_prayers_select" ON church_prayers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM church_group_members m
      WHERE m.group_id = church_prayers.group_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "church_prayers_insert" ON church_prayers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM church_group_members m
      WHERE m.group_id = church_prayers.group_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "church_plan_completions_select" ON church_plan_completions;
DROP POLICY IF EXISTS "church_plan_completions_insert" ON church_plan_completions;
DROP POLICY IF EXISTS "church_plan_completions_delete" ON church_plan_completions;

CREATE POLICY "church_plan_completions_select" ON church_plan_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM church_group_members m
      WHERE m.group_id = church_plan_completions.group_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "church_plan_completions_insert" ON church_plan_completions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM church_group_members m
      WHERE m.group_id = church_plan_completions.group_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "church_plan_completions_delete" ON church_plan_completions FOR DELETE
  USING (auth.uid() = user_id);

-- useChurch.ts'in loadPrayers() sorgusu group_id'ye göre filtreleyip
-- created_at DESC ile sıralıyor (limit 50) — eski tekil-kolon index bunu
-- karşılayamayıp ayrı bir sort adımı gerektiriyordu. Bileşik index hem
-- filtreyi hem sıralamayı tek geçişte karşılıyor.
DROP INDEX IF EXISTS idx_church_prayers_group;
CREATE INDEX IF NOT EXISTS idx_church_prayers_group_created
  ON church_prayers(group_id, created_at DESC);

-- Profil fotoğrafı: önceden sadece cihaz-yerel (@soz/profileImage) olduğu
-- için telefon değişince / uygulama silinip yüklenince kayboluyordu.
-- Şimdi Supabase Storage'a yükleniyor, profiles.avatar_url'de tutuluyor.
-- Bucket public-read (profil fotoğrafı hassas veri değil, ileride arkadaş/
-- grup üyesi fotoğrafı gösterme ihtimaline karşı imzalı URL karmaşıklığından
-- kaçınıldı) — yazma/güncelleme/silme sadece dosyanın kendi klasöründeki
-- (user_id) sahibine açık.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
