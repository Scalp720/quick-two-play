
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game rooms"
ON public.game_rooms FOR SELECT USING (true);

CREATE POLICY "Anyone can create game rooms"
ON public.game_rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update game rooms"
ON public.game_rooms FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete old game rooms"
ON public.game_rooms FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;

CREATE OR REPLACE FUNCTION public.update_game_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_game_rooms_updated_at
BEFORE UPDATE ON public.game_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_game_rooms_updated_at();
