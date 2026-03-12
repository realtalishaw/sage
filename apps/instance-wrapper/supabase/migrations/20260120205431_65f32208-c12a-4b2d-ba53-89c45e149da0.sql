-- Create todo_list table for persisting user todos
CREATE TABLE public.todo_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task TEXT NOT NULL,
  task_id UUID NULL, -- References tasks table when submitted to /tasks API
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries by user and date
CREATE INDEX idx_todo_list_user_date ON public.todo_list(user_id, date DESC);
CREATE INDEX idx_todo_list_task_id ON public.todo_list(task_id) WHERE task_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.todo_list ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own todos" 
ON public.todo_list 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own todos" 
ON public.todo_list 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todos" 
ON public.todo_list 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own todos" 
ON public.todo_list 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_todo_list_updated_at
BEFORE UPDATE ON public.todo_list
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();