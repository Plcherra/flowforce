-- Final comprehensive cleanup to ensure no traces remain
-- This will clean up any remaining references across all tables

DO $$
DECLARE
    target_user_id UUID := 'b6da4131-e833-40f2-844e-a1b152d09546';
    target_email TEXT := 'plcherra@gmail.com';
BEGIN
    -- Clean up any remaining references in all relevant tables
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    DELETE FROM public.channel_members WHERE user_id = target_user_id;
    DELETE FROM public.message_reactions WHERE user_id = target_user_id;
    DELETE FROM public.messages WHERE sender_id = target_user_id;
    DELETE FROM public.schedules WHERE user_id = target_user_id OR created_by = target_user_id;
    DELETE FROM public.shift_assignments WHERE user_id = target_user_id;
    DELETE FROM public.time_entries WHERE user_id = target_user_id;
    DELETE FROM public.time_off_requests WHERE user_id = target_user_id;
    DELETE FROM public.task_comments WHERE user_id = target_user_id;
    DELETE FROM public.tasks WHERE created_by = target_user_id OR assigned_to = target_user_id;
    DELETE FROM public.expenses WHERE created_by = target_user_id OR approved_by = target_user_id;
    DELETE FROM public.forms WHERE created_by = target_user_id;
    DELETE FROM public.form_submissions WHERE submitted_by = target_user_id;
    DELETE FROM public.inventory_items WHERE created_by = target_user_id;
    DELETE FROM public.inventory_transactions WHERE performed_by = target_user_id;
    DELETE FROM public.payments WHERE created_by = target_user_id OR recipient_id = target_user_id OR approved_by = target_user_id;
    DELETE FROM public.payment_approvals WHERE approver_id = target_user_id;
    DELETE FROM public.purchase_orders WHERE created_by = target_user_id OR approved_by = target_user_id;
    DELETE FROM public.custom_reports WHERE created_by = target_user_id;
    DELETE FROM public.message_channels WHERE created_by = target_user_id;
    DELETE FROM public.shift_templates WHERE created_by = target_user_id;
    DELETE FROM public.week_templates WHERE created_by = target_user_id;
    DELETE FROM public.workflows WHERE created_by = target_user_id;
    DELETE FROM public.workflow_step_instances WHERE assigned_to = target_user_id;
    DELETE FROM public.user_unavailability WHERE user_id = target_user_id OR created_by = target_user_id;
    
    -- Clean up any remaining company invites with the email
    DELETE FROM public.company_invites WHERE email = target_email;
    
    -- Clean up any remaining profiles
    DELETE FROM public.profiles WHERE id = target_user_id OR email = target_email;
    
    -- Final cleanup of auth users
    DELETE FROM auth.users WHERE id = target_user_id OR email = target_email;
    
    RAISE NOTICE 'Comprehensive cleanup completed for user: % (email: %)', target_user_id, target_email;
END
$$;