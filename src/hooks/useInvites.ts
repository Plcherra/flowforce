import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

type InvitePayload = {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  phone?: string;
  birthDate?: string;
};

type InviteResult = { success: true } | { success: false; message: string };

const INVITE_EXPIRATION_DAYS = 14;

export function useInvites() {
  const { profile } = useProfile();
  const [isSending, setIsSending] = useState(false);

  const sendInvite = async ({
    email,
    firstName,
    lastName,
    role,
    phone,
    birthDate,
  }: InvitePayload): Promise<InviteResult> => {
    if (isSending) return { success: false, message: 'An invite is already in progress.' };
    if (!profile?.company_id && !profile?.companyId) {
      return { success: false, message: 'Missing company context for invite.' };
    }

    const companyId = profile.company_id ?? profile.companyId ?? '';
    const invitedBy = profile.userId ?? profile.id ?? '';

    if (!companyId || !invitedBy) {
      return { success: false, message: 'Unable to resolve company or user identifiers.' };
    }

    setIsSending(true);
    try {
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRATION_DAYS);

      const { error } = await supabase.from('company_invites').insert({
        email,
        first_name: firstName ?? null,
        last_name: lastName ?? null,
        phone: phone ?? null,
        birth_date: birthDate ?? null,
        role: role ?? 'staff',
        invite_token: inviteToken,
        expires_at: expiresAt.toISOString(),
        company_id: companyId,
        invited_by: invitedBy,
        status: 'pending',
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send invite';
      return { success: false, message };
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendInvite,
    isSending,
  };
}
