
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, context, query } = await req.json();
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    let analysisData = {};
    let systemPrompt = '';

    // Fetch relevant data based on insight type
    switch (type) {
      case 'dashboard':
        const { data: schedules } = await supabase
          .from('schedules')
          .select('*')
          .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        const { data: expenses } = await supabase
          .from('expenses')
          .select('*')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        analysisData = { schedules, tasks, expenses };
        systemPrompt = `You are an AI operations analyst for FlowForce. Analyze the last 30 days of data and provide 3-4 key insights about shift coverage, task completion rates, expense patterns, and operational efficiency. Be concise and actionable.`;
        break;

      case 'scheduler':
        const { data: recentSchedules } = await supabase
          .from('schedules')
          .select('*')
          .gte('start_time', new Date().toISOString())
          .lte('start_time', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());

        analysisData = { schedules: recentSchedules };
        systemPrompt = `You are an AI scheduling analyst. Analyze upcoming schedules for coverage gaps, overtime patterns, and suggest optimizations. Focus on resource allocation and potential conflicts.`;
        break;

      case 'expenses':
        const { data: recentExpenses } = await supabase
          .from('expenses')
          .select('*')
          .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

        analysisData = { expenses: recentExpenses };
        systemPrompt = `You are an AI financial analyst. Analyze expense patterns, identify outliers, cost trends, and suggest budget optimizations. Look for unusual spending patterns and cost-saving opportunities.`;
        break;

      case 'reports':
        const { data: reportData } = await supabase
          .from('tasks')
          .select('*')
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        const { data: formData } = await supabase
          .from('forms')
          .select('*, form_submissions(*)')
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        analysisData = { tasks: reportData, forms: formData };
        systemPrompt = `You are an AI reporting analyst. Analyze task completion trends, form usage patterns, and provide insights for performance reporting. Focus on productivity metrics and data-driven recommendations.`;
        break;

      case 'chat':
        // For chat queries, fetch relevant data based on the question
        const { data: allData } = await supabase
          .from('schedules')
          .select('*')
          .limit(100);
        
        analysisData = { schedules: allData };
        systemPrompt = `You are FlowForce AI Assistant. Answer user questions about their operations data. Be helpful, concise, and provide specific insights when possible. Current context: ${context || 'general operations'}`;
        break;

      default:
        throw new Error('Invalid insight type');
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
            content: query || `Please analyze this data and provide insights: ${JSON.stringify(analysisData).slice(0, 8000)}` 
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
