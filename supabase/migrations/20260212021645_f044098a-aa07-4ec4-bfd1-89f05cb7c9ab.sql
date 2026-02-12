-- Allow admins to delete arena listings
CREATE POLICY "Admins can delete arenas"
ON public.arena_listings
FOR DELETE
USING (
  has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'guardiao'::app_role)
  OR has_role(auth.uid(), 'grao_mestre'::app_role)
);

-- Also allow deleting associated arena_entries when arena is deleted
CREATE POLICY "Admins can delete arena entries"
ON public.arena_entries
FOR DELETE
USING (
  has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'guardiao'::app_role)
  OR has_role(auth.uid(), 'grao_mestre'::app_role)
);