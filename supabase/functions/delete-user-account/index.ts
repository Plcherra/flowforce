
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DeletionStats {
  initialCounts: Record<string, number>;
  finalCounts: Record<string, number>;
  totalRecordsDeleted: number;
  executionTimeMs: number;
  deletedTables: string[];
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const startTime = Date.now()
  let supabaseAdmin: any = null
  let userSession: any = null
  const deletionStats: DeletionStats = {
    initialCounts: {},
    finalCounts: {},
    totalRecordsDeleted: 0,
    executionTimeMs: 0,
    deletedTables: [],
    errors: []
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header')
    }

    const token = authHeader.substring(7)
    
    // Initialize Supabase admin client
    supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the user's session using the provided token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error(`Invalid session: ${userError?.message || 'User not found'}`)
    }

    userSession = user
    console.log(`🚨 CRITICAL: Starting enhanced account deletion for user: ${user.id}`)

    // Phase 1: Count initial records for comprehensive tracking
    console.log('📊 Phase 1: Counting initial records across all tables...')
    
    const tablesToCheck = [
      { table: 'profiles', userColumn: 'id' },
      { table: 'user_roles', userColumn: 'user_id' },
      { table: 'schedules', userColumn: 'user_id' },
      { table: 'time_entries', userColumn: 'user_id' },
      { table: 'time_off_requests', userColumn: 'user_id' },
      { table: 'tasks', userColumn: 'created_by', altColumn: 'assigned_to' },
      { table: 'task_comments', userColumn: 'user_id' },
      { table: 'messages', userColumn: 'sender_id' },
      { table: 'message_reactions', userColumn: 'user_id' },
      { table: 'channel_members', userColumn: 'user_id' },
      { table: 'expenses', userColumn: 'created_by', altColumn: 'employee_id', thirdColumn: 'approved_by' },
      { table: 'forms', userColumn: 'created_by' },
      { table: 'form_submissions', userColumn: 'submitted_by' },
      { table: 'inventory_items', userColumn: 'created_by' },
      { table: 'inventory_transactions', userColumn: 'performed_by' },
      { table: 'payments', userColumn: 'created_by', altColumn: 'approved_by', thirdColumn: 'recipient_id' },
      { table: 'payment_approvals', userColumn: 'approver_id' },
      { table: 'purchase_orders', userColumn: 'created_by', altColumn: 'approved_by' },
      { table: 'workflows', userColumn: 'created_by' },
      { table: 'workflow_steps', userColumn: 'assigned_user_id' },
      { table: 'workflow_step_instances', userColumn: 'assigned_to' },
      { table: 'user_unavailability', userColumn: 'user_id' },
      { table: 'shift_assignments', userColumn: 'user_id' },
      { table: 'week_templates', userColumn: 'created_by' },
      { table: 'shift_templates', userColumn: 'created_by' },
      { table: 'companies', userColumn: 'created_by' }
    ]

    for (const { table, userColumn, altColumn, thirdColumn } of tablesToCheck) {
      try {
        let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
        
        if (altColumn && thirdColumn) {
          query = query.or(`${userColumn}.eq.${user.id},${altColumn}.eq.${user.id},${thirdColumn}.eq.${user.id}`)
        } else if (altColumn) {
          query = query.or(`${userColumn}.eq.${user.id},${altColumn}.eq.${user.id}`)
        } else {
          query = query.eq(userColumn, user.id)
        }

        const { count } = await query
        deletionStats.initialCounts[table] = count || 0
        
        if (count && count > 0) {
          console.log(`  📋 ${table}: ${count} records`)
        }
      } catch (error) {
        console.log(`  ⚠️ Could not count ${table}: ${error.message}`)
        deletionStats.errors.push(`Count error in ${table}: ${error.message}`)
      }
    }

    const totalInitialRecords = Object.values(deletionStats.initialCounts).reduce((sum, count) => sum + count, 0)
    console.log(`📊 Total initial records to delete: ${totalInitialRecords}`)

    // Phase 2: Strategic deletion process with proper dependency handling
    console.log('🗑️ Phase 2: Starting strategic deletion process...')

    // Step 1: Handle company ownership transfer/deletion FIRST
    console.log('🏢 Step 1: Handling company ownership...')
    
    const { data: ownedCompanies } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .eq('created_by', user.id)

    if (ownedCompanies && ownedCompanies.length > 0) {
      console.log(`  🏢 Found ${ownedCompanies.length} companies owned by user`)
      
      for (const company of ownedCompanies) {
        // Check if there are other admins who can take over
        const { data: otherAdmins } = await supabaseAdmin
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('company_id', company.id)
          .eq('role', 'admin')
          .neq('id', user.id)
          .limit(1)

        if (otherAdmins && otherAdmins.length > 0) {
          // Transfer ownership to another admin
          const newOwner = otherAdmins[0]
          const { error: transferError } = await supabaseAdmin
            .from('companies')
            .update({ created_by: newOwner.id })
            .eq('id', company.id)
          
          if (transferError) {
            console.error(`  ❌ Failed to transfer company "${company.name}": ${transferError.message}`)
            deletionStats.errors.push(`Failed to transfer company: ${transferError.message}`)
          } else {
            console.log(`  ↗️ Transferred company "${company.name}" to ${newOwner.first_name} ${newOwner.last_name}`)
          }
        } else {
          // Delete the company since no other admins exist
          const { error: deleteError } = await supabaseAdmin
            .from('companies')
            .delete()
            .eq('id', company.id)
          
          if (deleteError) {
            console.error(`  ❌ Failed to delete company "${company.name}": ${deleteError.message}`)
            deletionStats.errors.push(`Failed to delete company: ${deleteError.message}`)
          } else {
            console.log(`  🗑️ Deleted company "${company.name}" (no other admins)`)
            deletionStats.deletedTables.push('companies')
          }
        }
      }
    }

    // Step 2: Delete child records first (in dependency order)
    console.log('🔗 Step 2: Deleting child records...')
    
    const childTables = [
      { table: 'workflow_step_instances', column: 'assigned_to' },
      { table: 'task_comments', column: 'user_id' },
      { table: 'message_reactions', column: 'user_id' },
      { table: 'channel_members', column: 'user_id' },
      { table: 'payment_approvals', column: 'approver_id' },
      { table: 'form_submissions', column: 'submitted_by' },
      { table: 'inventory_transactions', column: 'performed_by' },
      { table: 'time_entries', column: 'user_id' },
      { table: 'shift_assignments', column: 'user_id' },
      { table: 'user_unavailability', column: 'user_id' },
      { table: 'user_roles', column: 'user_id' },
      { table: 'time_off_requests', column: 'user_id' }
    ]

    for (const { table, column } of childTables) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq(column, user.id)

        if (error) {
          console.error(`  ❌ Failed to delete from ${table}: ${error.message}`)
          deletionStats.errors.push(`Failed to delete from ${table}: ${error.message}`)
        } else {
          console.log(`  ✅ Deleted records from ${table}`)
          deletionStats.deletedTables.push(table)
        }
      } catch (error) {
        console.error(`  ❌ Error deleting from ${table}: ${error.message}`)
        deletionStats.errors.push(`Error deleting from ${table}: ${error.message}`)
      }
    }

    // Step 3: Handle complex tables with multiple user references
    console.log('🔄 Step 3: Handling complex tables...')
    
    // Update tasks to remove user references instead of deleting
    const { error: tasksError } = await supabaseAdmin
      .from('tasks')
      .update({ assigned_to: null })
      .eq('assigned_to', user.id)

    if (tasksError) {
      console.error(`  ❌ Failed to update tasks: ${tasksError.message}`)
      deletionStats.errors.push(`Failed to update tasks: ${tasksError.message}`)
    } else {
      console.log(`  ✅ Updated task assignments`)
    }

    // Delete tasks created by user
    const { error: tasksDeleteError } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('created_by', user.id)

    if (tasksDeleteError) {
      console.error(`  ❌ Failed to delete created tasks: ${tasksDeleteError.message}`)
      deletionStats.errors.push(`Failed to delete created tasks: ${tasksDeleteError.message}`)
    } else {
      console.log(`  ✅ Deleted tasks created by user`)
      deletionStats.deletedTables.push('tasks')
    }

    // Step 4: Delete user profile (this will CASCADE to remaining related records)
    console.log('👤 Step 4: Deleting user profile...')
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (profileError) {
      console.error(`  ❌ Failed to delete profile: ${profileError.message}`)
      deletionStats.errors.push(`Failed to delete profile: ${profileError.message}`)
      throw new Error(`Failed to delete profile: ${profileError.message}`)
    } else {
      console.log('  ✅ Deleted user profile (CASCADE will handle related records)')
      deletionStats.deletedTables.push('profiles')
    }

    // Step 5: Delete from auth.users (final step)
    console.log('🔐 Step 5: Deleting authentication record...')
    
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    
    if (authError) {
      console.error(`  ❌ Failed to delete auth user: ${authError.message}`)
      deletionStats.errors.push(`Failed to delete auth user: ${authError.message}`)
      throw new Error(`Failed to delete auth user: ${authError.message}`)
    } else {
      console.log('  ✅ Deleted authentication record')
      deletionStats.deletedTables.push('auth.users')
    }

    // Phase 3: Verification
    console.log('🔍 Phase 3: Verifying deletion completeness...')
    
    let remainingRecords = 0
    for (const { table, userColumn, altColumn, thirdColumn } of tablesToCheck) {
      try {
        let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
        
        if (altColumn && thirdColumn) {
          query = query.or(`${userColumn}.eq.${user.id},${altColumn}.eq.${user.id},${thirdColumn}.eq.${user.id}`)
        } else if (altColumn) {
          query = query.or(`${userColumn}.eq.${user.id},${altColumn}.eq.${user.id}`)
        } else {
          query = query.eq(userColumn, user.id)
        }

        const { count } = await query
        deletionStats.finalCounts[table] = count || 0
        remainingRecords += count || 0
        
        if (count && count > 0) {
          console.log(`  ⚠️ ${table}: ${count} records remain`)
        }
      } catch (error) {
        console.log(`  ⚠️ Could not verify ${table}: ${error.message}`)
      }
    }

    // Calculate final statistics
    deletionStats.executionTimeMs = Date.now() - startTime
    deletionStats.totalRecordsDeleted = Object.values(deletionStats.initialCounts).reduce((sum, count) => sum + count, 0) - remainingRecords

    console.log(`✅ Deletion completed in ${Math.round(deletionStats.executionTimeMs / 1000)}s`)
    console.log(`📊 Records deleted: ${deletionStats.totalRecordsDeleted}`)
    console.log(`📊 Records remaining: ${remainingRecords}`)
    console.log(`📋 Tables processed: ${deletionStats.deletedTables.join(', ')}`)

    if (remainingRecords > 0) {
      console.log(`⚠️ Warning: ${remainingRecords} records still reference the deleted user`)
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account and all associated data have been permanently deleted',
        deletionStats: deletionStats,
        details: `Deleted ${deletionStats.totalRecordsDeleted} records across ${deletionStats.deletedTables.length} tables in ${Math.round(deletionStats.executionTimeMs / 1000)} seconds`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error: any) {
    const executionTime = Date.now() - startTime
    
    console.error('❌ CRITICAL: Account deletion failed:', error.message)
    console.error('🔍 Error details:', error)
    
    deletionStats.executionTimeMs = executionTime
    deletionStats.errors.push(error.message)

    // Log partial deletion stats
    if (userSession) {
      console.log(`💾 Partial deletion stats for user ${userSession.id}:`, deletionStats)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Account deletion failed',
        message: error.message,
        details: `Deletion attempt failed after ${Math.round(executionTime / 1000)} seconds. Some data may have been partially deleted.`,
        deletionStats: deletionStats,
        errorType: error.name || 'UnknownError'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
