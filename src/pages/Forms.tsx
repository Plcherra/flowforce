import React, { useState } from 'react';
import { Plus, FileText, Eye, Edit, Trash2, Download, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForms } from '@/hooks/useForms';
import { useAuth } from '@/hooks/useAuth';
import { useCan } from '@/hooks/useCan';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsMobile } from '@/hooks/use-mobile';

import CreateFormDialog from '@/components/forms/CreateFormDialog';
import FormBuilderDialog from '@/components/forms/FormBuilderDialog';
import FormSubmissionsDialog from '@/components/forms/FormSubmissionsDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import FormFieldTest from '@/components/forms/FormFieldTest';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Forms() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { can, hasRole } = usePermissions();
  const { can: canUse } = useCan();
  const { forms, loading, deleteForm, updateForm } = useForms();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [builderDialogOpen, setBuilderDialogOpen] = useState(false);
  const [submissionsDialogOpen, setSubmissionsDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const canCreateForms = canUse('createForms');
  const canManageForms = canUse('manageForms');
  const canManageSections = canUse('systemSettings') || hasRole(['company_admin', 'owner', 'admin']);

  const handleEditForm = (formId: string) => {
    setSelectedFormId(formId);
    setBuilderDialogOpen(true);
  };

  const handleViewSubmissions = (formId: string) => {
    setSelectedFormId(formId);
    setSubmissionsDialogOpen(true);
  };

  const handleDeleteForm = async (formId: string) => {
    await deleteForm(formId);
  };

  const handlePublishForm = async (formId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    await updateForm(formId, { status: newStatus });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter forms based on user permissions
  const myForms = forms.filter(form => form.created_by === user?.id);
  const publishedForms = forms.filter(form => form.status === 'published');
  const allForms = canManageForms ? forms : [...myForms, ...publishedForms.filter(f => !myForms.find(mf => mf.id === f.id))];

  return (
    <div>
      <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
        <div className={`${isMobile ? 'flex flex-col space-y-3 px-4 py-3' : 'flex justify-between items-center'}`}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Forms</h1>
            <p className="text-muted-foreground">Create and manage data collection forms</p>
          </div>
          {canCreateForms && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setTestDialogOpen(true)}
                size={isMobile ? "sm" : "default"}
              >
                Test Fields
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)} size={isMobile ? "sm" : "default"}>
                <Plus className="h-4 w-4 mr-2" />
                {isMobile ? 'New' : 'Create Form'}
              </Button>
            </div>
          )}
        </div>


        <div className={isMobile ? 'px-4' : ''}>
          <Tabs defaultValue="my-forms" className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
            <TabsList className={isMobile ? 'grid w-full grid-cols-2' : ''}>
              <TabsTrigger value="my-forms">{isMobile ? 'My' : 'My Forms'}</TabsTrigger>
              <TabsTrigger value="published">{isMobile ? 'Available' : 'Available Forms'}</TabsTrigger>
              {canManageForms && <TabsTrigger value="all">{isMobile ? 'All' : 'All Forms'}</TabsTrigger>}
            </TabsList>

          <TabsContent value="my-forms" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading forms...</div>
            ) : myForms.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {canCreateForms 
                      ? "Create your first form to start collecting data"
                      : "You don't have permission to create forms"
                    }
                  </p>
                  {canCreateForms && (
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Form
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                {myForms.map((form) => (
                  <Card key={form.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{form.title}</CardTitle>
                          {form.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {form.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(form.status)}>
                            {form.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background border shadow-md">
                              <DropdownMenuItem onClick={() => handleViewSubmissions(form.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Submissions
                              </DropdownMenuItem>
                              {canManageForms && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEditForm(form.id)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Form
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePublishForm(form.id, form.status)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    {form.status === 'published' ? 'Unpublish' : 'Publish'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Form
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Form</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this form? This action cannot be undone and will also delete all submissions.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteForm(form.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        Created {new Date(form.created_at).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="published" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading forms...</div>
            ) : publishedForms.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No published forms</h3>
                  <p className="text-muted-foreground">
                    No forms are currently published and available for submissions
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                {publishedForms.map((form) => (
                   <Card key={form.id}>
                     <CardHeader>
                       <div className="flex justify-between items-start">
                         <div className="flex-1">
                           <CardTitle className="text-lg">{form.title}</CardTitle>
                           {form.description && (
                             <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                               {form.description}
                             </p>
                           )}
                         </div>
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                               <MoreVertical className="h-4 w-4" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="bg-background border shadow-md">
                             <DropdownMenuItem onClick={() => handleViewSubmissions(form.id)}>
                               <Eye className="h-4 w-4 mr-2" />
                               Fill Form
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                       </div>
                     </CardHeader>
                     <CardContent>
                       <div className="text-sm text-muted-foreground">
                         By {form.created_profile?.first_name} {form.created_profile?.last_name}
                       </div>
                     </CardContent>
                   </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {canManageForms && (
            <TabsContent value="all" className="space-y-4">
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                {allForms.map((form) => (
                   <Card key={form.id}>
                     <CardHeader>
                       <div className="flex justify-between items-start">
                         <div className="flex-1">
                           <CardTitle className="text-lg">{form.title}</CardTitle>
                           {form.description && (
                             <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                               {form.description}
                             </p>
                           )}
                         </div>
                         <div className="flex items-center gap-2">
                           <Badge className={getStatusColor(form.status)}>
                             {form.status}
                           </Badge>
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                 <MoreVertical className="h-4 w-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="bg-background border shadow-md">
                               <DropdownMenuItem onClick={() => handleViewSubmissions(form.id)}>
                                 <Eye className="h-4 w-4 mr-2" />
                                 View Submissions
                               </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleEditForm(form.id)}>
                                 <Edit className="h-4 w-4 mr-2" />
                                 Edit Form
                               </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handlePublishForm(form.id, form.status)}>
                                 <Download className="h-4 w-4 mr-2" />
                                 {form.status === 'published' ? 'Unpublish' : 'Publish'}
                               </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </div>
                       </div>
                     </CardHeader>
                     <CardContent>
                       <div className="text-sm text-muted-foreground">
                         By {form.created_profile?.first_name} {form.created_profile?.last_name}
                       </div>
                     </CardContent>
                   </Card>
                ))}
              </div>
            </TabsContent>
          )}
          </Tabs>
        </div>

        <CreateFormDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen}
          onFormCreated={(formId) => {
            setSelectedFormId(formId);
            setBuilderDialogOpen(true);
          }}
        />

        <FormFieldTest 
          open={testDialogOpen} 
          onOpenChange={setTestDialogOpen} 
        />

        {selectedFormId && (
          <>
            <FormBuilderDialog
              open={builderDialogOpen}
              onOpenChange={setBuilderDialogOpen}
              formId={selectedFormId}
            />
            <FormSubmissionsDialog
              open={submissionsDialogOpen}
              onOpenChange={setSubmissionsDialogOpen}
              formId={selectedFormId}
            />
          </>
        )}
      </div>
    </div>
  );
}
