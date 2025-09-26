
import { useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, UserPlus, Mail, Phone, Building2, Download, Filter, MoreHorizontal, Truck } from 'lucide-react';
import { useInventorySuppliers, useCreateSupplier, InventorySupplier } from '@/hooks/useInventory';
import { UserProfileDrawer } from '@/components/users/UserProfileDrawer';
import type { Tables } from '@/integrations/supabase/types';
import { mockDepartments, mockEmployees } from '@/data/mockEmployees';

type Profile = Tables<'profiles'>;
type Department = Tables<'departments'>;

export default function Employees() {
  const isMobile = useIsMobile();
  const { profile: currentUserProfile } = useProfile();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'managers' | 'inactive' | 'vendors'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddVendorDialog, setShowAddVendorDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  // Vendor hooks
  const { data: vendors, isLoading: vendorsLoading } = useInventorySuppliers();
  const createVendor = useCreateSupplier();

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVendor.mutateAsync(vendorForm);
      setShowAddVendorDialog(false);
      setVendorForm({
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating vendor:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name');

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        setEmployees(mockEmployees);
        return;
      }

      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees(mockEmployees);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*');

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        setDepartments(mockDepartments);
        return;
      }

      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments(mockDepartments);
    }
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return 'Unassigned';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'Unknown Department';
  };

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.toLowerCase();
    let list = employees.filter(employee =>
      `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(term) ||
      employee.email.toLowerCase().includes(term) ||
      (employee.employee_id?.toLowerCase().includes(term) ?? false)
    );

    if (activeTab === 'managers') {
      list = list.filter(e => ['manager', 'admin'].includes(e.role));
    } else if (activeTab === 'inactive') {
      list = list.filter(e => e.employment_status !== 'active');
    }

    if (departmentFilter !== 'all') {
      list = list.filter(e => e.department_id === departmentFilter);
    }
    return list;
  }, [employees, searchTerm, activeTab, departmentFilter]);

  // Filtered vendors for vendors tab
  const filteredVendors = useMemo(() => {
    if (activeTab !== 'vendors') return [];
    const term = searchTerm.toLowerCase();
    return vendors?.filter(vendor =>
      vendor.name.toLowerCase().includes(term) ||
      vendor.contact_name?.toLowerCase().includes(term) ||
      vendor.email?.toLowerCase().includes(term)
    ) || [];
  }, [vendors, searchTerm, activeTab]);

  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  const paginatedVendors = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredVendors.slice(start, start + pageSize);
  }, [filteredVendors, page, pageSize]);

  const totalPages = activeTab === 'vendors' 
    ? Math.max(1, Math.ceil(filteredVendors.length / pageSize))
    : Math.max(1, Math.ceil(filteredEmployees.length / pageSize));

  const canManageEmployees = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'manager';

  return (
    <div>
      <div className={`${isMobile ? 'p-4 space-y-4' : 'p-6 space-y-6'}`}>
        {/* Header */}
        <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center justify-between'}`}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900`}>Team Directory</h1>
            <p className="text-gray-600 mt-1">
              Browse, filter and export your company roster
            </p>
          </div>
          {canManageEmployees && (
            <>
              {activeTab === 'vendors' ? (
                <Dialog open={showAddVendorDialog} onOpenChange={setShowAddVendorDialog}>
                  <DialogTrigger asChild>
                    <Button size={isMobile ? 'sm' : 'default'}>
                      <Truck className="mr-2 h-4 w-4" />
                      {isMobile ? 'Add' : 'Add Vendor'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add New Vendor</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateVendor} className="space-y-4">
                      <div>
                        <Label htmlFor="vendor-name">Company Name *</Label>
                        <Input
                          id="vendor-name"
                          value={vendorForm.name}
                          onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-name">Contact Name</Label>
                        <Input
                          id="contact-name"
                          value={vendorForm.contact_name}
                          onChange={(e) => setVendorForm({ ...vendorForm, contact_name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="vendor-email">Email</Label>
                          <Input
                            id="vendor-email"
                            type="email"
                            value={vendorForm.email}
                            onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="vendor-phone">Phone</Label>
                          <Input
                            id="vendor-phone"
                            value={vendorForm.phone}
                            onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="vendor-address">Address</Label>
                        <Textarea
                          id="vendor-address"
                          value={vendorForm.address}
                          onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="vendor-notes">Notes</Label>
                        <Textarea
                          id="vendor-notes"
                          value={vendorForm.notes}
                          onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowAddVendorDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createVendor.isPending}>
                          {createVendor.isPending ? 'Adding...' : 'Add Vendor'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button size={isMobile ? 'sm' : 'default'}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {isMobile ? 'Add' : 'Add Employee'}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Toolbar */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="all">All ({employees.length})</TabsTrigger>
                  <TabsTrigger value="managers">Leads ({employees.filter(e => ['manager','admin'].includes(e.role)).length})</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive ({employees.filter(e => e.employment_status !== 'active').length})</TabsTrigger>
                  <TabsTrigger value="vendors">Vendors</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:flex-initial md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search name, email, or ID"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                      className="pl-10"
                    />
                  </div>

                  <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="whitespace-nowrap">
                        <Download className="mr-2 h-4 w-4" /> Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportCSV(filteredEmployees)}>
                        CSV (filtered)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportCSV(employees)}>
                        CSV (all)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Content for different tabs */}
              <TabsContent value={activeTab}>
                {activeTab === 'vendors' ? (
                  // Vendors table
                  vendorsLoading ? (
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 w-full bg-muted/40 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[30%]">Company Name</TableHead>
                            <TableHead className="hidden md:table-cell">Contact</TableHead>
                            <TableHead className="hidden md:table-cell">Email</TableHead>
                            <TableHead className="hidden md:table-cell">Phone</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedVendors.map((vendor) => (
                            <TableRow key={vendor.id} className="hover:bg-muted/30">
                              <TableCell>
                                <div className="flex items-center gap-3 min-w-0">
                                  <Avatar className="h-9 w-9">
                                    <AvatarFallback className="bg-orange-100 text-orange-600">
                                      <Truck className="h-4 w-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">
                                      {vendor.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      Vendor
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {vendor.contact_name || '—'}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate">{vendor.email || '—'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span>{vendor.phone || '—'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" aria-label="More">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        {filteredVendors.length === 0 && !vendorsLoading && (
                          <TableCaption>No vendors match your filters.</TableCaption>
                        )}
                      </Table>
                    </div>
                  )
                ) : (
                  // Employees table
                  loading ? (
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 w-full bg-muted/40 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[42%] md:w-[30%]">Name</TableHead>
                          <TableHead className="hidden md:table-cell">Role</TableHead>
                          <TableHead className="hidden md:table-cell">Department</TableHead>
                          <TableHead className="hidden md:table-cell">Hire Date</TableHead>
                          <TableHead className="hidden md:table-cell">Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedEmployees.map((employee) => (
                          <TableRow key={employee.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={employee.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {employee.first_name[0]}
                                    {employee.last_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="font-medium truncate">
                                    {employee.first_name} {employee.last_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{employee.email}</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell capitalize">
                              <Badge variant="outline">{employee.role}</Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span>{getDepartmentName(employee.department_id)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant={employee.employment_status === 'active' ? 'default' : 'secondary'}>
                                {employee.employment_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                  setSelectedUser(employee);
                                  setShowUserProfile(true);
                                }}
                                aria-label="View Profile"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      {filteredEmployees.length === 0 && !loading && (
                        <TableCaption>No employees match your filters.</TableCaption>
                      )}
                    </Table>
                    </div>
                  )
                )}
              </TabsContent>
            </Tabs>

            {/* Pagination controls */}
            {((activeTab === 'vendors' ? filteredVendors.length : filteredEmployees.length) > 0) && (
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, activeTab === 'vendors' ? filteredVendors.length : filteredEmployees.length)} of {activeTab === 'vendors' ? filteredVendors.length : filteredEmployees.length}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                    <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50].map((s) => (
                        <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
                        const idx = i + 1; // simple first-5 pager
                        return (
                          <PaginationItem key={idx}>
                            <PaginationLink 
                              isActive={idx === page} 
                              onClick={() => setPage(idx)}
                              className="cursor-pointer"
                            >
                              {idx}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Team Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-4 gap-4'} text-center`}>
              <div>
                <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
                <div className="text-sm text-gray-600">People</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {employees.filter(e => e.employment_status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {employees.filter(e => ['manager','admin'].includes(e.role)).length}
                </div>
                <div className="text-sm text-gray-600">Leads</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {departments.length}
                </div>
                <div className="text-sm text-gray-600">Departments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Profile Drawer */}
        <UserProfileDrawer
          user={selectedUser}
          open={showUserProfile}
          onOpenChange={setShowUserProfile}
        />
      </div>
    </div>
  );
}

// Helpers
function exportCSV(data: Profile[]) {
  const headers = [
    'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Department ID', 'Employee ID', 'Hire Date'
  ];
  const rows = data.map(e => [
    e.first_name,
    e.last_name,
    e.email,
    e.role,
    e.employment_status,
    e.department_id ?? '',
    e.employee_id ?? '',
    e.hire_date ? new Date(e.hire_date).toISOString().split('T')[0] : ''
  ]);

  const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
