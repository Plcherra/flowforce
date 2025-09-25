-- Fix the search path for the function to address security warning
CREATE OR REPLACE FUNCTION public.create_task_activity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;