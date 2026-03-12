-- Create assistant_identity table
CREATE TABLE public.assistant_identity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.assistant_identity ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own assistant identity"
ON public.assistant_identity
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assistant identity"
ON public.assistant_identity
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistant identity"
ON public.assistant_identity
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistant identity"
ON public.assistant_identity
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to assistant_identity"
ON public.assistant_identity
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_assistant_identity_updated_at
BEFORE UPDATE ON public.assistant_identity
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();