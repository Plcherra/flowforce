import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Palette, Type, Image, Sparkles } from 'lucide-react';
import { WizardFormData } from '../CreateUpdateWizard';
import { GRADIENT_PRESETS, BACKGROUND_PATTERNS } from '@/data/updateTemplates';

interface DesignContentStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

export function DesignContentStep({ formData, updateFormData }: DesignContentStepProps) {
  const [activeTab, setActiveTab] = useState('content');

  const updateBackgroundStyle = (updates: Partial<typeof formData.backgroundStyle>) => {
    updateFormData({
      backgroundStyle: { ...formData.backgroundStyle, ...updates }
    });
  };

  const handleGradientPreset = (preset: typeof GRADIENT_PRESETS[0]) => {
    updateBackgroundStyle({
      type: 'gradient',
      primary: preset.primary,
      secondary: preset.secondary
    });
  };

  const getBackgroundPreview = () => {
    const { backgroundStyle } = formData;
    if (backgroundStyle.type === 'gradient') {
      return `linear-gradient(135deg, ${backgroundStyle.primary}, ${backgroundStyle.secondary})`;
    }
    return backgroundStyle.primary;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Design & Content</h3>
        <p className="text-muted-foreground">
          Customize the look and write your content
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Editor */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content">
                <Type className="h-4 w-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="design">
                <Palette className="h-4 w-4 mr-2" />
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
                <p className="text-xs text-muted-foreground">
                  {formData.title.length}/100 characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: any) => updateFormData({ type: value })}
                  >
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
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value: any) => updateFormData({ priority: value })}
                  >
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
                    <Sparkles className="h-3 w-3 mr-1" />
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
                  <div className="grid grid-cols-3 gap-2 mt-2">
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
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {GRADIENT_PRESETS.map((preset) => (
                        <Button
                          key={preset.name}
                          variant="outline"
                          size="sm"
                          onClick={() => handleGradientPreset(preset)}
                          className="justify-start p-2"
                        >
                          <div
                            className="w-4 h-4 rounded mr-2"
                            style={{ 
                              background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` 
                            }}
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
                    <div className="grid grid-cols-2 gap-2 mt-2">
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
                    <div className="flex gap-2 mt-1">
                      <input
                        id="primary-color"
                        type="color"
                        value={formData.backgroundStyle.primary}
                        onChange={(e) => updateBackgroundStyle({ primary: e.target.value })}
                        className="w-12 h-10 rounded border"
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
                      <div className="flex gap-2 mt-1">
                        <input
                          id="secondary-color"
                          type="color"
                          value={formData.backgroundStyle.secondary || '#1e40af'}
                          onChange={(e) => updateBackgroundStyle({ secondary: e.target.value })}
                          className="w-12 h-10 rounded border"
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
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Live Preview</Label>
          <Card className="overflow-hidden">
            <div
              className="h-32 p-4 text-white relative"
              style={{ background: getBackgroundPreview() }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10">
                <Badge variant="secondary" className="mb-2">
                  {formData.type}
                </Badge>
                <h4 className="font-semibold text-lg truncate">
                  {formData.title || 'Your Title Here'}
                </h4>
              </div>
            </div>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {formData.content || 'Your content will appear here...'}
              </p>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>Just now</span>
                <div className="flex gap-4">
                  <span>👍 0</span>
                  <span>💬 0</span>
                  <span>👁 0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}