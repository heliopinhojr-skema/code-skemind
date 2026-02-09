-- Allow players to delete their own race registrations (cancel inscription)
CREATE POLICY "Players can delete own registrations"
ON public.race_registrations
FOR DELETE
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles WHERE id = player_id
));