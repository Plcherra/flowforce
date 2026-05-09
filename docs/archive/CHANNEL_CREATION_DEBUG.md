# Channel Creation Debug Guide

## Current Issue
Channel creation is failing with 4 console errors. The improved logger should now show the actual Supabase error details.

## Migration Status
**IMPORTANT**: The migration `20260125000000_fix_channel_members_insert_policy.sql` must be applied to your Supabase database.

### To Apply the Migration:

1. **Via Supabase Dashboard:**
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Copy the contents of `supabase/migrations/20260125000000_fix_channel_members_insert_policy.sql`
   - Paste and run it

2. **Via Supabase CLI:**
   ```bash
   supabase migration up
   ```

## What the Migration Does

The migration fixes the RLS policy on `channel_members` to allow:
1. ✅ Users to add themselves to accessible channels
2. ✅ **Channel creators to add ANY members to channels they created** (this is the fix!)
3. ✅ Admins/managers to add members

## Code Changes Made

1. **Improved Error Logging**: Now shows actual Supabase error codes, messages, details, and hints
2. **Sequential Member Insertion**: Changed from batch insert to sequential insert to identify which member fails
3. **Better Error Context**: Logs include all member details for debugging

## Debugging Steps

1. **Check Console Errors**: With the improved logger, you should now see:
   - Error code (e.g., "42501" for permission denied)
   - Error message
   - Error details
   - Error hint (often suggests the fix)

2. **Verify Migration Applied**: 
   ```sql
   SELECT policyname, cmd, qual, with_check 
   FROM pg_policies 
   WHERE tablename = 'channel_members' 
   AND cmd = 'INSERT';
   ```
   
   Should show `channel_members_insert_policy` with the new WITH CHECK clause.

3. **Test Channel Creation**: After applying migration, try creating a channel again.

## Common Error Codes

- **42501**: Permission denied - RLS policy blocked the operation
- **23505**: Unique violation - Member already exists
- **23503**: Foreign key violation - Invalid channel_id or user_id

## Next Steps

1. Apply the migration
2. Check console for actual error details (should no longer show "[object Object]")
3. Share the actual error message if it still fails
