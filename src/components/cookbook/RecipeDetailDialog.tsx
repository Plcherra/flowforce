import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { logger } from '@/utils/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Timer, Users, DollarSign, ChefHat, AlertTriangle, Clock, Edit, Save, X, Plus, Upload, Image as ImageIcon, Play } from 'lucide-react';
import { useState } from 'react';

interface Recipe {
  id: string;
  name: string;
  description: string;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  servings: number;
  costPerServing: number;
  difficulty: 'easy' | 'medium' | 'hard';
  allergens: string[];
  parLevel?: { min: number; max: number; unit: string };
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
    notes?: string;
  }>;
  instructions: Array<{
    step: number;
    instruction: string;
    time?: number;
    temp?: string;
  }>;
  notes?: string;
  nutritionInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  images?: string[];
  videos?: string[];
}

interface RecipeDetailDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecipeDetailDialog({ recipe, open, onOpenChange }: RecipeDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState<Recipe>(recipe || {
    id: '',
    name: '',
    description: '',
    prepTime: 0,
    cookTime: 0,
    totalTime: 0,
    servings: 1,
    costPerServing: 0,
    difficulty: 'easy',
    allergens: [],
    ingredients: [],
    instructions: [],
    images: [],
    videos: []
  });
  const [newAllergen, setNewAllergen] = useState('');
  
  if (!recipe) return null;

  const handleSave = () => {
    // In a real app, save to database
    logger.debug('Saving recipe:', editedRecipe);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedRecipe(recipe);
    setIsEditing(false);
  };

  const currentRecipe = isEditing ? editedRecipe : recipe;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const addIngredient = () => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: '', unit: 'each' }]
    }));
  };

  const removeIngredient = (index: number) => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const addInstruction = () => {
    setEditedRecipe(prev => ({
      ...prev,
      instructions: [...prev.instructions, { 
        step: prev.instructions.length + 1, 
        instruction: '' 
      }]
    }));
  };

  const removeInstruction = (index: number) => {
    setEditedRecipe(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
        .map((inst, i) => ({ ...inst, step: i + 1 }))
    }));
  };

  const updateInstruction = (index: number, field: string, value: string | number) => {
    setEditedRecipe(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => 
        i === index ? { ...inst, [field]: value } : inst
      )
    }));
  };

  const addAllergen = () => {
    if (newAllergen && !editedRecipe.allergens.includes(newAllergen)) {
      setEditedRecipe(prev => ({
        ...prev,
        allergens: [...prev.allergens, newAllergen]
      }));
      setNewAllergen('');
    }
  };

  const removeAllergen = (allergen: string) => {
    setEditedRecipe(prev => ({
      ...prev,
      allergens: prev.allergens.filter(a => a !== allergen)
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    try {
      // Simulate upload - in real app, upload to storage
      const urls = files.map(file => URL.createObjectURL(file));
      
      setEditedRecipe(prev => ({
        ...prev,
        [type === 'image' ? 'images' : 'videos']: [
          ...(prev[type === 'image' ? 'images' : 'videos'] || []),
          ...urls
        ]
      }));
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const removeMedia = (index: number, type: 'image' | 'video') => {
    setEditedRecipe(prev => ({
      ...prev,
      [type === 'image' ? 'images' : 'videos']: 
        (prev[type === 'image' ? 'images' : 'videos'] || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editedRecipe.name}
                    onChange={(e) => setEditedRecipe(prev => ({ ...prev, name: e.target.value }))}
                    className="text-2xl font-bold"
                    placeholder="Recipe name"
                  />
                  <Textarea
                    value={editedRecipe.description}
                    onChange={(e) => setEditedRecipe(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Recipe description"
                    rows={2}
                  />
                </div>
              ) : (
                <div>
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    <ChefHat className="h-6 w-6" />
                    {currentRecipe.name}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {currentRecipe.description}
                  </DialogDescription>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <Select 
                  value={editedRecipe.difficulty} 
                  onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                    setEditedRecipe(prev => ({ ...prev, difficulty: value }))
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={getDifficultyColor(currentRecipe.difficulty)}>
                  {currentRecipe.difficulty}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recipe Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-3 text-center">
                  <Timer className="h-4 w-4 mx-auto mb-1 text-primary" />
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedRecipe.totalTime}
                      onChange={(e) => setEditedRecipe(prev => ({ ...prev, totalTime: Number(e.target.value) }))}
                      className="text-center text-sm font-medium h-6 p-1"
                    />
                  ) : (
                    <div className="text-sm font-medium">{currentRecipe.totalTime} min</div>
                  )}
                  <div className="text-xs text-muted-foreground">Total</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Users className="h-4 w-4 mx-auto mb-1 text-secondary" />
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedRecipe.servings}
                      onChange={(e) => setEditedRecipe(prev => ({ ...prev, servings: Number(e.target.value) }))}
                      className="text-center text-sm font-medium h-6 p-1"
                    />
                  ) : (
                    <div className="text-sm font-medium">{currentRecipe.servings}</div>
                  )}
                  <div className="text-xs text-muted-foreground">Servings</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <DollarSign className="h-4 w-4 mx-auto mb-1 text-accent" />
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editedRecipe.costPerServing}
                      onChange={(e) => setEditedRecipe(prev => ({ ...prev, costPerServing: Number(e.target.value) }))}
                      className="text-center text-sm font-medium h-6 p-1"
                    />
                  ) : (
                    <div className="text-sm font-medium">${currentRecipe.costPerServing}</div>
                  )}
                  <div className="text-xs text-muted-foreground">Per serving</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedRecipe.prepTime}
                      onChange={(e) => setEditedRecipe(prev => ({ ...prev, prepTime: Number(e.target.value) }))}
                      className="text-center text-sm font-medium h-6 p-1"
                    />
                  ) : (
                    <div className="text-sm font-medium">{currentRecipe.prepTime} min</div>
                  )}
                  <div className="text-xs text-muted-foreground">Prep</div>
                </CardContent>
              </Card>
            </div>

            {/* PAR Level (if applicable) */}
            {(currentRecipe.parLevel || isEditing) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">PAR Level Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <Label>Minimum</Label>
                        <Input
                          type="number"
                          value={editedRecipe.parLevel?.min || ''}
                          onChange={(e) => setEditedRecipe(prev => ({
                            ...prev,
                            parLevel: {
                              ...prev.parLevel,
                              min: Number(e.target.value),
                              max: prev.parLevel?.max || 0,
                              unit: prev.parLevel?.unit || 'each'
                            }
                          }))}
                        />
                      </div>
                      <div>
                        <Label>Maximum</Label>
                        <Input
                          type="number"
                          value={editedRecipe.parLevel?.max || ''}
                          onChange={(e) => setEditedRecipe(prev => ({
                            ...prev,
                            parLevel: {
                              ...prev.parLevel,
                              max: Number(e.target.value),
                              min: prev.parLevel?.min || 0,
                              unit: prev.parLevel?.unit || 'each'
                            }
                          }))}
                        />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Input
                          value={editedRecipe.parLevel?.unit || ''}
                          onChange={(e) => setEditedRecipe(prev => ({
                            ...prev,
                            parLevel: {
                              ...prev.parLevel,
                              unit: e.target.value,
                              min: prev.parLevel?.min || 0,
                              max: prev.parLevel?.max || 0
                            }
                          }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Minimum:</span>
                        <span className="ml-1 font-medium">{currentRecipe.parLevel!.min} {currentRecipe.parLevel!.unit}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Maximum:</span>
                        <span className="ml-1 font-medium">{currentRecipe.parLevel!.max} {currentRecipe.parLevel!.unit}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ingredients */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ingredients</CardTitle>
                {isEditing && (
                  <Button onClick={addIngredient} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentRecipe.ingredients.map((ingredient, index) => (
                    <div key={index}>
                      {isEditing ? (
                        <div className="grid grid-cols-12 gap-2 items-center py-1">
                          <Input
                            className="col-span-4"
                            placeholder="Ingredient name"
                            value={ingredient.name}
                            onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                          />
                          <Input
                            className="col-span-2"
                            placeholder="Amount"
                            value={ingredient.amount}
                            onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                          />
                          <Select 
                            value={ingredient.unit} 
                            onValueChange={(value) => updateIngredient(index, 'unit', value)}
                          >
                            <SelectTrigger className="col-span-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="each">Each</SelectItem>
                              <SelectItem value="cup">Cup</SelectItem>
                              <SelectItem value="tbsp">Tbsp</SelectItem>
                              <SelectItem value="tsp">Tsp</SelectItem>
                              <SelectItem value="oz">Oz</SelectItem>
                              <SelectItem value="lb">Lb</SelectItem>
                              <SelectItem value="g">G</SelectItem>
                              <SelectItem value="kg">Kg</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            className="col-span-3"
                            placeholder="Notes"
                            value={ingredient.notes || ''}
                            onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="col-span-1"
                            onClick={() => removeIngredient(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center py-1">
                          <span className="font-medium">{ingredient.name}</span>
                          <span className="text-muted-foreground">
                            {ingredient.amount} {ingredient.unit}
                            {ingredient.notes && (
                              <span className="text-xs ml-2 text-orange-600">
                                ({ingredient.notes})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Instructions</CardTitle>
                {isEditing && (
                  <Button onClick={addInstruction} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentRecipe.instructions.map((instruction, index) => (
                    <div key={index}>
                      {isEditing ? (
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                            {instruction.step}
                          </div>
                          <div className="flex-1 space-y-2">
                            <Textarea
                              placeholder="Enter instruction"
                              value={instruction.instruction}
                              onChange={(e) => updateInstruction(index, 'instruction', e.target.value)}
                              rows={2}
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                placeholder="Time (min)"
                                type="number"
                                value={instruction.time || ''}
                                onChange={(e) => updateInstruction(index, 'time', Number(e.target.value))}
                              />
                              <Input
                                placeholder="Temperature"
                                value={instruction.temp || ''}
                                onChange={(e) => updateInstruction(index, 'temp', e.target.value)}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeInstruction(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                            {instruction.step}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{instruction.instruction}</p>
                            {(instruction.time || instruction.temp) && (
                              <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                {instruction.time && (
                                  <span className="flex items-center gap-1">
                                    <Timer className="h-3 w-3" />
                                    {instruction.time} min
                                  </span>
                                )}
                                {instruction.temp && (
                                  <span>🌡️ {instruction.temp}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Media Section - Images and Videos */}
            {(isEditing || (currentRecipe.images && currentRecipe.images.length > 0) || (currentRecipe.videos && currentRecipe.videos.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Recipe Media
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Images */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Images</Label>
                      {isEditing && (
                        <div>
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleFileUpload(e, 'image')}
                            className="hidden"
                            id="image-upload"
                          />
                          <Label htmlFor="image-upload" className="cursor-pointer">
                            <Button variant="outline" size="sm" asChild>
                              <span>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                              </span>
                            </Button>
                          </Label>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(currentRecipe.images || []).map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`Recipe image ${index + 1}`}
                            className="w-full h-20 object-cover rounded-md"
                          />
                          {isEditing && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-5 w-5 p-0"
                              onClick={() => removeMedia(index, 'image')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Videos */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Videos</Label>
                      {isEditing && (
                        <div>
                          <Input
                            type="file"
                            accept="video/*"
                            multiple
                            onChange={(e) => handleFileUpload(e, 'video')}
                            className="hidden"
                            id="video-upload"
                          />
                          <Label htmlFor="video-upload" className="cursor-pointer">
                            <Button variant="outline" size="sm" asChild>
                              <span>
                                <Play className="h-4 w-4 mr-2" />
                                Upload
                              </span>
                            </Button>
                          </Label>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(currentRecipe.videos || []).map((video, index) => (
                        <div key={index} className="relative">
                          <video
                            src={video}
                            className="w-full h-24 object-cover rounded-md"
                            controls
                          />
                          {isEditing && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-5 w-5 p-0"
                              onClick={() => removeMedia(index, 'video')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Allergens */}
            {(currentRecipe.allergens.length > 0 || isEditing) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Allergens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={newAllergen}
                          onChange={(e) => setNewAllergen(e.target.value)}
                          placeholder="Add allergen"
                          onKeyPress={(e) => e.key === 'Enter' && addAllergen()}
                        />
                        <Button type="button" onClick={addAllergen} size="sm">Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {editedRecipe.allergens.map((allergen, index) => (
                          <Badge key={index} variant="outline" className="gap-1">
                            {allergen}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0"
                              onClick={() => removeAllergen(allergen)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {currentRecipe.allergens.map((allergen, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Nutrition Info */}
            {(currentRecipe.nutritionInfo || isEditing) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Nutrition (per serving)</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Calories</Label>
                          <Input
                            type="number"
                            value={editedRecipe.nutritionInfo?.calories || ''}
                            onChange={(e) => setEditedRecipe(prev => ({
                              ...prev,
                              nutritionInfo: {
                                ...prev.nutritionInfo,
                                calories: Number(e.target.value),
                                protein: prev.nutritionInfo?.protein || 0,
                                carbs: prev.nutritionInfo?.carbs || 0,
                                fat: prev.nutritionInfo?.fat || 0
                              }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Protein (g)</Label>
                          <Input
                            type="number"
                            value={editedRecipe.nutritionInfo?.protein || ''}
                            onChange={(e) => setEditedRecipe(prev => ({
                              ...prev,
                              nutritionInfo: {
                                ...prev.nutritionInfo,
                                protein: Number(e.target.value),
                                calories: prev.nutritionInfo?.calories || 0,
                                carbs: prev.nutritionInfo?.carbs || 0,
                                fat: prev.nutritionInfo?.fat || 0
                              }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Carbs (g)</Label>
                          <Input
                            type="number"
                            value={editedRecipe.nutritionInfo?.carbs || ''}
                            onChange={(e) => setEditedRecipe(prev => ({
                              ...prev,
                              nutritionInfo: {
                                ...prev.nutritionInfo,
                                carbs: Number(e.target.value),
                                calories: prev.nutritionInfo?.calories || 0,
                                protein: prev.nutritionInfo?.protein || 0,
                                fat: prev.nutritionInfo?.fat || 0
                              }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Fat (g)</Label>
                          <Input
                            type="number"
                            value={editedRecipe.nutritionInfo?.fat || ''}
                            onChange={(e) => setEditedRecipe(prev => ({
                              ...prev,
                              nutritionInfo: {
                                ...prev.nutritionInfo,
                                fat: Number(e.target.value),
                                calories: prev.nutritionInfo?.calories || 0,
                                protein: prev.nutritionInfo?.protein || 0,
                                carbs: prev.nutritionInfo?.carbs || 0
                              }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Calories</span>
                        <span className="font-medium">{currentRecipe.nutritionInfo!.calories}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Protein</span>
                        <span className="font-medium">{currentRecipe.nutritionInfo!.protein}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Carbs</span>
                        <span className="font-medium">{currentRecipe.nutritionInfo!.carbs}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fat</span>
                        <span className="font-medium">{currentRecipe.nutritionInfo!.fat}g</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(currentRecipe.notes || isEditing) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Chef's Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editedRecipe.notes || ''}
                      onChange={(e) => setEditedRecipe(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Enter chef's notes"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{currentRecipe.notes}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button className="w-full">Start Cooking</Button>
                  <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Recipe
                  </Button>
                  <Button variant="outline" className="w-full">Print Recipe</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}