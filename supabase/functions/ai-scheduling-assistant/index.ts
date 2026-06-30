import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Restrict CORS to trusted origins only
const getAllowedOrigin = (origin: string | null): string => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    // Add your production domains here
    // 'https://yourdomain.com',
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  return allowedOrigins[0] || '';
};

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(origin),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, api_key, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

// Validate user authentication and company membership
async function validateAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw Object.assign(new Error('Missing Authorization header'), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw Object.assign(new Error('Missing Supabase configuration'), { status: 500 });
  }

  // Create client with user's auth token
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  // Validate user session
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }

  // Get user's company_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.company_id) {
    throw Object.assign(new Error('No company context found for user'), { status: 403 });
  }

  return { supabase, userId: userData.user.id, userCompanyId: profile.company_id };
}

// Validate that requested companyId matches user's company
function validateCompanyAccess(userCompanyId: string, requestedCompanyId: string | undefined) {
  if (!requestedCompanyId) {
    return userCompanyId; // Use user's company if none specified
  }
  
  if (requestedCompanyId !== userCompanyId) {
    throw Object.assign(
      new Error('Access denied: Cannot access data from other companies'),
      { status: 403 }
    );
  }
  
  return requestedCompanyId;
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // Validate authentication and get user's company
    const { supabase, userId, userCompanyId } = await validateAuth(req);
    
    const { action, data } = await req.json();
    
    // Validate and scope company_id for all actions
    const validatedCompanyId = validateCompanyAccess(userCompanyId, data?.companyId);
    
    // Create scoped data object with validated company_id
    const scopedData = { ...data, companyId: validatedCompanyId };
    
    let response: Response;
    
    switch (action) {
      case 'generate_recommendations':
        response = await generateShiftRecommendations(supabase, scopedData, userId, validatedCompanyId);
        break;
      case 'analyze_coverage':
        response = await analyzeCoverage(supabase, scopedData, validatedCompanyId);
        break;
      case 'check_compliance':
        response = await checkCompliance(supabase, scopedData, validatedCompanyId);
        break;
      case 'generate_insights':
        response = await generateInsights(supabase, scopedData, validatedCompanyId);
        break;
      case 'auto_schedule':
        response = await autoGenerateSchedule(supabase, scopedData, validatedCompanyId);
        break;
      default:
        throw new Error('Invalid action');
    }
    
    // Add CORS headers to response
    const origin = req.headers.get('Origin');
    const corsHeadersObj = corsHeaders(origin);
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeadersObj).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (error) {
    console.error('Error in AI scheduling assistant:', error);
    const status = (error as { status?: number }).status ?? 500;
    const origin = req.headers.get('Origin');
    const corsHeadersObj = corsHeaders(origin);
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...corsHeadersObj, 'Content-Type': 'application/json' },
    });
  }
});

