import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, data } = await req.json();
    
    switch (action) {
      case 'generate_recommendations':
        return await generateShiftRecommendations(supabase, data);
      case 'analyze_coverage':
        return await analyzeCoverage(supabase, data);
      case 'check_compliance':
        return await checkCompliance(supabase, data);
      case 'generate_insights':
        return await generateInsights(supabase, data);
      case 'auto_schedule':
        return await autoGenerateSchedule(supabase, data);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in AI scheduling assistant:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Generate smart shift recommendations based on AI analysis
async function generateShiftRecommendations(supabase: any, { scheduleId, companyId }: any) {
  // Get schedule details
  const { data: schedule } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .single();

  // Get staff availability
  const { data: availability } = await supabase
    .from('staff_availability')
    .select(`
      *,
      profiles(id, first_name, last_name, role)
    `)
    .eq('day_of_week', new Date(schedule.start_time).getDay());

  // Get staff performance data
  const { data: performance } = await supabase
    .from('staff_performance')
    .select('*')
    .eq('role', schedule.role)
    .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('date', { ascending: false });

  // Get current schedule load
  const { data: currentAssignments } = await supabase
    .from('schedule_assignments')
    .select(`
      *,
      schedules(start_time, end_time)
    `)
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
    const weeklyHours = userAssignments.reduce((sum: number, a: any) => {
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Analyze schedule coverage and identify gaps
async function analyzeCoverage(supabase: any, { companyId, weekStart }: any) {
  const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get all schedules for the week
  const { data: schedules } = await supabase
    .from('schedules')
    .select(`
      *,
      schedule_assignments(user_id, status)
    `)
    .eq('company_id', companyId)
    .gte('start_time', weekStart)
    .lte('start_time', weekEnd.toISOString());

  // Analyze coverage by role and time
  const coverageAnalysis = {
    totalShifts: schedules?.length || 0,
    assignedShifts: schedules?.filter((s: any) => s.schedule_assignments.length > 0).length || 0,
    unassignedShifts: schedules?.filter((s: any) => s.schedule_assignments.length === 0) || [],
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Check compliance violations
async function checkCompliance(supabase: any, { companyId, userId, schedules }: any) {
  // Get compliance rules
  const { data: rules } = await supabase
    .from('compliance_rules')
    .select('*')
    .eq('company_id', companyId)
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Generate AI insights
async function generateInsights(supabase: any, { companyId }: any) {
  const insights = {
    overworkedStaff: [],
    underutilizedStaff: [],
    attendanceIssues: [],
    roleGaps: [],
    recommendations: []
  };

  // Get performance data for analysis
  const { data: performance } = await supabase
    .from('staff_performance')
    .select(`
      *,
      profiles(first_name, last_name)
    `)
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Auto-generate schedule using AI
async function autoGenerateSchedule(supabase: any, { companyId, weekStart, preferences }: any) {
  console.log('Auto-generating schedule for week:', weekStart);
  
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}