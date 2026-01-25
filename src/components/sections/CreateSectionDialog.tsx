import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCustomSections } from '@/hooks/useCustomSections';
import { useToast } from '@/hooks/use-toast';
import * as Icons from 'lucide-react';
import { logger } from '@/utils/logger';

const createSectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  description: z.string().optional(),
  icon: z.string().min(1, 'Icon is required'),
  category: z.enum(['communication', 'operations', 'hr', 'custom']),
  path: z.string().min(1, 'Path is required').regex(/^\/[a-z0-9-]+$/, 'Path must start with / and contain only lowercase letters, numbers, and hyphens'),
});

type CreateSectionForm = z.infer<typeof createSectionSchema>;

interface CreateSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (section: any) => void;
}

const commonIcons = [
  'FileText', 'Users', 'Calendar', 'MessageSquare', 'CheckSquare', 'Settings',
  'Bell', 'Star', 'Target', 'Package', 'Award', 'Briefcase', 'Clock', 'Heart',
  'Shield', 'BookOpen', 'Camera', 'Phone', 'Mail', 'Globe', 'Home', 'Search'
];

const categories = [
  { value: 'communication', label: 'Communication' },
  { value: 'operations', label: 'Operations' },
  { value: 'hr', label: 'HR & People' },
  { value: 'custom', label: 'Custom' }
];

export function CreateSectionDialog({ open, onOpenChange, onSuccess }: CreateSectionDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { createSection } = useCustomSections();
  const { toast } = useToast();

  const form = useForm<CreateSectionForm>({
    resolver: zodResolver(createSectionSchema),
    defaultValues: {
      name: '',
      description: '',
      icon: 'FileText',
      category: 'custom',
      path: '',
    },
  });

  const handleSubmit = async (data: CreateSectionForm) => {
    setIsCreating(true);
    try {
      const createdSection = await createSection({
        name: data.name,
        description: data.description,
        icon: data.icon,
        category: data.category as any,
        path: data.path,
        permissions: ['viewOwnProfile'], // Default permission
      });

      toast({
        title: "Section Created",
        description: `${data.name} has been created successfully`,
      });

      form.reset();
      onSuccess?.(createdSection);
    } catch (error) {
      logger.error('Error creating section:', { error, tags: ['error'] });
    } finally {
      setIsCreating(false);
    }
  };

  const generatePath = (name: string) => {
    const path = '/' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    form.setValue('path', path);
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : <Icons.FileText className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Custom Section</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="My Custom Section" 
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        generatePath(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of this section" 
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue>
                            <div className="flex items-center space-x-2">
                              {getIcon(field.value)}
                              <span>{field.value}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {commonIcons.map((icon) => (
                          <SelectItem key={icon} value={icon}>
                            <div className="flex items-center space-x-2">
                              {getIcon(icon)}
                              <span>{icon}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Path</FormLabel>
                  <FormControl>
                    <Input placeholder="/my-section" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isCreating}
                className="flex-1"
              >
                {isCreating ? 'Creating...' : 'Create Section'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}