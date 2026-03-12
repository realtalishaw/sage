-- Create files table for user file metadata
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('file', 'folder', 'doc', 'sheet', 'image', 'pdf')),
  mime_type TEXT,
  size BIGINT,
  parent_folder_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  storage_path TEXT, -- Path in storage bucket (null for folders)
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_files_user_id ON public.files(user_id);
CREATE INDEX idx_files_parent_folder_id ON public.files(parent_folder_id);
CREATE INDEX idx_files_type ON public.files(type);
CREATE INDEX idx_files_is_favorite ON public.files(is_favorite) WHERE is_favorite = true;

-- Enable RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own files"
ON public.files FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own files"
ON public.files FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
ON public.files FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
ON public.files FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_files_updated_at
BEFORE UPDATE ON public.files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_uploads storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_uploads', 'user_uploads', false);

-- Storage RLS policies for user_uploads bucket
CREATE POLICY "Users can view their own uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'user_uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user_uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user_uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'user_uploads' AND auth.uid()::text = (storage.foldername(name))[1]);