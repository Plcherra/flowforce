import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import CreateFormDialog from '@/components/forms/CreateFormDialog';
import FormBuilderDialog from '@/components/forms/FormBuilderDialog';
import FormFillDialog from '@/components/forms/FormFillDialog';
import FormFieldTest from '@/components/forms/FormFieldTest';
import FormsSection from '@/components/forms/FormsSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useCan } from '@/hooks/useCan';
import { useForms } from '@/hooks/useForms';
import type { FormWithMeta } from '@/hooks/useForms';

const matchesQuery = (form: FormWithMeta, query: string) => {
  if (!query) return true;
  const searchable = [form.title, form.description, form.department?.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return searchable.includes(query.toLowerCase());
};

export default function Forms() {
  const { user } = useAuth();
  const { can: canUse } = useCan();
  const { forms, loading } = useForms();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [builderDialogOpen, setBuilderDialogOpen] = useState(false);
  const [fillDialogOpen, setFillDialogOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const canCreateForms = canUse('createForms');

  const filteredForms = useMemo(() => {
    return forms.filter((form) => {
      if (statusFilter !== 'all' && form.status !== statusFilter) {
        return false;
      }
      return matchesQuery(form, query.trim());
    });
  }, [forms, statusFilter, query]);

  const sections = useMemo(() => {
    const myForms = filteredForms.filter((form) => form.created_by === user?.id && form.status !== 'archived');
    const teamForms = filteredForms.filter((form) => form.created_by !== user?.id && form.status !== 'archived');
    const archivedForms = filteredForms.filter((form) => form.status === 'archived');

    return [
      {
        key: 'my',
        title: 'My Forms',
        forms: myForms,
        emptyMessage: canCreateForms
          ? 'You have no forms yet. Create one to get started.'
          : 'No forms available.',
      },
      {
        key: 'team',
        title: 'Team Forms',
        forms: teamForms,
        emptyMessage: 'No shared forms yet.',
      },
      {
        key: 'archived',
        title: 'Archived Forms',
        forms: archivedForms,
        emptyMessage: 'No archived forms.',
      },
    ];
  }, [filteredForms, user?.id, canCreateForms]);

  const handleOpenBuilder = (formId: string) => {
    setSelectedFormId(formId);
    setBuilderDialogOpen(true);
  };

  const handleOpenFill = (formId: string) => {
    setSelectedFormId(formId);
    setFillDialogOpen(true);
  };

  return (
    <div className="space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Forms</h1>
          <p className="text-sm text-muted-foreground">Create and manage data collection forms</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search forms..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          {canCreateForms && (
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New form
            </Button>
          )}
          <Button variant="outline" onClick={() => setTestDialogOpen(true)}>
            Test fields
          </Button>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
        <TabsList className="w-full max-w-md justify-start">
          <TabsTrigger value="all">All forms</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
        </TabsList>

        {(['all', 'published', 'draft'] as const).map((value) => (
          <TabsContent key={value} value={value} className="space-y-6 pt-4">
            {statusFilter === value &&
              sections.map((section) => (
                <FormsSection
                  key={section.key}
                  title={section.title}
                  forms={section.forms}
                  loading={loading}
                  emptyMessage={section.emptyMessage}
                  onFill={handleOpenFill}
                  onEdit={handleOpenBuilder}
                />
              ))}
          </TabsContent>
        ))}
      </Tabs>

      <CreateFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onFormCreated={(formId) => {
          setSelectedFormId(formId);
          setBuilderDialogOpen(true);
        }}
      />

      <FormFieldTest open={testDialogOpen} onOpenChange={setTestDialogOpen} />

      {selectedFormId && (
        <>
          <FormBuilderDialog open={builderDialogOpen} onOpenChange={setBuilderDialogOpen} formId={selectedFormId} />
          <FormFillDialog
            open={fillDialogOpen}
            onOpenChange={setFillDialogOpen}
            formId={selectedFormId}
            onSubmitted={() => setFillDialogOpen(false)}
          />
        </>
      )}
    </div>
  );
}
