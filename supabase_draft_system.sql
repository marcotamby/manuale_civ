-- Migration file for Draft System (Presets and Live Rooms)

-- 1. Create draft_presets table
CREATE TABLE IF NOT EXISTS public.draft_presets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  scope TEXT DEFAULT 'civs', -- 'civs', 'maps', 'both'
  is_active BOOLEAN DEFAULT true,
  turns JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for draft_presets
ALTER TABLE public.draft_presets ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active presets
CREATE POLICY "Allow public read active draft_presets"
  ON public.draft_presets
  FOR SELECT
  USING (true);

-- Allow admins to insert/update/delete draft_presets
CREATE POLICY "Allow admin full access to draft_presets"
  ON public.draft_presets
  FOR ALL
  USING (
    auth.role() = 'authenticated' 
    AND (
      (auth.jwt() ->> 'email' IN ('marco.tamborrino.94@gmail.com'))
      OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
      )
    )
  );


-- 2. Create draft_rooms table
CREATE TABLE IF NOT EXISTS public.draft_rooms (
  id TEXT PRIMARY KEY,
  preset_id TEXT REFERENCES public.draft_presets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  host_name TEXT DEFAULT 'Giocatore 1',
  guest_name TEXT DEFAULT 'Giocatore 2',
  current_step INT DEFAULT 0,
  timer_ends_at TIMESTAMPTZ,
  state JSONB DEFAULT '{"hostPicks":[], "guestPicks":[], "hostBans":[], "guestBans":[], "mapPicks":[], "mapBans":[]}'::jsonb,
  status TEXT DEFAULT 'waiting', -- 'waiting', 'in_progress', 'completed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for draft_rooms
ALTER TABLE public.draft_rooms ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access to draft_rooms (rooms are public by link)
CREATE POLICY "Allow public read draft_rooms"
  ON public.draft_rooms
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert draft_rooms"
  ON public.draft_rooms
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update draft_rooms"
  ON public.draft_rooms
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete draft_rooms"
  ON public.draft_rooms
  FOR DELETE
  USING (true);

-- Enable Realtime for draft_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE draft_rooms;