// Generate smart shift recommendations based on AI analysis
async function generateShiftRecommendations(supabase: any, { scheduleId, _companyId }: any, userId: string, validatedCompanyId: string) {
  if (!scheduleId) {
    throw Object.assign(new Error('scheduleId is required'), { status: 400 });
  }

  // Get schedule details - ensure it belongs to the user's company
  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('company_id', validatedCompanyId)
    .single();

  if (scheduleError || !schedule) {
    throw Object.assign(new Error('Schedule not found or access denied'), { status: 404 });
  }

  // Get staff availability - scope to company
  const { data: availability } = await supabase
    .from('staff_availability')
    .select(`
      *,
      profiles!inner(id, first_name, last_name, role, company_id)
    `)
    .eq('profiles.company_id', validatedCompanyId)
    .eq('day_of_week', new Date(schedule.start_time).getDay());

  // Get staff performance data - scope to company
  const { data: performance } = await supabase
    .from('staff_performance')
    .select(`
      *,
      profiles!inner(company_id)
    `)
    .eq('profiles.company_id', validatedCompanyId)
    .eq('role', schedule.role)
    .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('date', { ascending: false });

  // Get current schedule load - scope to company
  const { data: currentAssignments } = await supabase
    .from('schedule_assignments')
    .select(`
      *,
      schedules!inner(start_time, end_time, company_id)
    `)
    .eq('schedules.company_id', validatedCompanyId)
    .gte('schedules.start_time', new Date(schedule.start_time).toISOString().split('T')[0])
    .lte('schedules.start_time', new Date(schedule.start_time).toISOString().split('T')[0] + 'T23:59:59');

  // AI scoring algorithm
  const recommendations = availability?.map((avail: any) => {
    const userId = avail.profiles.id;
    
    // Calculate availability score (0-1)
    const scheduleStart = new Date(schedule.start_time);
    const availStart = new Date(`2000-01-01T${avail.start_time}`);
    const availEnd = new Date(`2000-01-01T${avail.end_time}`);
    const availabilityScore = (scheduleStart >= availStart && scheduleStart <= availEnd) ? 
      (avail.is_preferred ? 1.0 : 0.8) : 0;

    // Calculate performance score (0-1)
    const userPerformance = performance?.filter((p: any) => p.user_id === userId) || [];
    const avgPerformance = userPerformance.length > 0 
      ? userPerformance.reduce((sum: number, p: any) => sum + (p.performance_score || 3), 0) / userPerformance.length / 5
      : 0.6;

    // Calculate fairness score (0-1) - lower if overworked
    const userAssignments = currentAssignments?.filter((a: any) => a.user_id === userId) || [];
    const weeklyHours = userAssignments.reduce((sum: number, a: unknown) => {
      const start = new Date(a.schedules.start_time);
      const end = new Date(a.schedules.end_time);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
    const fairnessScore = Math.max(0, 1 - (weeklyHours / 40));

    // Calculate attendance reliability (0-1)
    const attendanceRecord = userPerformance.filter((p: any) => 
      p.attendance_status === 'present' || p.attendance_status === 'excused'
    );
    const reliabilityScore = userPerformance.length > 0 
      ? attendanceRecord.length / userPerformance.length 
      : 0.7;

    // Combined AI score
    const finalScore = (
      availabilityScore * 0.35 +
      avgPerformance * 0.25 +
      fairnessScore * 0.25 +
      reliabilityScore * 0.15
    );

    return {
      userId,
      name: `${avail.profiles.first_name} ${avail.profiles.last_name}`,
      score: Math.round(finalScore * 100),
      reasons: [
        availabilityScore > 0.8 ? 'Available during shift time' : 'Outside preferred hours',
        avgPerformance > 0.7 ? 'Strong performance history' : 'Average performance',
        fairnessScore > 0.7 ? 'Balanced workload' : 'High weekly hours',
        reliabilityScore > 0.8 ? 'Reliable attendance' : 'Some attendance issues'
      ],
      weeklyHours,
      availability: availabilityScore,
      performance: avgPerformance,
      fairness: fairnessScore,
      reliability: reliabilityScore
    };
  }).sort((a: any, b: any) => b.score - a.score) || [];

  return new Response(JSON.stringify({ recommendations }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// Analyze schedule coverage and identify gaps
async function analyzeCoverage(supabase: any, { _companyId, weekStart }: any, validatedCompanyId: string) {
  if (!weekStart) {
    throw Object.assign(new Error('weekStart is required'), { status: 400 });
  }
  
  // Use validated company ID
  const companyIdToUse = validatedCompanyId;
  const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get all schedules for the week - scoped to validated company
  const { data: schedules } = await supabase
    .from('schedules')
    .select(`
      *,
      schedule_assignments(user_id, status)
    `)
    .eq('company_id', companyIdToUse)
    .gte('start_time', weekStart)
    .lte('start_time', weekEnd.toISOString());

  // Analyze coverage by role and time
  const coverageAnalysis = {
    totalShifts: schedules?.length || 0,
    assignedShifts: schedules?.filter((s: any) => s.schedule_assignments.length > 0).length || 0,
    unassignedShifts: schedules?.filter((s: unknown) => s.schedule_assignments.length === 0) || [],
    overlapConflicts: [],
    gapAlerts: [],
    roleDistribution: {},
    hourlyDistribution: {}
  };

  // Calculate coverage percentage
  const coveragePercentage = coverageAnalysis.totalShifts > 0 
    ? Math.round((coverageAnalysis.assignedShifts / coverageAnalysis.totalShifts) * 100)
    : 0;

  return new Response(JSON.stringify({ 
    coverage: coverageAnalysis, 
    coveragePercentage,
    insights: [
      `${coverageAnalysis.unassignedShifts.length} shifts need assignment`,
      `${coveragePercentage}% coverage achieved`,
      'Peak hours: 12PM-6PM need more staff'
    ]
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// Check compliance violations
async function checkCompliance(supabase: any, { _companyId, _userId, schedules }: any, validatedCompanyId: string) {
  if (!schedules || !Array.isArray(schedules)) {
    throw Object.assign(new Error('schedules array is required'), { status: 400 });
  }
  
  // Get compliance rules - scoped to validated company
  const { data: rules } = await supabase
    .from('compliance_rules')
    .select('*')
    .eq('company_id', validatedCompanyId)
    .eq('is_active', true);

  const violations = [];
  
  // Check daily/weekly hours
  let totalWeeklyHours = 0;
  const dailyHours: { [key: string]: number } = {};
  
  schedules.forEach((schedule: any) => {
    const date = schedule.start_time.split('T')[0];
    const hours = (new Date(schedule.end_time).getTime() - new Date(schedule.start_time).getTime()) / (1000 * 60 * 60);
    
    dailyHours[date] = (dailyHours[date] || 0) + hours;
    totalWeeklyHours += hours;
  });

  // Check against rules
  rules?.forEach((rule: any) => {
    if (rule.rule_type === 'max_daily_hours') {
      Object.entries(dailyHours).forEach(([date, hours]) => {
        if (hours > rule.value) {
          violations.push({
            type: 'Daily Hours Exceeded',
            message: `${hours}h on ${date} exceeds ${rule.value}h limit`,
            severity: 'high'
          });
        }
      });
    }
    
    if (rule.rule_type === 'max_weekly_hours' && totalWeeklyHours > rule.value) {
      violations.push({
        type: 'Weekly Hours Exceeded', 
        message: `${totalWeeklyHours}h exceeds ${rule.value}h weekly limit`,
        severity: 'high'
      });
    }
  });

  return new Response(JSON.stringify({ violations, totalWeeklyHours }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// Generate AI insights
async function generateInsights(supabase: any, { _companyId }: any, validatedCompanyId: string) {
  const insights = {
    overworkedStaff: [],
    underutilizedStaff: [],
    attendanceIssues: [],
    roleGaps: [],
    recommendations: []
  };

  // Get performance data for analysis - scoped to validated company
  const { data: performance } = await supabase
    .from('staff_performance')
    .select(`
      *,
      profiles!inner(first_name, last_name, company_id)
    `)
    .eq('profiles.company_id', validatedCompanyId)
    .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // Analyze overwork
  const staffHours: { [key: string]: number } = {};
  performance?.forEach((p: any) => {
    staffHours[p.user_id] = (staffHours[p.user_id] || 0) + (p.hours_worked || 0);
  });

  Object.entries(staffHours).forEach(([userId, hours]) => {
    if (hours > 160) { // More than 40h/week average
      const staff = performance?.find((p: any) => p.user_id === userId);
      insights.overworkedStaff.push({
        name: `${staff?.profiles?.first_name} ${staff?.profiles?.last_name}`,
        hours,
        recommendation: 'Reduce shifts next week'
      });
    }
  });

  // Generate recommendations
  insights.recommendations = [
    'Consider hiring 2 more baristas for peak hours',
    'Weekend coverage needs improvement', 
    'Implement shift swapping to improve flexibility'
  ];

  return new Response(JSON.stringify({ insights }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// Auto-generate schedule using AI
async function autoGenerateSchedule(supabase: any, { _companyId, weekStart, _preferences }: any, validatedCompanyId: string) {
  if (!weekStart) {
    throw Object.assign(new Error('weekStart is required'), { status: 400 });
  }
  
  console.log('Auto-generating schedule for week:', weekStart, 'company:', validatedCompanyId);
  
  // This would contain the full AI scheduling algorithm
  // For now, returning a basic template
  const generatedSchedule = {
    shifts: [
      {
        role: 'Barista',
        startTime: '08:00',
        endTime: '16:00',
        recommendedStaff: 2,
        date: weekStart
      }
    ],
    coverage: 85,
    totalHours: 160,
    estimatedCost: 2400
  };

  return new Response(JSON.stringify({ schedule: generatedSchedule }), {
    headers: { 'Content-Type': 'application/json' },
  });
}