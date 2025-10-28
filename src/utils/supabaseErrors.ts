import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Detect missing relation/table errors coming back from PostgREST.
 * Handles common error codes (42P01, PGRST116) as well as string matches.
 */
export function isMissingRelationError(error: PostgrestError | undefined, relation: string) {
  if (!error) return false;

  const code = (error.code ?? '').toUpperCase();
  const status = (error as { status?: number }).status;
  const message = (error.message ?? '').toLowerCase();
  const relationName = relation.toLowerCase();
  const mentionsRelation =
    message.includes(relationName) ||
    message.includes(`"${relationName}"`) ||
    message.includes(` ${relationName} `);

  if (code === '42P01' || code === 'PGRST116') {
    return true;
  }

  if (status === 404 && (mentionsRelation || message.includes('table or view not found'))) {
    return true;
  }

  return mentionsRelation && (message.includes('does not exist') || message.includes('not found'));
}
