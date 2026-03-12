-- Add RLS policy for users to delete their own artifacts
CREATE POLICY "Users can delete their own artifacts"
ON public.artifacts
FOR DELETE
USING (
  (user_id = (auth.uid())::text) OR 
  (user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))
);

-- Add RLS policy for users to update their own artifacts (for renaming)
CREATE POLICY "Users can update their own artifacts"
ON public.artifacts
FOR UPDATE
USING (
  (user_id = (auth.uid())::text) OR 
  (user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))
)
WITH CHECK (
  (user_id = (auth.uid())::text) OR 
  (user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))
);