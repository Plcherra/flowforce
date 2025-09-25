-- Create task_notifications table
CREATE TABLE public.task_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_due_soon', 'task_overdue', 'task_completed', 'task_status_changed', 'task_comment')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_activities table
CREATE TABLE public.task_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('task_created', 'task_assigned', 'task_status_changed', 'task_completed', 'task_commented', 'task_updated', 'task_due_changed')),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task_notifications
CREATE POLICY "Users can view their own notifications" 
ON public.task_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.task_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.task_notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications" 
ON public.task_notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for task_activities
CREATE POLICY "Users can view task activities for their company" 
ON public.task_activities 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p1, public.profiles p2 
    WHERE p1.id = auth.uid() 
    AND p2.id = task_activities.user_id 
    AND p1.company_id = p2.company_id
  )
);

CREATE POLICY "Users can create task activities" 
ON public.task_activities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_task_notifications_user_id ON public.task_notifications(user_id);
CREATE INDEX idx_task_notifications_task_id ON public.task_notifications(task_id);
CREATE INDEX idx_task_notifications_created_at ON public.task_notifications(created_at DESC);
CREATE INDEX idx_task_notifications_read_at ON public.task_notifications(read_at);

CREATE INDEX idx_task_activities_task_id ON public.task_activities(task_id);
CREATE INDEX idx_task_activities_user_id ON public.task_activities(user_id);
CREATE INDEX idx_task_activities_created_at ON public.task_activities(created_at DESC);

-- Create function to automatically create activity when tasks change
CREATE OR REPLACE FUNCTION public.create_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activities (
      task_id, user_id, action_type, description, metadata
    ) VALUES (
      NEW.id, 
      NEW.created_by, 
      'task_created', 
      'Task "' || NEW.title || '" was created',
      jsonb_build_object('priority', NEW.priority, 'due_date', NEW.due_date)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check for status changes
    IF OLD.status != NEW.status THEN
      INSERT INTO public.task_activities (
        task_id, user_id, action_type, description, metadata
      ) VALUES (
        NEW.id,
        auth.uid(),
        'task_status_changed',
        'Task status changed from "' || OLD.status || '" to "' || NEW.status || '"',
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'task_title', NEW.title
        )
      );
    END IF;
    
    -- Check for assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.task_activities (
        task_id, user_id, action_type, description, metadata
      ) VALUES (
        NEW.id,
        auth.uid(),
        'task_assigned',
        CASE 
          WHEN NEW.assigned_to IS NULL THEN 'Task was unassigned'
          ELSE 'Task was assigned'
        END,
        jsonb_build_object(
          'old_assignee', OLD.assigned_to,
          'new_assignee', NEW.assigned_to,
          'task_title', NEW.title
        )
      );
    END IF;
    
    -- Check for due date changes
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      INSERT INTO public.task_activities (
        task_id, user_id, action_type, description, metadata
      ) VALUES (
        NEW.id,
        auth.uid(),
        'task_due_changed',
        'Task due date was updated',
        jsonb_build_object(
          'old_due_date', OLD.due_date,
          'new_due_date', NEW.due_date,
          'task_title', NEW.title
        )
      );
    END IF;
    
    -- Check for completion
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
      INSERT INTO public.task_activities (
        task_id, user_id, action_type, description, metadata
      ) VALUES (
        NEW.id,
        auth.uid(),
        'task_completed',
        'Task "' || NEW.title || '" was completed',
        jsonb_build_object('task_title', NEW.title, 'completed_at', now())
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for task activities
CREATE TRIGGER trigger_task_activity
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.create_task_activity();