import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Filter,
  Sparkles,
  UserPlus,
  Shield,
  KeyRound,
  UserX,
  UserCheck,
  RefreshCw,
  MoreVertical,
  LayoutGrid,
  Building2,
  Clock,
  BadgeCheck,
  ArrowRight,
  Copy,
  AlertTriangle,
  TrendingUp,
  MessageCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCan } from '@/hooks/useCan';
import { useCompanyRoles } from '@/hooks/useCompanyRoles';
import { usePositions } from '@/hooks/usePositions';
import { useEmployees, type Employee } from '@/hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';
import { evaluateEmployee } from '@/copilot/rulesEngine';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import { logAuditEvent } from '@/services/audit/auditService';

interface DepartmentRecord {
  id: string;
  name: string;
  color?: string | null;
}

interface CompanyInvite {
  id: string;
  email: string;
  role: string;
  invite_code: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  phone: string | null;
}

interface CopilotInsight {
  id: string;
  type: 'promotion' | 'coaching' | 'roleGap' | 'inactive';
  title: string;
  description: string;
  employeeId?: string;
  positionId?: string;
}

type UserRoleEnum = Database['public']['Enums']['user_role'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type PositionRow = Database['public']['Tables']['positions']['Row'];
type DepartmentRow = Database['public']['Tables']['departments']['Row'];

type ProfileWithRelations = ProfileRow & {
  department: Pick<DepartmentRow, 'id' | 'name' | 'color'> | null;
  position: (Pick<PositionRow, 'id' | 'name' | 'role'> & { role: string | null }) | null;
};

const COMPANY_INVITES_TABLE = 'company_invites' as const;
const CREATE_COMPANY_INVITE_FN = 'create_company_invite' as const;
type CreateInviteArgs = Database['public']['Functions'][typeof CREATE_COMPANY_INVITE_FN]['Args'];
type CompanyInviteRow = Database['public']['Tables'][typeof COMPANY_INVITES_TABLE]['Row'];

type ViewMode = 'department' | 'role';
type StatusFilter = 'active' | 'inactive' | 'all';

const DEFAULT_ROLES = ['staff', 'supervisor', 'manager', 'admin', 'owner'];

const formatRoleLabel = (role?: string | null) => {
  if (!role) return 'Unassigned';
  return role
    .replace(/_/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const buildInitials = (firstName?: string, lastName?: string) => {
  const first = firstName?.[0] ?? '';
  const last = lastName?.[0] ?? '';
  return (first + last || 'TM').toUpperCase();
};

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const isInviteExpired = (invite: CompanyInvite) => new Date(invite.expires_at) < new Date();

const sortByName = (a: Employee, b: Employee) =>
  `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);

export default function UserManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { can } = useCan();
  const { resetPassword } = useAuth();
  const { employees: activeEmployees = [], loading: activeLoading, refetchEmployees } = useEmployees();
  const { roles = [], isLoading: rolesLoading } = useCompanyRoles();
  const { positions, assignments, loading: positionsLoading } = usePositions();

  const [viewMode, setViewMode] = useState<ViewMode>('department');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'staff',
  });
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);

  const employeeSample = useMemo(() => activeEmployees.slice(0, 6), [activeEmployees]);
  const employeeSampleKey = useMemo(
    () => employeeSample.map((employee) => employee.id).sort().join(','),
    [employeeSample],
  );

  const departmentsQuery = useQuery({
    queryKey: ['team-management', 'departments'],
    enabled: can('manageUsers'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, color')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DepartmentRecord[];
    },
  });

  const invitesQuery = useQuery({
    queryKey: ['team-management', 'invites'],
    enabled: can('manageUsers'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from(COMPANY_INVITES_TABLE)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows: CompanyInviteRow[] = data ?? [];
      return rows.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role ?? 'staff',
        invite_code: invite.invite_token,
        expires_at: invite.expires_at,
        used_at: invite.accepted_at,
        created_at: invite.created_at,
        first_name: invite.first_name,
        last_name: invite.last_name,
        birth_date: invite.birth_date,
        phone: invite.phone,
      }));
    },
  });

  const inactiveEmployeesQuery = useQuery({
    queryKey: ['team-management', 'inactive-employees'],
    enabled: can('manageUsers'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            role,
            employment_status,
            department_id,
            department:departments(id, name, color),
            position:positions(id, name, role)
          `,
        )
        .eq('employment_status', 'inactive')
        .order('first_name', { ascending: true });

      if (error) throw error;

      const rows: ProfileWithRelations[] = (data ?? []) as ProfileWithRelations[];

      return rows.map((profile) => ({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        avatar_url: profile.avatar_url ?? undefined,
        role: profile.role,
        employment_status: profile.employment_status,
        department_id: profile.department_id,
        department: profile.department
          ? {
              id: profile.department.id,
              name: profile.department.name,
              color: profile.department.color,
            }
          : null,
        position: profile.position
          ? {
              id: profile.position.id,
              name: profile.position.name,
              role: profile.position.role ?? profile.role,
            }
          : undefined,
        skillLevel: undefined,
        skillXp: undefined,
        badges: [],
        reliability: undefined,
        positiveReportCount: 0,
        lateCount: 0,
        noShowCount: 0,
      }));
    },
  });

  const copilotInsightsQuery = useQuery({
    queryKey: ['team-management', 'copilot-insights', employeeSampleKey],
    enabled: can('manageUsers') && employeeSample.length > 0,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const evaluations = await Promise.all(
        employeeSample.map(async (employee) => {
          try {
            const decision = await evaluateEmployee(employee.id);
            return { employee, decision };
          } catch (error) {
            logger.error('Failed to evaluate employee for Copilot insights', { error, tags: ['error'] });
            return null;
          }
        }),
      );

      const insights: CopilotInsight[] = [];

      evaluations.forEach((entry) => {
        if (!entry?.decision) return;
        const { employee, decision } = entry;

        if (decision.promotion) {
          const confidence = Math.round((decision.promotion.confidence ?? 0) * 100);
          insights.push({
            id: `promotion-${employee.id}`,
            type: 'promotion',
            title: `${employee.first_name} ${employee.last_name} ready for ${decision.promotion.role}`,
            description: `${decision.promotion.rationale} (confidence ${confidence}%).`,
            employeeId: employee.id,
          });
        }

        (decision.coachingNotes ?? []).forEach((note, index) => {
          insights.push({
            id: `coaching-${employee.id}-${index}`,
            type: 'coaching',
            title: `${employee.first_name} ${employee.last_name} coaching opportunity`,
            description: note,
            employeeId: employee.id,
          });
        });

        (decision.badges ?? []).forEach((badge, index) => {
          insights.push({
            id: `recognition-${employee.id}-${index}`,
            type: 'coaching',
            title: `${employee.first_name} ${employee.last_name} eligible for ${badge.badgeCode}`,
            description: badge.reason,
            employeeId: employee.id,
          });
        });
      });

      return insights.slice(0, 6);
    },
  });

  const queryClientInvalidate = (key: string) => {
    queryClient.invalidateQueries({ queryKey: ['team-management', key] });
  };

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as UserRoleEnum })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchEmployees();
      toast({
        title: 'Role updated',
        description: 'The employee role was updated successfully.',
      });
    },
    onError: (error: unknown) => {
      const description = error instanceof Error ? error.message : 'Please try again later.';
      toast({
        title: 'Unable to update role',
        description,
        variant: 'destructive',
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'active' | 'inactive' }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ employment_status: status })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      refetchEmployees();
      queryClientInvalidate('inactive-employees');
      toast({
        title: variables.status === 'inactive' ? 'User deactivated' : 'User reactivated',
        description:
          variables.status === 'inactive'
            ? 'They will no longer appear in active scheduling.'
            : 'They are now available for active schedules and assignments.',
      });
    },
    onError: (error: unknown) => {
      const description = error instanceof Error ? error.message : 'Please try again later.';
      toast({
        title: 'Unable to update status',
        description,
        variant: 'destructive',
      });
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: async () => {
      const auditMetadata = {
        email: inviteForm.email,
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName,
        role: inviteForm.role,
      };

      const payload: CreateInviteArgs = {
        company_uuid: null as unknown as string,
        invite_email: inviteForm.email,
        invite_role: inviteForm.role,
        employee_first_name: inviteForm.firstName,
        employee_last_name: inviteForm.lastName,
        employee_birth_date: undefined,
        employee_phone: undefined,
      };

      const { data, error } = await supabase.rpc(CREATE_COMPANY_INVITE_FN, payload);

      if (error) throw error;
      return {
        inviteCode: data as string,
        auditMetadata,
      };
    },
    onSuccess: ({ inviteCode, auditMetadata }) => {
      const link =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth?invite=${inviteCode}`
          : `/auth?invite=${inviteCode}`;
      setGeneratedInviteLink(link);
      setInviteForm({
        firstName: '',
        lastName: '',
        email: '',
        role: inviteForm.role,
      });
      queryClientInvalidate('invites');
      toast({
        title: 'Invite created',
        description: 'The pre-account invite link has been generated.',
      });

      void logAuditEvent({
        targetUserId: null,
        action: 'invite.created',
        tableName: 'company_invites',
        recordId: null,
        newValues: {
          ...auditMetadata,
          inviteCode,
        },
      });
    },
    onError: (error: unknown) => {
      const description = error instanceof Error ? error.message : 'Please verify the details and try again.';
      toast({
        title: 'Unable to create invite',
        description,
        variant: 'destructive',
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: string, currentRole: string) => {
    if (newRole === currentRole) return;
    updateRoleMutation.mutate({ userId, newRole });
  };

  const handleResetPassword = async (email: string) => {
    await resetPassword(email);
  };

  const handleStatusToggle = (employee: Employee) => {
    const nextStatus = employee.employment_status === 'active' ? 'inactive' : 'active';
    deactivateMutation.mutate({ userId: employee.id, status: nextStatus });
  };

  const handleReactivate = (userId: string) => {
    deactivateMutation.mutate({ userId, status: 'active' });
  };

  const handleCreateInvite = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) {
      toast({
        title: 'Missing information',
        description: 'Email, first name, and last name are required.',
        variant: 'destructive',
      });
      return;
    }
    createInviteMutation.mutate();
  };

  const handleCopyLink = async () => {
    if (!generatedInviteLink) return;
    try {
      await navigator.clipboard?.writeText(generatedInviteLink);
      toast({
        title: 'Copied invite link',
        description: 'Share this link with the employee to complete their setup.',
      });
    } catch {
      toast({
        title: 'Unable to copy link',
        description: 'Copy the link manually from the field below.',
        variant: 'destructive',
      });
    }
  };

  const departments = useMemo(
    () => departmentsQuery.data ?? [],
    [departmentsQuery.data],
  );
  const inactiveEmployees = useMemo(
    () => inactiveEmployeesQuery.data ?? [],
    [inactiveEmployeesQuery.data],
  );
  const allEmployeesForFilters = useMemo(() => {
    if (statusFilter === 'active') return activeEmployees;
    if (statusFilter === 'inactive') return inactiveEmployees;
    return [...activeEmployees, ...inactiveEmployees];
  }, [activeEmployees, inactiveEmployees, statusFilter]);

  const searchTermLower = searchTerm.trim().toLowerCase();
  const filteredEmployees = useMemo(() => {
    let list = [...allEmployeesForFilters];

    if (searchTermLower) {
      list = list.filter((employee) => {
        const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
        return (
          fullName.includes(searchTermLower) ||
          employee.email.toLowerCase().includes(searchTermLower) ||
          employee.position?.name?.toLowerCase().includes(searchTermLower) ||
          employee.department?.name?.toLowerCase().includes(searchTermLower)
        );
      });
    }

    if (roleFilter !== 'all') {
      list = list.filter((employee) => employee.role?.toLowerCase() === roleFilter.toLowerCase());
    }

    if (departmentFilter !== 'all') {
      list = list.filter((employee) => {
        if (departmentFilter === 'unassigned') {
          return !employee.department_id;
        }
        return (employee.department_id ?? '') === departmentFilter;
      });
    }

    return list.sort(sortByName);
  }, [allEmployeesForFilters, searchTermLower, roleFilter, departmentFilter]);

  const groupedEmployees = useMemo(() => {
    const map = new Map<string, Employee[]>();

    filteredEmployees.forEach((employee) => {
      const key =
        viewMode === 'department'
          ? employee.department?.name ?? 'Unassigned department'
          : formatRoleLabel(employee.role);

      const current = map.get(key) ?? [];
      current.push(employee);
      map.set(key, current);
    });

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredEmployees, viewMode]);

  const pendingInvites = useMemo(
    () => (invitesQuery.data ?? []).filter((invite) => !invite.used_at && !isInviteExpired(invite)),
    [invitesQuery.data],
  );

  const roleOptions = useMemo(() => {
    const availableRoles = Array.isArray(roles)
      ? roles.map((role) => role.name.toLowerCase())
      : [];
    const combined = new Set([...DEFAULT_ROLES, ...availableRoles]);
    return Array.from(combined.values());
  }, [roles]);

  const positionCoverage = useMemo(() => {
    if (!assignments) return [];
    const activeAssignments = assignments.filter((assignment) => assignment.is_active);
    const counts = new Map<string, number>();

    activeAssignments.forEach((assignment) => {
      counts.set(assignment.position_id, (counts.get(assignment.position_id) ?? 0) + 1);
    });

    return positions
      .map((position) => ({
        id: position.id,
        name: position.name,
        role: formatRoleLabel(position.role),
        color: position.color,
        employees: counts.get(position.id) ?? 0,
      }))
      .sort((a, b) => b.employees - a.employees)
      .slice(0, 4);
  }, [assignments, positions]);

  const roleSummaries = useMemo(() => {
    if (!Array.isArray(roles)) return [];
    const aggregate = [...activeEmployees, ...inactiveEmployees];

    return roles
      .map((role) => {
        const normalized = role.name.toLowerCase();
        const members = aggregate.filter(
          (employee) => employee.role?.toLowerCase() === normalized,
        ).length;
        const permissionCount = Object.values(role.permissions ?? {}).filter(Boolean).length;
        return {
          id: role.id,
          name: role.name,
          color: role.color,
          members,
          permissionCount,
        };
      })
      .sort((a, b) => b.members - a.members)
      .slice(0, 4);
  }, [roles, activeEmployees, inactiveEmployees]);

  const roleGapInsights = useMemo<CopilotInsight[]>(() => {
    if (!positions || positions.length === 0) return [];
    const activeAssignments = assignments.filter((assignment) => assignment.is_active);
    const counts = new Map<string, number>();
    activeAssignments.forEach((assignment) => {
      counts.set(assignment.position_id, (counts.get(assignment.position_id) ?? 0) + 1);
    });

    return positions
      .filter((position) => position.is_active !== false)
      .filter((position) => (counts.get(position.id) ?? 0) === 0)
      .slice(0, 3)
      .map((position) => ({
        id: `role-gap-${position.id}`,
        type: 'roleGap',
        title: `${position.name} has no active coverage`,
        description: `Assign a team member to the ${formatRoleLabel(position.role)} track to keep coverage balanced.`,
        positionId: position.id,
      }));
  }, [positions, assignments]);

  const inactiveInsights = useMemo<CopilotInsight[]>(() => {
    if (!inactiveEmployees.length) return [];
    return inactiveEmployees.slice(0, 3).map((employee) => ({
      id: `inactive-${employee.id}`,
      type: 'inactive',
      title: `${employee.first_name} ${employee.last_name} inactive`,
      description: 'No recent activity. Consider reactivating or archiving their access.',
      employeeId: employee.id,
    }));
  }, [inactiveEmployees]);

  const aggregatedInsights = useMemo(() => {
    const combined = [
      ...(copilotInsightsQuery.data ?? []),
      ...roleGapInsights,
      ...inactiveInsights,
    ];

    const unique = new Map<string, CopilotInsight>();
    combined.forEach((insight) => {
      if (!unique.has(insight.id)) {
        unique.set(insight.id, insight);
      }
    });

    return Array.from(unique.values()).slice(0, 6);
  }, [copilotInsightsQuery.data, roleGapInsights, inactiveInsights]);

  const isBusy =
    activeLoading ||
    departmentsQuery.isLoading ||
    rolesLoading ||
    positionsLoading ||
    deactivateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Team Management</h2>
          <p className="text-muted-foreground">
            Search, filter, and manage your entire team from one dashboard. Invite new hires,
            adjust roles, and keep permissions aligned.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchEmployees()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/employees?invite=1')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Full Invite Flow
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Active employees</span>
                <Badge variant="secondary">
                  <Users className="mr-1 h-3 w-3" />
                  {activeEmployees.length}
                </Badge>
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {activeEmployees.length}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Inactive users</span>
                <Badge variant="outline">{inactiveEmployees.length}</Badge>
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {inactiveEmployees.length}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Pending invites</span>
                <Badge variant={pendingInvites.length > 0 ? 'default' : 'secondary'}>
                  {pendingInvites.length}
                </Badge>
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {pendingInvites.length}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Departments</span>
                <Badge variant="outline">{departments.length}</Badge>
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {departments.length}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, department, or position"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="all">All statuses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <Shield className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {formatRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Building2 className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-md border border-border p-1">
                <Button
                  variant={viewMode === 'department' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                  onClick={() => setViewMode('department')}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Department
                </Button>
                <Button
                  variant={viewMode === 'role' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                  onClick={() => setViewMode('role')}
                >
                  <Shield className="h-4 w-4" />
                  Role
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <div className="space-y-6">
          {isBusy ? (
            <Card>
              <CardContent className="flex h-48 items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading team data…</div>
              </CardContent>
            </Card>
          ) : groupedEmployees.length === 0 ? (
            <Card>
              <CardContent className="flex h-48 flex-col items-center justify-center text-center">
                <Users className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No employees match your filters. Adjust filters or invite a new team member.
                </p>
              </CardContent>
            </Card>
          ) : (
            groupedEmployees.map(([groupName, members]) => (
              <Card key={groupName}>
                <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                      {groupName}
                    </CardTitle>
                    <CardDescription>{members.length} team member(s)</CardDescription>
                  </div>
                  <Badge variant="outline">{members.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {members.map((employee) => {
                      const reliability = employee.reliability ?? undefined;
                      const reliabilityLabel =
                        reliability === undefined ? 'N/A' : `${Math.round(reliability)}%`;
                      const statusLabel =
                        employee.employment_status === 'active' ? 'Active' : 'Inactive';
                      const showReactivate = employee.employment_status === 'inactive';
                      const badgeCount = employee.badges?.length ?? 0;

                      return (
                        <div
                          key={employee.id}
                          className="flex flex-col gap-4 rounded-xl border border-border p-4 shadow-sm transition hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-1 items-start gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage
                                  src={employee.avatar_url ?? undefined}
                                  alt={`${employee.first_name} ${employee.last_name}`}
                                />
                                <AvatarFallback>
                                  {buildInitials(employee.first_name, employee.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-semibold text-foreground">
                                    {employee.first_name} {employee.last_name}
                                  </h3>
                                  <Badge
                                    style={{
                                      backgroundColor: employee.department?.color
                                        ? `${employee.department.color}20`
                                        : undefined,
                                      color: employee.department?.color ?? undefined,
                                    }}
                                  >
                                    {formatRoleLabel(employee.role)}
                                  </Badge>
                                  <Badge
                                    variant={showReactivate ? 'outline' : 'secondary'}
                                    className={cn(
                                      'capitalize',
                                      showReactivate && 'border-dashed text-muted-foreground',
                                    )}
                                  >
                                    {statusLabel}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {employee.email}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  <span>
                                    <Building2 className="mr-1 inline h-3 w-3" />
                                    {employee.department?.name ?? 'Unassigned department'}
                                  </span>
                                  {employee.position?.name && (
                                    <span>
                                      <Shield className="mr-1 inline h-3 w-3" />
                                      {employee.position.name}
                                    </span>
                                  )}
                                  <span>
                                    <BadgeCheck className="mr-1 inline h-3 w-3" />
                                    {badgeCount} badge{badgeCount === 1 ? '' : 's'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleResetPassword(employee.email)}>
                                  <KeyRound className="mr-2 h-4 w-4" />
                                  Send reset email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusToggle(employee)}>
                                  {showReactivate ? (
                                    <>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Reactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/employees?focus=${employee.id}`)}>
                                  <ArrowRight className="mr-2 h-4 w-4" />
                                  Open in directory
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex flex-col gap-3">
                            <div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Reliability</span>
                                <span>{reliabilityLabel}</span>
                              </div>
                              <Progress value={reliability ?? 0} className="h-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div className="rounded-md border border-dashed border-border p-2">
                                <div className="font-medium text-foreground">
                                  {employee.skillLevel ?? '—'}
                                </div>
                                <div className="text-[11px] uppercase tracking-wide">
                                  Skill level
                                </div>
                              </div>
                              <div className="rounded-md border border-dashed border-border p-2">
                                <div className="font-medium text-foreground">
                                  {employee.noShowCount ?? 0} NS / {employee.lateCount ?? 0} late
                                </div>
                                <div className="text-[11px] uppercase tracking-wide">
                                  Attendance (30d)
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Select
                              value={employee.role}
                              onValueChange={(value) => handleRoleChange(employee.id, value, employee.role)}
                            >
                              <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Update role" />
                              </SelectTrigger>
                              <SelectContent>
                                {roleOptions.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {formatRoleLabel(role)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/performance?focus=${employee.id}`)}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              Performance
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/enhanced-scheduling?focus=${employee.id}`)}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Scheduling
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Quick invite
              </CardTitle>
              <CardDescription>
                Create a pre-account and send a secure activation link without leaving the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-3" onSubmit={handleCreateInvite}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="First name"
                    value={inviteForm.firstName}
                    onChange={(event) => setInviteForm((prev) => ({ ...prev, firstName: event.target.value }))}
                  />
                  <Input
                    placeholder="Last name"
                    value={inviteForm.lastName}
                    onChange={(event) => setInviteForm((prev) => ({ ...prev, lastName: event.target.value }))}
                  />
                </div>
                <Input
                  type="email"
                  placeholder="Work email"
                  value={inviteForm.email}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
                />
                <Select
                  value={inviteForm.role}
                  onValueChange={(value) => setInviteForm((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign starting role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {formatRoleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" className="w-full" disabled={createInviteMutation.isPending}>
                  {createInviteMutation.isPending ? 'Creating invite…' : 'Create invite'}
                </Button>
              </form>

              {generatedInviteLink && (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="mb-2 flex items-center justify-between">
                    <span>New invite link</span>
                    <Button variant="ghost" size="sm" type="button" onClick={handleCopyLink}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <div className="truncate font-medium text-foreground">{generatedInviteLink}</div>
                </div>
              )}

              <Separator />

              <div>
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-muted-foreground">
                  Pending invites
                  <Badge variant="outline">{pendingInvites.length}</Badge>
                </div>
                {invitesQuery.isLoading ? (
                  <div className="text-xs text-muted-foreground">Loading pending invites…</div>
                ) : pendingInvites.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Everyone invited has joined. Great job!
                  </div>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-3 pr-2">
                      {pendingInvites.slice(0, 6).map((invite) => (
                        <div key={invite.id} className="rounded-lg border border-border p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">{invite.email}</span>
                            <Badge variant="secondary">{formatRoleLabel(invite.role)}</Badge>
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            Created {formatDateTime(invite.created_at)}
                          </div>
                          <div className="text-muted-foreground">
                            Expires {formatDateTime(invite.expires_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role &amp; permission snapshot
              </CardTitle>
              <CardDescription>
                Track coverage across roles and ensure permissions reflect your operating model.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="text-xs font-medium uppercase text-muted-foreground">Top roles</div>
                {roleSummaries.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    No custom roles found yet. Configure roles to unlock tailored permissions.
                  </div>
                ) : (
                  roleSummaries.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <div className="font-medium text-foreground">{role.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {role.permissionCount} permission{role.permissionCount === 1 ? '' : 's'}
                        </div>
                      </div>
                      <Badge style={{ backgroundColor: `${role.color}20`, color: role.color }}>
                        {role.members} member{role.members === 1 ? '' : 's'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="text-xs font-medium uppercase text-muted-foreground">Position coverage</div>
                {positionCoverage.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Assign positions to understand workload coverage.
                  </div>
                ) : (
                  positionCoverage.map((position) => (
                    <div
                      key={position.id}
                      className="flex items-center justify-between rounded-lg border border-dashed border-border p-3"
                    >
                      <div>
                        <div className="font-medium text-foreground">{position.name}</div>
                        <div className="text-xs text-muted-foreground">{position.role}</div>
                      </div>
                      <Badge>{position.employees} assigned</Badge>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/admin?tab=roles')}>
                  Configure roles
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => navigate('/position-management')}>
                  Manage positions
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  AI Co-Pilot insights
                </CardTitle>
                <CardDescription>
                  Surface gaps, opportunities, and at-risk teammates automatically.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copilotInsightsQuery.refetch()}
                disabled={copilotInsightsQuery.isFetching}
              >
                <RefreshCw
                  className={cn('mr-2 h-4 w-4', copilotInsightsQuery.isFetching && 'animate-spin')}
                />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {copilotInsightsQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Analyzing team patterns…</div>
              ) : copilotInsightsQuery.isError ? (
                <div className="text-sm text-muted-foreground">
                  Unable to load Copilot insights right now. Try refreshing in a moment.
                </div>
              ) : aggregatedInsights.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No alerts from Copilot. Coverage and engagement look healthy!
                </div>
              ) : (
                <div className="space-y-3">
                  {aggregatedInsights.map((insight) => {
                    let icon = <Sparkles className="h-4 w-4 text-purple-500" />;
                    let badgeClass = 'bg-purple-50 text-purple-600 border-purple-100';
                    let badgeLabel = 'Insight';
                    let action: ReactNode | null = null;

                    switch (insight.type) {
                      case 'promotion':
                        icon = <TrendingUp className="h-4 w-4 text-emerald-500" />;
                        badgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                        badgeLabel = 'Promotion';
                        if (insight.employeeId) {
                          action = (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/performance?focus=${insight.employeeId}`)}
                            >
                              Review
                            </Button>
                          );
                        }
                        break;
                      case 'coaching':
                        icon = <MessageCircle className="h-4 w-4 text-amber-500" />;
                        badgeClass = 'bg-amber-50 text-amber-600 border-amber-100';
                        badgeLabel = 'Coaching';
                        if (insight.employeeId) {
                          action = (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/performance?focus=${insight.employeeId}`)}
                            >
                              View notes
                            </Button>
                          );
                        }
                        break;
                      case 'roleGap':
                        icon = <AlertTriangle className="h-4 w-4 text-rose-500" />;
                        badgeClass = 'bg-rose-50 text-rose-600 border-rose-100';
                        badgeLabel = 'Coverage gap';
                        action = (
                          <Button variant="outline" size="sm" onClick={() => navigate('/position-management')}>
                            Assign
                          </Button>
                        );
                        break;
                      case 'inactive':
                        icon = <UserX className="h-4 w-4 text-sky-500" />;
                        badgeClass = 'bg-sky-50 text-sky-600 border-sky-100';
                        badgeLabel = 'Inactive';
                        action = insight.employeeId ? (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/employees?focus=${insight.employeeId}`)}
                            >
                              Review
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivate(insight.employeeId!)}
                            >
                              Reactivate
                            </Button>
                          </div>
                        ) : null;
                        break;
                    }

                    return (
                      <div
                        key={insight.id}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-1 items-start gap-3">
                            <div className="rounded-full bg-muted p-2">{icon}</div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{insight.title}</span>
                                <Badge className={cn('border', badgeClass)}>{badgeLabel}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{insight.description}</p>
                            </div>
                          </div>
                          {action}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
