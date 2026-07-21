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
