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

-- Herkese açık Dua Duvarı (kilise grubundan bağımsız)
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  text TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  pray_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS prayer_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prayer_id UUID REFERENCES prayer_requests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (prayer_id, user_id)
);

CREATE TABLE IF NOT EXISTS prayer_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prayer_id UUID REFERENCES prayer_requests(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (prayer_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_prayer_requests_created
  ON prayer_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_reactions_prayer
  ON prayer_reactions(prayer_id);
CREATE INDEX IF NOT EXISTS idx_prayer_reactions_user
  ON prayer_reactions(user_id);

ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prayer_requests_select" ON prayer_requests;
DROP POLICY IF EXISTS "prayer_requests_insert" ON prayer_requests;
CREATE POLICY "prayer_requests_select" ON prayer_requests FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "prayer_requests_insert" ON prayer_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
-- pray_count güncellemesi yalnızca SECURITY DEFINER increment_pray_count ile

DROP POLICY IF EXISTS "prayer_reactions_select" ON prayer_reactions;
DROP POLICY IF EXISTS "prayer_reactions_insert" ON prayer_reactions;
CREATE POLICY "prayer_reactions_select" ON prayer_reactions FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "prayer_reactions_insert" ON prayer_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "prayer_reports_insert" ON prayer_reports;
DROP POLICY IF EXISTS "prayer_reports_select" ON prayer_reports;
CREATE POLICY "prayer_reports_insert" ON prayer_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "prayer_reports_select" ON prayer_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE OR REPLACE FUNCTION public.increment_pray_count(p_prayer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO prayer_reactions (prayer_id, user_id)
  VALUES (p_prayer_id, auth.uid())
  ON CONFLICT (prayer_id, user_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE prayer_requests
  SET pray_count = pray_count + 1
  WHERE id = p_prayer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_pray_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_pray_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_pray_count(uuid) TO service_role;

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

-- church_group_members_select'in kendi tablosuna EXISTS ile bakması
-- Postgres'te "infinite recursion detected in policy" (42P17) hatasına yol
-- açıyordu — RLS, alt sorgudaki church_group_members erişimi için politikayı
-- tekrar tetikliyor. SECURITY DEFINER fonksiyon RLS'i atlayarak döngüyü kırar.
CREATE OR REPLACE FUNCTION public.is_church_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM church_group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$;

CREATE POLICY "church_group_members_select" ON church_group_members FOR SELECT
  USING (public.is_church_group_member(group_id));

CREATE POLICY "church_group_members_insert" ON church_group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "church_group_members_delete" ON church_group_members FOR DELETE
  USING (auth.uid() = user_id);

-- Admin, gruptan başka bir üyeyi çıkarabilir. RLS sadece self-delete
-- izin verdiği için SECURITY DEFINER RPC gerekir. Kendi kendini çıkarma
-- engellenir (leaveGroup / self-delete politikası bunun için).
CREATE OR REPLACE FUNCTION public.remove_church_group_member(
  p_group_id UUID,
  p_target_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_remove_self'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM church_group_members
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'not_group_admin'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM church_group_members
  WHERE group_id = p_group_id
    AND user_id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found'
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_church_group_member(UUID, UUID) TO authenticated;

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

-- Not fotoğrafları — avatars ile aynı RLS deseni (public read, owner-only yazma)
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "note_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "note_images_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "note_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "note_images_owner_delete" ON storage.objects;

CREATE POLICY "note_images_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'note-images');

CREATE POLICY "note_images_owner_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'note-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "note_images_owner_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'note-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "note_images_owner_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'note-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Hesabı Sil özelliği: auth.users satırı admin.deleteUser() ile silinince
-- kullanıcının tüm verisi otomatik temizlensin diye eksik ON DELETE CASCADE'ler
-- eklendi. Bunlar olmadan silme, ilgili tablolarda satırı olan her kullanıcı
-- için FK ihlaliyle başarısız olurdu.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_user_id_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE highlights DROP CONSTRAINT IF EXISTS highlights_user_id_fkey;
ALTER TABLE highlights ADD CONSTRAINT highlights_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE favorites ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE plan_progress DROP CONSTRAINT IF EXISTS plan_progress_user_id_fkey;
ALTER TABLE plan_progress ADD CONSTRAINT plan_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ai_usage DROP CONSTRAINT IF EXISTS ai_usage_user_id_fkey;
ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE church_groups DROP CONSTRAINT IF EXISTS church_groups_created_by_fkey;
ALTER TABLE church_groups ADD CONSTRAINT church_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE church_group_members DROP CONSTRAINT IF EXISTS church_group_members_user_id_fkey;
ALTER TABLE church_group_members ADD CONSTRAINT church_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE church_prayers DROP CONSTRAINT IF EXISTS church_prayers_user_id_fkey;
ALTER TABLE church_prayers ADD CONSTRAINT church_prayers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE church_plan_completions DROP CONSTRAINT IF EXISTS church_plan_completions_user_id_fkey;
ALTER TABLE church_plan_completions ADD CONSTRAINT church_plan_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Keşfet oyunları liderlik tablosu. Kullanıcı başına oyun başına tek satır
-- (en yüksek skor tutulur) — church_group_members ile aynı desen: display_name
-- satıra denormalize edilir, profiles tablosuna herkese açık okuma izni
-- vermeye gerek kalmaz. Yazma sadece submit_game_score() RPC'si üzerinden
-- yapılır ki skor artışı (GREATEST) atomik ve sahtecilik client'tan rastgele
-- bir sayı yollayarak değil sadece gerçek oyun akışından mümkün olsun.
CREATE TABLE IF NOT EXISTS game_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  game_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_score_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_game_scores_leaderboard
  ON game_scores(game_id, best_score DESC);

ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_scores_select" ON game_scores;
CREATE POLICY "game_scores_select" ON game_scores FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Doğrudan INSERT/UPDATE politikası yok — tüm yazmalar submit_game_score()
-- SECURITY DEFINER fonksiyonu üzerinden, RLS'i bilinçli olarak atlayarak yapılır.

CREATE OR REPLACE FUNCTION public.submit_game_score(p_game_id TEXT, p_score INTEGER, p_display_name TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO game_scores (user_id, game_id, display_name, best_score, best_score_at, updated_at)
  VALUES (auth.uid(), p_game_id, p_display_name, GREATEST(p_score, 0), NOW(), NOW())
  ON CONFLICT (user_id, game_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    best_score = GREATEST(game_scores.best_score, EXCLUDED.best_score),
    best_score_at = CASE WHEN EXCLUDED.best_score > game_scores.best_score
      THEN EXCLUDED.best_score_at ELSE game_scores.best_score_at END,
    updated_at = NOW();
$$;

ALTER TABLE game_scores DROP CONSTRAINT IF EXISTS game_scores_user_id_fkey;
ALTER TABLE game_scores ADD CONSTRAINT game_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Kilise Modu düzeltmesi: church_group_members'ta sadece UNIQUE(group_id, user_id)
-- vardı — bu bir kullanıcının AYNI gruba iki kez katılmasını engelliyordu ama
-- FARKLI iki gruba (mesela grup oluşturma denemesi testte tekrarlanınca) üye
-- olmasını engellemiyordu. useChurch.ts'in refresh() sorgusu .maybeSingle()
-- kullandığı için kullanıcı 2+ satıra düşünce Postgrest "multiple rows"
-- hatası veriyor, bu da sessizce "gruba üye değilsin" gibi yorumlanıp Kilise
-- Modu'nu kalıcı olarak bozuyordu. Önce var olan kopya satırları temizle
-- (kullanıcı başına en eski üyeliği tut), sonra tekrar oluşmasın diye
-- kullanıcı başına tek grup kısıtı ekle.
DELETE FROM church_group_members a
USING church_group_members b
WHERE a.user_id = b.user_id
  AND (a.joined_at > b.joined_at OR (a.joined_at = b.joined_at AND a.id > b.id));

ALTER TABLE church_group_members DROP CONSTRAINT IF EXISTS church_group_members_user_id_unique;
ALTER TABLE church_group_members ADD CONSTRAINT church_group_members_user_id_unique UNIQUE (user_id);

-- Kullanıcı engelleme. Sadece engelleyen kendi satırlarını görür / yazar / siler.
-- Engellenen çiftler arasında mesaj INSERT'i messages_insert ile reddedilir.
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_users_select" ON blocked_users;
DROP POLICY IF EXISTS "blocked_users_insert" ON blocked_users;
DROP POLICY IF EXISTS "blocked_users_delete" ON blocked_users;

CREATE POLICY "blocked_users_select" ON blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "blocked_users_insert" ON blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id AND blocker_id <> blocked_id);

CREATE POLICY "blocked_users_delete" ON blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

-- Arkadaşlar arası anlık mesajlaşma. friendships tablosundaki gibi tek yönlü
-- satır (sender/recipient), okundu bilgisi read_at ile tutuluyor. Yazma sadece
-- kabul edilmiş (accepted) bir arkadaşlık varsa mümkün — davet göndermeden
-- birine mesaj atılamaz. Engellenmiş çiftlerde INSERT reddedilir.
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Client TextInput maxLength={2000} ile aynı sınır — API'yi doğrudan çağıran
-- istemciler de bu uzunluğu aşamasın. Mevcut kurulumlar için ALTER aşağıda.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_text_length_check;
ALTER TABLE messages ADD CONSTRAINT messages_text_length_check
  CHECK (char_length(text) <= 2000);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_rev
  ON messages(recipient_id, sender_id, created_at DESC);
-- Rate-limit trigger'ının son 10 sn sayımı için.
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON messages(sender_id, created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id = messages.recipient_id)
          OR (f.friend_id = auth.uid() AND f.user_id = messages.recipient_id)
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users b
      WHERE (
        (b.blocker_id = messages.recipient_id AND b.blocked_id = messages.sender_id)
        OR (b.blocker_id = messages.sender_id AND b.blocked_id = messages.recipient_id)
      )
    )
  );

-- Sadece alıcı, kendine gelen mesajı okundu işaretleyebilir.
CREATE POLICY "messages_update" ON messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Sadece gönderen kendi mesajını silebilir.
CREATE POLICY "messages_delete" ON messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Mesaj şikayeti: prayer_reports ile aynı desen — sadece log/moderasyon izi
-- amaçlı, ayrı bir admin paneli yok, Sentry'ye de düşer (bkz. reportMessage).
CREATE TABLE IF NOT EXISTS message_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, reporter_id)
);

ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_reports_insert" ON message_reports;
DROP POLICY IF EXISTS "message_reports_select" ON message_reports;
CREATE POLICY "message_reports_insert" ON message_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "message_reports_select" ON message_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- DB-seviye spam koruması: aynı kullanıcı 10 saniyede en fazla 20 mesaj
-- gönderebilir. Client cooldown (400ms) yumuşak UX korumasıdır; bu trigger
-- API'yi doğrudan çağıran kötüye kullanımı engeller.
CREATE OR REPLACE FUNCTION public.check_message_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM messages
  WHERE sender_id = NEW.sender_id
    AND created_at > NOW() - INTERVAL '10 seconds';

  IF recent_count >= 20 THEN
    RAISE EXCEPTION 'message_rate_limit: max 20 messages per 10 seconds'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_rate_limit ON messages;
CREATE TRIGGER messages_rate_limit
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_message_rate_limit();

-- Postgres Changes ile anlık teslimat için tabloyu realtime yayınına ekle.
-- ALTER PUBLICATION ... ADD TABLE'ın IF NOT EXISTS'i yok (PG sürümüne göre
-- değişken) — dosya tekrar çalıştırılabilsin diye DO bloğuyla kontrol ediyoruz.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- Expo push token — cihaz bildirim izni verdiyse profiles'a yazılır;
-- send-push edge function mesaj / arkadaşlık isteği için bu token'ı kullanır.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- İki arkadaşın aynı okuma planını birlikte takip etmesi (kilise grubu olmadan).
-- İlerleme sayıları her cihazın local getPlanProgress çıktısından senkronize edilir.
CREATE TABLE IF NOT EXISTS plan_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invitee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  inviter_completed INTEGER NOT NULL DEFAULT 0,
  invitee_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (inviter_id, invitee_id, plan_id),
  CHECK (inviter_id <> invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_invites_invitee_status
  ON plan_invites(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_plan_invites_inviter_status
  ON plan_invites(inviter_id, status);
CREATE INDEX IF NOT EXISTS idx_plan_invites_plan
  ON plan_invites(plan_id);

ALTER TABLE plan_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_invites_select" ON plan_invites;
DROP POLICY IF EXISTS "plan_invites_insert" ON plan_invites;
DROP POLICY IF EXISTS "plan_invites_update_invitee" ON plan_invites;
DROP POLICY IF EXISTS "plan_invites_update_inviter_progress" ON plan_invites;

CREATE POLICY "plan_invites_select" ON plan_invites FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "plan_invites_insert" ON plan_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id AND inviter_id <> invitee_id);

-- Davet edilen: status kabul/red + kendi ilerleme sütunu
CREATE POLICY "plan_invites_update_invitee" ON plan_invites FOR UPDATE
  USING (auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = invitee_id);

-- Davet eden: kabul sonrası yalnızca kendi ilerleme sütununu güncelleyebilir
CREATE POLICY "plan_invites_update_inviter_progress" ON plan_invites FOR UPDATE
  USING (auth.uid() = inviter_id AND status = 'accepted')
  WITH CHECK (auth.uid() = inviter_id AND status = 'accepted');

-- ── sozapp.com pazarlama sitesi: App Store/Google Play henüz yayında değilken
-- ziyaretçi e-postasını kaybetmemek için basit bir bekleme listesi. Site
-- statik HTML, doğrudan bu tabloya anon key ile insert-only yazıyor —
-- kimse kendi e-postası dışında satır göremesin diye SELECT politikası yok
-- (anon için select vermiyoruz, sadece service role/dashboard'dan okunur).
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android', 'both')) DEFAULT 'both',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at DESC);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist_insert" ON waitlist;
CREATE POLICY "waitlist_insert" ON waitlist FOR INSERT
  WITH CHECK (auth.uid() IS NULL);
-- Not: auth.uid() IS NULL → sadece anon (giriş yapmamış) istemciler yazabilir,
-- bu tablo web sitesinden geliyor, uygulama içinden kullanılmıyor.

-- Bekleme listesi sayacı — sadece toplam sayıyı döner, hiçbir e-posta/satır
-- açığa çıkarmaz. Site anon key ile bu RPC'yi çağırıp sosyal kanıt sayacı
-- gösteriyor (bkz. soz-website/index.html #waitlist-count).
CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM waitlist;
$$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon;
