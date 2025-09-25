
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCookbook } from '@/hooks/useCookbook';
import { CookbookGrid } from '@/components/cookbook/CookbookGrid';
import { PrepList } from '@/components/cookbook/PrepList';
import { DailyCountDialog } from '@/components/cookbook/DailyCountDialog';
import { RecipeDetailDialog } from '@/components/cookbook/RecipeDetailDialog';
import { CreateRecipeDialog } from '@/components/cookbook/CreateRecipeDialog';
import { ChefHat, BookOpen, Clock, Plus, Search, Filter, Timer, Users, DollarSign } from 'lucide-react';
import { useState } from 'react';

export default function Cookbook() {
  const { prepItems, menuItems } = useCookbook();
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [isCreateRecipeDialogOpen, setIsCreateRecipeDialogOpen] = useState(false);

  // Mock recipe data
  const sampleRecipe = {
    id: '1',
    name: 'Classic Burger',
    description: 'Traditional beef burger with standard toppings',
    prepTime: 15,
    cookTime: 15,
    totalTime: 30,
    servings: 4,
    costPerServing: 3.25,
    difficulty: 'easy' as const,
    allergens: ['Gluten', 'Dairy'],
    ingredients: [
      { name: 'Ground beef (80/20)', amount: '1', unit: 'lb' },
      { name: 'Burger buns', amount: '4', unit: 'pieces' },
      { name: 'American cheese slices', amount: '4', unit: 'slices' },
      { name: 'Lettuce leaves', amount: '4', unit: 'leaves' },
      { name: 'Tomato', amount: '1', unit: 'large', notes: 'sliced' },
      { name: 'Onion', amount: '1/2', unit: 'medium', notes: 'sliced' },
      { name: 'Salt', amount: '1', unit: 'tsp' },
      { name: 'Black pepper', amount: '1/2', unit: 'tsp' }
    ],
    instructions: [
      { step: 1, instruction: 'Form ground beef into 4 equal patties, season with salt and pepper', time: 5 },
      { step: 2, instruction: 'Preheat grill or skillet to medium-high heat', temp: '375°F' },
      { step: 3, instruction: 'Cook patties for 4-5 minutes per side for medium doneness', time: 10 },
      { step: 4, instruction: 'Add cheese slices in last minute of cooking', time: 1 },
      { step: 5, instruction: 'Toast buns lightly on the grill', time: 2 },
      { step: 6, instruction: 'Assemble burgers with lettuce, tomato, onion, and condiments' }
    ],
    notes: 'For best results, let patties rest for 2-3 minutes after cooking. Don\'t press down on patties while cooking.',
    nutritionInfo: {
      calories: 520,
      protein: 28,
      carbs: 32,
      fat: 30
    }
  };

  const handleViewRecipe = (recipeId: string) => {
    setSelectedRecipe(sampleRecipe);
    setIsRecipeDialogOpen(true);
  };
  
  return (
    <div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              Recipe Book & Kitchen Management
            </h1>
            <p className="text-muted-foreground">
              Recipes, menu items, preparation guides, and kitchen workflow management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsCreateRecipeDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Recipe
            </Button>
            <DailyCountDialog items={prepItems} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Recipes</span>
              </div>
              <div className="text-2xl font-bold">24</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-secondary" />
                <span className="text-sm font-medium">Menu Items</span>
              </div>
              <div className="text-2xl font-bold">{menuItems.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Prep Items</span>
              </div>
              <div className="text-2xl font-bold">{prepItems.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Today</Badge>
              </div>
              <div className="text-2xl font-bold">8</div>
              <div className="text-xs text-muted-foreground">Items to prep</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Search recipes, ingredients, menu items..." className="pl-10" />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="recipes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="menu">Menu Items</TabsTrigger>
            <TabsTrigger value="prep">Preparation</TabsTrigger>
            <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>

          <TabsContent value="recipes" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Featured Recipe Cards */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Classic Burger</CardTitle>
                    <Badge variant="secondary">
                      <Timer className="h-3 w-3 mr-1" />
                      30 min
                    </Badge>
                  </div>
                  <CardDescription>Traditional beef burger with standard toppings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>4 servings</span>
                      <DollarSign className="h-4 w-4 text-muted-foreground ml-2" />
                      <span>$3.25/serving</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Allergens:</span>
                      <span className="ml-2">Gluten, Dairy</span>
                    </div>
                    <div className="pt-2">
                      <Button size="sm" className="w-full" onClick={() => handleViewRecipe('3')}>
                        View Recipe
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Grilled Chicken Prep</CardTitle>
                    <Badge variant="secondary">
                      <Timer className="h-3 w-3 mr-1" />
                      45 min
                    </Badge>
                  </div>
                  <CardDescription>Marinated grilled chicken breast - prep recipe</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>20 portions</span>
                      <DollarSign className="h-4 w-4 text-muted-foreground ml-2" />
                      <span>$2.80/portion</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">PAR Level:</span>
                      <span className="ml-2">15-30 portions</span>
                    </div>
                    <div className="pt-2">
                      <Button size="sm" className="w-full" onClick={() => handleViewRecipe('2')}>
                        View Recipe
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">House Salad Mix</CardTitle>
                    <Badge variant="secondary">
                      <Timer className="h-3 w-3 mr-1" />
                      15 min
                    </Badge>
                  </div>
                  <CardDescription>Fresh mixed greens with house dressing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>12 cups</span>
                      <DollarSign className="h-4 w-4 text-muted-foreground ml-2" />
                      <span>$1.45/cup</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">PAR Level:</span>
                      <span className="ml-2">8-20 cups</span>
                    </div>
                    <div className="pt-2">
                      <Button size="sm" className="w-full" onClick={() => handleViewRecipe('1')}>
                        View Recipe
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed border-2 border-muted cursor-pointer hover:border-primary/50 transition-colors">
                <CardContent className="p-8 text-center">
                  <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Add New Recipe</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="menu" className="space-y-4">
            <CookbookGrid />
          </TabsContent>

          <TabsContent value="prep" className="space-y-4">
            <PrepList />
          </TabsContent>

          <TabsContent value="ingredients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ingredient Management</CardTitle>
                <CardDescription>
                  Manage recipe ingredients, substitutions, and allergen information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Ingredient management coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Menu Planning</CardTitle>
                <CardDescription>
                  Plan daily/weekly menus and calculate ingredient requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Menu planning features coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Favorite Recipes</CardTitle>
                <CardDescription>Your most-used and starred recipes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  No favorites saved yet
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <RecipeDetailDialog 
          recipe={selectedRecipe}
          open={isRecipeDialogOpen}
          onOpenChange={setIsRecipeDialogOpen}
        />

        <CreateRecipeDialog 
          open={isCreateRecipeDialogOpen}
          onOpenChange={setIsCreateRecipeDialogOpen}
        />
      </div>
    </div>
  );
}

