-- Ensure company_updates author relationship exists (Supabase join requirement)
DO $$
BEGIN
  IF to_regclass('public.company_updates') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.company_updates
        ADD CONSTRAINT company_updates_author_id_fkey
        FOREIGN KEY (author_id)
        REFERENCES public.profiles (id)
        ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL; -- constraint already exists
    END;

    -- created_by is also referenced by UI filters, so ensure FK exists
    BEGIN
      ALTER TABLE public.company_updates
        ADD CONSTRAINT company_updates_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES public.profiles (id)
        ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END IF;
END;
$$;

-- Recreate recognitions view used by Performance + Company Updates surfaces
CREATE OR REPLACE VIEW public.recognitions AS
SELECT
  gr.id,
  gr.company_id,
  gr.goal_id,
  gr.user_id,
  gr.reward_type,
  gr.reward_details,
  gr.awarded_at,
  gr.created_by,
  gr.award_rule,
  recipient.first_name AS recipient_first_name,
  recipient.last_name AS recipient_last_name,
  recipient.avatar_url AS recipient_avatar_url,
  recipient.department_id AS recipient_department_id,
  creator.first_name AS creator_first_name,
  creator.last_name AS creator_last_name,
  g.title AS goal_title,
  g.status AS goal_status,
  g.progress AS goal_progress,
  g.target_completion_date,
  (gr.reward_details ->> 'message') AS message
FROM public.goal_rewards gr
LEFT JOIN public.profiles recipient ON recipient.id = gr.user_id
LEFT JOIN public.profiles creator ON creator.id = gr.created_by
LEFT JOIN public.goals g ON g.id = gr.goal_id
WHERE gr.reward_type = 'recognition';

ALTER VIEW public.recognitions SET (security_invoker = true);
GRANT SELECT ON public.recognitions TO anon, authenticated;
