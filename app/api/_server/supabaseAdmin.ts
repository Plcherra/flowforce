import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Lazy initialization - only create client when first accessed
// This prevents errors during Next.js startup when scanning API routes
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const error = new Error(
      "Missing Supabase service role configuration. " +
      "Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
    console.error('[supabaseAdmin]', error.message);
    throw error;
  }
  
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey);
  }
  
  return supabaseAdminInstance;
}

// Export a getter function that lazily initializes the client
// This way Next.js doesn't try to evaluate the client during static analysis
export const supabaseAdmin = new Proxy({} as any, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];
    // Bind functions to maintain 'this' context
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
  has(_target, prop) {
    try {
      const client = getSupabaseAdmin();
      return prop in client;
    } catch {
      return false;
    }
  },
  ownKeys(_target) {
    try {
      const client = getSupabaseAdmin();
      return Reflect.ownKeys(client);
    } catch {
      return [];
    }
  },
  getOwnPropertyDescriptor(_target, prop) {
    try {
      const client = getSupabaseAdmin();
      return Reflect.getOwnPropertyDescriptor(client, prop);
    } catch {
      return undefined;
    }
  },
});

export default supabaseAdmin;
