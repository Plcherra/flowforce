import { useEffect, useMemo, useState } from 'react';
import { Shield, RotateCcw, Save, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useCompanyRoles } from '@/hooks/useCompanyRoles';
import {
  useUserPermissionOverrides,
  useUserEffectivePermissions,
  useSaveUserPermissions,
  useUpdateUserRole,
  PERMISSION_KEYS,
  type PermissionKey,
} from '@/hooks/useUserPermissions';
import { logger } from '@/utils/logger';
  type PermissionValue,
} from '@/hooks/useUserPermissions';
import { PERMISSIONS_BY_CATEGORY } from '@/lib/permissions/registry';
import type { Tables } from '@/integrations/supabase/public-types';

type Profile = Tables<'profiles'>;

interface UserPermissionsTabProps {
  user: Profile;
}

const CATEGORIES_PER_PAGE = 3;

export function UserPermissionsTab({ user }: UserPermissionsTabProps) {
  const { roles } = useCompanyRoles();
  const { data: overrides } = useUserPermissionOverrides(user.id);
  const { data: effectivePermissions } = useUserEffectivePermissions(user.id, user.role_id);
  const savePermissions = useSaveUserPermissions();
  const updateUserRole = useUpdateUserRole();

  const permissionGroups = useMemo(
    () =>
      Object.entries(PERMISSIONS_BY_CATEGORY).map(([category, permissions]) => ({
        category,
        permissions: permissions.slice(),
      })),
    []
  );

  const [selectedRoleId, setSelectedRoleId] = useState(user.role_id || '');
  const [permissionOverrides, setPermissionOverrides] = useState<Record<PermissionKey, PermissionValue>>(() =>
    PERMISSION_KEYS.reduce((acc, key) => {
      acc[key] = 'inherit';
      return acc;
    }, {} as Record<PermissionKey, PermissionValue>)
  );
  const [hasChanges, setHasChanges] = useState(false);

  const [page, setPage] = useState(1);
  const totalCategories = permissionGroups.length;
  const totalPages = Math.max(1, Math.ceil(totalCategories / CATEGORIES_PER_PAGE));

  useEffect(() => {
    setSelectedRoleId(user.role_id || '');
  }, [user.role_id]);

  // Initialize permission overrides from existing data
  useEffect(() => {
    const overrideMap = PERMISSION_KEYS.reduce((acc, key) => {
      const override = overrides?.find((o) => o.permission_key === key);
      acc[key] = override ? override.permission_value : 'inherit';
      return acc;
    }, {} as Record<PermissionKey, PermissionValue>);

    setPermissionOverrides(overrideMap);
    setHasChanges(false);
  }, [overrides]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * CATEGORIES_PER_PAGE;
    return permissionGroups.slice(start, start + CATEGORIES_PER_PAGE);
  }, [permissionGroups, page]);

  const [openCategories, setOpenCategories] = useState<string[]>(() =>
    paginatedGroups.length ? [paginatedGroups[0].category] : []
  );

  useEffect(() => {
    if (paginatedGroups.length === 0) {
      setOpenCategories([]);
    } else {
      setOpenCategories([paginatedGroups[0].category]);
    }
  }, [paginatedGroups]);

  const handleRoleChange = async (roleId: string) => {
    const role = roles?.find((r) => r.id === roleId);
    if (!role) return;

    setSelectedRoleId(roleId);
    setHasChanges(true);
  };

  const handlePermissionChange = (key: PermissionKey, value: PermissionValue) => {
    setPermissionOverrides((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const handleResetToDefaults = () => {
    const resetOverrides = PERMISSION_KEYS.reduce((acc, key) => {
      acc[key] = 'inherit';
      return acc;
    }, {} as Record<PermissionKey, PermissionValue>);
    setPermissionOverrides(resetOverrides);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      if (selectedRoleId !== user.role_id && selectedRoleId) {
        const selectedRole = roles?.find((r) => r.id === selectedRoleId);
        if (selectedRole) {
          await updateUserRole.mutateAsync({
            userId: user.id,
            roleId: selectedRoleId,
            role: selectedRole.name.toLowerCase() as
              | 'admin'
              | 'manager'
              | 'employee'
              | 'staff'
              | 'supervisor'
              | 'owner',
          });
        }
      }

      await savePermissions.mutateAsync({
        userId: user.id,
        permissions: permissionOverrides,
      });

      setHasChanges(false);
    } catch (error) {
      logger.error('Error saving changes:', { error, tags: ['error'] });
    }
  };

  const getPermissionIcon = (source: 'role' | 'allow_override' | 'deny_override', effective: boolean) => {
    if (source === 'allow_override') {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (source === 'deny_override') {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return <Circle className={`h-4 w-4 ${effective ? 'text-green-600' : 'text-muted-foreground'}`} />;
  };

  const SOURCE_LABELS: Record<'role' | 'allow_override' | 'deny_override', string> = {
    role: 'Role Default',
    allow_override: 'Override (Allow)',
    deny_override: 'Override (Deny)',
  };

  const SOURCE_VARIANTS: Record<'role' | 'allow_override' | 'deny_override', 'default' | 'secondary' | 'destructive' | 'outline'> =
    {
      role: 'outline',
      allow_override: 'default',
      deny_override: 'destructive',
    };

  const selectedRole = roles?.find((r) => r.id === selectedRoleId);
  const startCategoryIndex = (page - 1) * CATEGORIES_PER_PAGE + 1;
  const endCategoryIndex = Math.min(page * CATEGORIES_PER_PAGE, totalCategories);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Select value={selectedRoleId} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color }} />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleResetToDefaults} disabled={!hasChanges}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>

          {selectedRole && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">{selectedRole.name}</p>
              <p className="text-sm text-muted-foreground">{selectedRole.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permission Overrides</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage granular overrides by category. Use pagination and the accordion to focus on the policies you need.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion
            type="multiple"
            value={openCategories}
            onValueChange={(value) => setOpenCategories(value as string[])}
            className="overflow-hidden rounded-md border"
          >
            {paginatedGroups.map(({ category, permissions }) => {
              const overrideCount = permissions.reduce((acc, definition) => {
                const overrideValue = permissionOverrides[definition.key] ?? 'inherit';
                return overrideValue === 'inherit' ? acc : acc + 1;
              }, 0);

              return (
                <AccordionItem key={category} value={category} className="border-b last:border-b-0">
                  <AccordionTrigger className="px-4 py-3 text-left">
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {category}
                      </span>
                      {overrideCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {overrideCount} override{overrideCount === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0">
                    <div className="px-4 pb-4">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[40%]">Permission</TableHead>
                              <TableHead className="w-[20%] text-center">Override</TableHead>
                              <TableHead className="w-[20%] text-center">Effective</TableHead>
                              <TableHead className="w-[20%]">Source</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {permissions.map((definition) => {
                              const overrideValue = permissionOverrides[definition.key] ?? 'inherit';
                              const effectivePermission = effectivePermissions?.find((p) => p.key === definition.key);
                              const source = effectivePermission?.source ?? 'role';
                              const effective = effectivePermission?.effective ?? false;

                              return (
                                <TableRow key={definition.key}>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium">{definition.label}</p>
                                        {definition.legacy && (
                                          <Badge variant="secondary" className="text-[10px] uppercase">
                                            Legacy
                                          </Badge>
                                        )}
                                        {definition.module && (
                                          <Badge variant="outline" className="text-[10px] uppercase">
                                            {definition.module}
                                          </Badge>
                                        )}
                                      </div>
                                      {definition.description && (
                                        <p className="text-xs text-muted-foreground">{definition.description}</p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Select
                                      value={overrideValue}
                                      onValueChange={(value: PermissionValue) => handlePermissionChange(definition.key, value)}
                                    >
                                      <SelectTrigger className="mx-auto w-[120px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="inherit">Inherit</SelectItem>
                                        <SelectItem value="allow">Allow</SelectItem>
                                        <SelectItem value="deny">Deny</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      {getPermissionIcon(source, effective)}
                                      <Badge variant={effective ? 'default' : 'secondary'}>
                                        {effective ? 'Allowed' : 'Denied'}
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={SOURCE_VARIANTS[source]}>{SOURCE_LABELS[source]}</Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <span className="text-sm text-muted-foreground">
                Viewing categories {startCategoryIndex}–{endCategoryIndex} of {totalCategories}
              </span>
              <Pagination className="ml-auto w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      onClick={(event) => {
                        event.preventDefault();
                        if (page > 1) {
                          setPage((prev) => Math.max(1, prev - 1));
                        }
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          isActive={pageNumber === page}
                          onClick={(event) => {
                            event.preventDefault();
                            setPage(pageNumber);
                          }}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      onClick={(event) => {
                        event.preventDefault();
                        if (page < totalPages) {
                          setPage((prev) => Math.min(totalPages, prev + 1));
                        }
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!hasChanges || savePermissions.isPending || updateUserRole.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {savePermissions.isPending || updateUserRole.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
