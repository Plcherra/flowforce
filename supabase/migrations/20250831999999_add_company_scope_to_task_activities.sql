-- Add company context to task activities for safer realtime filters
ALTER TABLE public.task_activities
ADD COLUMN company_id UUID REFERENCES public.companies(id);

UPDATE public.task_activities ta
SET company_id = t.company_id
FROM public.tasks t
WHERE ta.task_id = t.id;

ALTER TABLE public.task_activities
ALTER COLUMN company_id SET NOT NULL;

DROP POLICY IF EXISTS "Users can view task activities for their company" ON public.task_activities;
DROP POLICY IF EXISTS "Users can create task activities" ON public.task_activities;

CREATE POLICY "Users can view task activities for their company"
ON public.task_activities
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create task activities"
ON public.task_activities
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_task_activities_company_id
ON public.task_activities(company_id);

-- Ensure activity inserts capture company scope
CREATE OR REPLACE FUNCTION public.create_task_activity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activities (
      task_id,
      company_id,
      user_id,
      action_type,
      description,
      metadata
    ) VALUES (
      NEW.id,
      NEW.company_id,
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
        task_id,
        company_id,
        user_id,
        action_type,
        description,
        metadata
      ) VALUES (
        NEW.id,
        NEW.company_id,
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
        task_id,
        company_id,
        user_id,
        action_type,
        description,
        metadata
      ) VALUES (
        NEW.id,
        NEW.company_id,
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
        task_id,
        company_id,
        user_id,
        action_type,
        description,
        metadata
      ) VALUES (
        NEW.id,
        NEW.company_id,
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
        task_id,
        company_id,
        user_id,
        action_type,
        description,
        metadata
      ) VALUES (
        NEW.id,
        NEW.company_id,
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
$$;
