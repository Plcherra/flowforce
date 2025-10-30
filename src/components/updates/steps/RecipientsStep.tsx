import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Building, UserCheck, Globe, Target, AlertCircle } from 'lucide-react';

import type { WizardFormData } from '../CreateUpdateWizard';
import { useProfile } from '@/hooks/useProfile';
import { useRecipientInsights } from '@/features/company-updates/wizard/useRecipientInsights';

interface RecipientsStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

const STATIC_DEPARTMENTS = [
  { id: 'hr', name: 'Human Resources' },
  { id: 'engineering', name: 'Engineering' },
  { id: 'sales', name: 'Sales' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'operations', name: 'Operations' },
  { id: 'finance', name: 'Finance' },
];

const STATIC_ROLES = [
  { id: 'admin', name: 'Admin' },
  { id: 'manager', name: 'Manager' },
  { id: 'employee', name: 'Employee' },
  { id: 'contractor', name: 'Contractor' },
];

type RecipientUser = {
  id: string;
  name: string;
  role?: string | null;
  department?: string | null;
};

const STATIC_USERS: RecipientUser[] = [];

export function RecipientsStep({ formData, updateFormData }: RecipientsStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { profile } = useProfile();
  const insights = useRecipientInsights(formData);

  const availableUsers = useMemo<RecipientUser[]>(() => {
    const users = [...STATIC_USERS];

    if (profile) {
      const id = profile.userId ?? profile.id ?? 'current-user';
      const firstName = profile.firstName ?? profile.first_name ?? '';
      const lastName = profile.lastName ?? profile.last_name ?? '';
      const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || profile.email || 'You';
      const alreadyIncluded = users.some((user) => user.id === id);

      if (!alreadyIncluded) {
        users.push({
          id,
          name: displayName,
          role: profile.role ?? 'Member',
          department: null,
        });
      }
    }

    return users;
  }, [profile]);

  const updateRecipients = (updates: Partial<typeof formData.recipients>) => {
    updateFormData({
      recipients: { ...formData.recipients, ...updates },
    });
  };

  const handleRecipientTypeChange = (type: typeof formData.recipients.type) => {
    updateRecipients({
      type,
      targets: type === 'all' ? [] : formData.recipients.targets,
    });
  };

  const toggleTarget = (targetId: string, category: 'departments' | 'roles' | 'individuals') => {
    const currentTargets = formData.recipients.targets;
    const prefixedId = `${category}:${targetId}`;

    const newTargets = currentTargets.includes(prefixedId)
      ? currentTargets.filter((id) => id !== prefixedId)
      : [...currentTargets, prefixedId];

    updateRecipients({ targets: newTargets });
  };

  const isTargetSelected = (targetId: string, category: string) => {
    return formData.recipients.targets.includes(`${category}:${targetId}`);
  };

  const getRecipientCount = () => {
    if (formData.recipients.type === 'all') {
      return 'All employees';
    }

    const selectionByCategory = formData.recipients.targets.reduce<Record<string, number>>((acc, target) => {
      const [category] = target.split(':');
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {});

    if (formData.recipients.type === 'individuals') {
      const individualCount = selectionByCategory.individuals ?? 0;
      return individualCount > 0 ? `${individualCount} ${individualCount === 1 ? 'person' : 'people'}` : 'No recipients selected';
    }

    const appliedCategory = formData.recipients.type;
    const labels: Record<typeof appliedCategory, { singular: string; plural: string }> = {
      departments: { singular: 'department', plural: 'departments' },
      roles: { singular: 'role', plural: 'roles' },
      individuals: { singular: 'person', plural: 'people' },
      groups: { singular: 'group', plural: 'groups' },
      all: { singular: 'employee', plural: 'employees' },
    };
    const selectedCount = selectionByCategory[appliedCategory] ?? 0;
    return selectedCount > 0
      ? `${selectedCount} ${selectedCount === 1 ? labels[appliedCategory].singular : labels[appliedCategory].plural}`
      : 'No recipients selected';
  };

  const filteredUsers = availableUsers.filter((user: RecipientUser) =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const insightsBanner = (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-primary">
          <Target className="h-4 w-4" />
          Audience Insights
        </CardTitle>
        <CardDescription className="text-xs text-primary/80">
          Estimated reach uses active employee data from the last sync.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        {insights.loading ? (
          <Skeleton className="h-14 rounded-md" />
        ) : (
          <div className="rounded-lg border border-primary/30 bg-background px-3 py-2">
            <p className="text-xs text-muted-foreground">Estimated reach</p>
            <p className="text-lg font-semibold text-primary">{insights.estimatedReach}</p>
          </div>
        )}

        {insights.loading ? (
          <Skeleton className="h-14 rounded-md" />
        ) : (
          <div className="rounded-lg border border-primary/30 bg-background px-3 py-2">
            <p className="text-xs text-muted-foreground">Total employees</p>
            <p className="text-lg font-semibold">{insights.totalEmployees}</p>
          </div>
        )}

        {insights.loading ? (
          <Skeleton className="h-14 rounded-md" />
        ) : (
          <div className="rounded-lg border border-primary/30 bg-background px-3 py-2">
            <p className="text-xs text-muted-foreground">Active filters</p>
            <p className="text-lg font-semibold">{insights.activeFilters}</p>
          </div>
        )}

        {!insights.loading && insights.actionItems.length > 0 && (
          <div className="col-span-full space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              Review before publishing
            </div>
            <ul className="list-disc space-y-1 pl-4">
              {insights.actionItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const segmentSuggestions = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Suggested Segments</CardTitle>
        <CardDescription className="text-xs">Pull in frequent audiences with one click.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {insights.loading && <Skeleton className="h-8 w-32 rounded-full" />}
        {!insights.loading && insights.segments.length === 0 && (
          <p className="text-xs text-muted-foreground">No suggestions yet—adjust filters to see recommendations.</p>
        )}
        {insights.segments.map((segment) => (
          <Button
            key={`${segment.type}:${segment.id}`}
            variant="secondary"
            size="sm"
            onClick={() => toggleTarget(segment.id, segment.type)}
          >
            {segment.name}
            <Badge variant="outline" className="ml-2">
              {segment.count}
            </Badge>
          </Button>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="mb-2 text-lg font-semibold">Select Recipients</h3>
        <p className="text-muted-foreground">Choose who should receive this update and confirm their reach.</p>
      </div>

      {insightsBanner}
      {segmentSuggestions}

      {/* Recipient Type Selection */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            formData.recipients.type === 'all' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleRecipientTypeChange('all')}
        >
          <CardContent className="p-4 text-center">
            <Globe className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <h4 className="font-semibold">All Employees</h4>
            <p className="text-sm text-muted-foreground">Everyone in company</p>
            {formData.recipients.type === 'all' && <Badge variant="default" className="mt-2">Selected</Badge>}
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            formData.recipients.type === 'departments' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleRecipientTypeChange('departments')}
        >
          <CardContent className="p-4 text-center">
            <Building className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <h4 className="font-semibold">Departments</h4>
            <p className="text-sm text-muted-foreground">Select by department</p>
            {formData.recipients.type === 'departments' && <Badge variant="default" className="mt-2">Selected</Badge>}
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            formData.recipients.type === 'roles' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleRecipientTypeChange('roles')}
        >
          <CardContent className="p-4 text-center">
            <UserCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <h4 className="font-semibold">Roles</h4>
            <p className="text-sm text-muted-foreground">Select by role</p>
            {formData.recipients.type === 'roles' && <Badge variant="default" className="mt-2">Selected</Badge>}
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            formData.recipients.type === 'individuals' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleRecipientTypeChange('individuals')}
        >
          <CardContent className="p-4 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <h4 className="font-semibold">Individuals</h4>
            <p className="text-sm text-muted-foreground">Select specific users</p>
            {formData.recipients.type === 'individuals' && <Badge variant="default" className="mt-2">Selected</Badge>}
          </CardContent>
        </Card>
      </div>

      {/* Selection Details */}
      {formData.recipients.type !== 'all' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {/* Departments Selection */}
            {formData.recipients.type === 'departments' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Departments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(insights.segments.filter((segment) => segment.type === 'departments').length > 0
                    ? insights.segments.filter((segment) => segment.type === 'departments')
                    : STATIC_DEPARTMENTS
                  ).map((dept) => {
                    const id = (dept as any).id;
                    const name = (dept as any).name;
                    const count = 'count' in dept ? (dept as any).count : undefined;

                    return (
                      <div key={`department-${id}`} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={isTargetSelected(id, 'departments')}
                            onCheckedChange={() => toggleTarget(id, 'departments')}
                          />
                          <span className="font-medium">{name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {count !== undefined ? `${count} employees` : 'Connect a directory to view counts'}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Roles Selection */}
            {formData.recipients.type === 'roles' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Roles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(insights.segments.filter((segment) => segment.type === 'roles').length > 0
                    ? insights.segments filter((segment) => segment.type === 'roles')
                    : STATIC_ROLES
                  ).map((role) => {
                    const id = (role as any).id;
                    const name = (role as any).name;
                    const count = 'count' in role ? (role]
