import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Palette, Type, Image, Sparkles } from 'lucide-react';

import type { WizardFormData } from '../CreateUpdateWizard';
import { GRADIENT_PRESETS, BACKGROUND_PATTERNS } from '@/data/updateTemplates';
import { CompanyUpdatePreview } from '@/features/company-updates/wizard/CompanyUpdatePreview';

interface DesignContentStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
  previewDevice?: 'desktop' | 'mobile';
  onPreviewDeviceChange?: (device: 'desktop' | 'mobile') => void;
}

export function DesignContentStep({
  formData,
  updateFormData,
  previewDevice = 'desktop',
  onPreviewDeviceChange,
}: DesignContentStepProps) {
  const [activeTab, setActiveTab] = useState('content');

  const updateBackgroundStyle = (updates: Partial<typeof formData.backgroundStyle>) => {
    updateFormData({
      backgroundStyle: { ...formData.backgroundStyle, ...updates },
    });
  };

  const handleGradientPreset = (preset: typeof GRADIENT_PRESETS[number]) => {
    updateBackgroundStyle({
      type: 'gradient',
      primary: preset.primary,
      secondary: preset.secondary,
    });
  };

  const deviceToggle = useMemo(
    () => (
      <div className="inline-flex items-center gap-1 rounded-full border bg-background p-1 text-xs shadow-sm">
        <Button
          type="button"
          variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
          size="sm"
          className="h-7 px-3"
          onClick={() => onPreviewDeviceChange?.('desktop')}
        >
          Desktop
        </Button>
        <Button
          type="button"
          variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
          size="sm"
          className="h-7 px-3"
          onClick={() => onPreviewDeviceChange?.('mobile')}
        >
          Mobile
        </Button>
      </div>
    ),
    [previewDevice, onPreviewDeviceChange],
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="mb-2 text-lg font-semibold">Design & Content</h3>
        <p className="text-muted-foreground">Craft the message and see how it renders in real time.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content">
                <Type className="mr-2 h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger value="design">
                <Palette className="mr-2 h-4 w-4" />
                Design
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateFormData({ title: e.target.value })}
                  placeholder="Enter your update title..."
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">{formData.title.length}/100 characters</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value) => updateFormData({ type: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="policy">Policy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => updateFormData({ priority: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => updateFormData({ content: e.target.value })}
                  placeholder="Write your update content here..."
                  rows={8}
                  className="resize-none"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formData.content.length}/1000 characters</span>
                  <Button variant="outline" size="sm" className="h-6">
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI Enhance
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  value={formData.category || ''}
                  onChange={(e) => updateFormData({ category: e.target.value })}
                  placeholder="e.g., HR, Operations, General..."
                />
              </div>
            </TabsContent>

            <TabsContent value="design" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Background Style</Label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <Button
                      variant={formData.backgroundStyle.type === 'solid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateBackgroundStyle({ type: 'solid' })}
                    >
                      Solid
                    </Button>
                    <Button
                      variant={formData.backgroundStyle.type === 'gradient' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateBackgroundStyle({ type: 'gradient' })}
                    >
                      Gradient
                    </Button>
                    <Button
                      variant={formData.backgroundStyle.type === 'pattern' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateBackgroundStyle({ type: 'pattern' })}
                    >
                      Pattern
                    </Button>
                  </div>
                </div>

                {formData.backgroundStyle.type === 'gradient' && (
                  <div>
                    <Label className="text-sm font-medium">Gradient Presets</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {GRADIENT_PRESETS.map((preset) => (
                        <Button
                          key={preset.name}
                          variant="outline"
                          size="sm"
                          onClick={() => handleGradientPreset(preset)}
                          className="justify-start p-2"
                        >
                          <div
                            className="mr-2 h-4 w-4 rounded"
                            style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}
                          />
                          <span className="text-xs">{preset.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {formData.backgroundStyle.type === 'pattern' && (
                  <div>
                    <Label className="text-sm font-medium">Pattern</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {BACKGROUND_PATTERNS.map((pattern) => (
                        <Button
                          key={pattern.id}
                          variant={formData.backgroundStyle.pattern === pattern.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateBackgroundStyle({ pattern: pattern.id as any })}
                        >
                          {pattern.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="mt-1 flex gap-2">
                      <input
                        id="primary-color"
                        type="color"
                        value={formData.backgroundStyle.primary}
                        onChange={(e) => updateBackgroundStyle({ primary: e.target.value })}
                        className="h-10 w-12 rounded border"
                      />
                      <Input
                        value={formData.backgroundStyle.primary}
                        onChange={(e) => updateBackgroundStyle({ primary: e.target.value })}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {formData.backgroundStyle.type === 'gradient' && (
                    <div>
                      <Label htmlFor="secondary-color">Secondary Color</Label>
                      <div className="mt-1 flex gap-2">
                        <input
                          id="secondary-color"
                          type="color"
                          value={formData.backgroundStyle.secondary || '#1e40af'}
                          onChange={(e) => updateBackgroundStyle({ secondary: e.target.value })}
                          className="h-10 w-12 rounded border"
                        />
                        <Input
                          value={formData.backgroundStyle.secondary || '#1e40af'}
                          onChange={(e) => updateBackgroundStyle({ secondary: e.target.value })}
                          placeholder="#1e40af"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Card className="border-dashed">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Image className="h-4 w-4" />
                Media & Attachments
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                Manage library
              </Button>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Upload hero images, resources or attach files to your update. Attachment support will be available in the next iteration.
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium">Live preview</CardTitle>
              {deviceToggle}
            </CardHeader>
            <CardContent>
              <CompanyUpdatePreview data={formData} device={previewDevice} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Quick Highlights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Characters remaining</span>
                <span>{Math.max(0, 1000 - formData.content.length)}</span>
              </div>
              <div className="flex justify-between">
                <span>Priority</span>
                <Badge variant="outline" className="capitalize">
                  {formData.priority}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Template</span>
                <span>{formData.template ? formData.template.name : 'Custom'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
