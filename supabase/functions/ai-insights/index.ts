
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  type: z.enum(['dashboard', 'scheduler', 'expenses', 'reports', 'chat']),
  context: z.string().optional(),
  query: z.string().optional(),
});

const profileSchema = z.object({
  company_id: z.string(),
});

const coerceId = z.union([z.string(), z.number()]).transform((value) => String(value));

const scheduleRowSchema = z.object({
  id: coerceId,
  company_id: z.string(),
  start_time: z.string(),
  end_time: z.string().nullable(),
  required_headcount: z.number().nullable(),
  is_published: z.boolean().nullable().optional(),
});

const taskRowSchema = z.object({
  id: coerceId,
  company_id: z.string(),
  title: z.string().nullable(),
  status: z.string().nullable(),
  created_at: z.string(),
  due_date: z.string().nullable(),
  completed_at: z.string().nullable(),
  priority: z.string().nullable(),
  assigned_to: z.string().nullable(),
});

const expenseRowSchema = z.object({
  id: coerceId,
  company_id: z.string(),
  amount: z.number().nullable(),
  status: z.string().nullable(),
  expense_date: z.string().nullable(),
  created_at: z.string().nullable(),
  created_by: z.string().nullable(),
});

const formSubmissionSchema = z.object({
  id: coerceId,
  form_id: z.string().nullable(),
  submitted_at: z.string().nullable(),
  status: z.string().nullable(),
});

const formRowSchema = z.object({
  id: coerceId,
  company_id: z.string(),
  title: z.string().nullable(),
  created_at: z.string().nullable(),
  form_submissions: z.array(formSubmissionSchema).default([]),
});

type AnySupabaseClient = SupabaseClient<any>;

async function resolveCompanyId(client: AnySupabaseClient, userId: string) {
  const { data, error } = await client
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve company: ${error.message}`);
  }

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    return null;
  }
  return parsed.data.company_id;
}

function assertAuthHeader(req: Request) {
  const header = req.headers.get('Authorization');
  if (!header) {
    throw Object.assign(new Error('Missing Authorization header'), { status: 401 });
  }
  return header;
}

async function listSchedules(
  client: AnySupabaseClient,
  companyId: string,
  params: { start: string; end?: string; limit?: number },
) {
  let query = client
    .from('schedules')
    .select('id, company_id, start_time, end_time, required_headcount, is_published')
    .eq('company_id', companyId)
    .gte('start_time', params.start)
    .order('start_time', { ascending: true });

  if (params.end) {
    query = query.lte('start_time', params.end);
  }
  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load schedules: ${error.message}`);
  }
  return z.array(scheduleRowSchema).parse(data ?? []);
}

async function listTasks(
  client: AnySupabaseClient,
  companyId: string,
  params: { since: string; limit?: number },
) {
  const { data, error } = await client
    .from('tasks')
    .select('id, company_id, title, status, created_at, due_date, completed_at, priority, assigned_to')
    .eq('company_id', companyId)
    .gte('created_at', params.since)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 200);

  if (error) {
    throw new Error(`Failed to load tasks: ${error.message}`);
  }

  return z.array(taskRowSchema).parse(data ?? []);
}

async function listExpenses(
  client: AnySupabaseClient,
  companyId: string,
  params: { since: string; limit?: number },
) {
  const { data, error } = await client
    .from('expenses')
    .select('id, company_id, amount, status, expense_date, created_at, created_by')
    .eq('company_id', companyId)
    .gte('created_at', params.since)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 200);

  if (error) {
    throw new Error(`Failed to load expenses: ${error.message}`);
  }
  return z.array(expenseRowSchema).parse(data ?? []);
}

async function listForms(
  client: AnySupabaseClient,
  companyId: string,
  params: { since: string; limit?: number },
) {
  const { data, error } = await client
    .from('forms')
    .select('id, company_id, title, created_at, form_submissions(id, form_id, submitted_at, status)')
    .eq('company_id', companyId)
    .gte('created_at', params.since)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 100);

  if (error) {
    throw new Error(`Failed to load forms: ${error.message}`);
  }

  return z.array(formRowSchema).parse(data ?? []);
}

async function buildAnalysisData(
  client: AnySupabaseClient,
  companyId: string,
  type: z.infer<typeof requestSchema>['type'],
) {
  const now = Date.now();
  switch (type) {
    case 'dashboard': {
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [schedules, tasks, expenses] = await Promise.all([
        listSchedules(client, companyId, { start: thirtyDaysAgo, limit: 400 }),
        listTasks(client, companyId, { since: thirtyDaysAgo, limit: 300 }),
        listExpenses(client, companyId, { since: thirtyDaysAgo, limit: 300 }),
      ]);
      return { schedules, tasks, expenses };
    }
    case 'scheduler': {
      const today = new Date().toISOString();
      const horizon = new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString();
      const schedules = await listSchedules(client, companyId, {
        start: today,
        end: horizon,
        limit: 400,
      });
      return { schedules };
    }
    case 'expenses': {
      const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();
      const expenses = await listExpenses(client, companyId, { since: sixtyDaysAgo, limit: 400 });
      return { expenses };
    }
    case 'reports': {
      const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
      const [tasks, forms] = await Promise.all([
        listTasks(client, companyId, { since: ninetyDaysAgo, limit: 400 }),
        listForms(client, companyId, { since: ninetyDaysAgo, limit: 120 }),
      ]);
      return { tasks, forms };
    }
    case 'chat': {
      const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();
      const [schedules, tasks] = await Promise.all([
        listSchedules(client, companyId, { start: sixtyDaysAgo, limit: 100 }),
        listTasks(client, companyId, { since: sixtyDaysAgo, limit: 150 }),
      ]);
      return { schedules, tasks };
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = assertAuthHeader(req);
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw Object.assign(new Error('Unauthorized'), { status: 401 });
    }

    const body = requestSchema.parse(await req.json());
    const companyId = await resolveCompanyId(supabase, userData.user.id);
    if (!companyId) {
      throw Object.assign(new Error('No company context found for user'), { status: 403 });
    }

    const analysisData = await buildAnalysisData(supabase, companyId, body.type);

    let systemPrompt = '';
    switch (body.type) {
      case 'dashboard':
        systemPrompt = `You are an AI operations analyst for FlowForce. Analyze the last 30 days of data and provide 3-4 key insights about shift coverage, task completion, expense patterns, and operational efficiency. Be concise and actionable.`;
        break;
      case 'scheduler':
        systemPrompt = `You are an AI scheduling analyst. Analyze upcoming schedules for coverage gaps, overtime patterns, and optimization opportunities. Focus on resource allocation and conflicts.`;
        break;
      case 'expenses':
        systemPrompt = `You are an AI financial analyst. Analyze expense patterns, identify outliers, cost trends, and suggest budget optimizations for this company.`;
        break;
      case 'reports':
        systemPrompt = `You are an AI reporting analyst. Analyze task completion trends, form usage patterns, and provide insights for performance reporting with actionable recommendations.`;
        break;
      case 'chat':
        systemPrompt = `You are FlowForce AI Assistant. Answer user questions about their operations data. Be helpful, concise, and provide specific insights when possible. Current context: ${body.context || 'general operations'}`;
        break;
      default:
        systemPrompt = 'You are an AI analyst.';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: body.query || `Please analyze this data and provide insights: ${JSON.stringify(analysisData).slice(0, 8000)}` 
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const aiResponse = await response.json();
    const insights = aiResponse.choices[0].message.content;

    return new Response(JSON.stringify({ insights, data: analysisData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-insights function:', error);
    const status = (error as { status?: number }).status ?? 500;
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
