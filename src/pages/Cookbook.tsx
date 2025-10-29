import { useMemo, useState, type ReactNode } from 'react';
import { BookOpen, Filter, Search, FileDown, Activity, AlertTriangle, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCookbook } from '@/hooks/useCookbook';
import { CookbookGrid } from '@/components/cookbook/CookbookGrid';
import { PrepList } from '@/components/cookbook/PrepList';
import { DailyCountDialog } from '@/components/cookbook/DailyCountDialog';
import { RecipeDetailDialog } from '@/components/cookbook/RecipeDetailDialog';
import { CreateRecipeDialog } from '@/components/cookbook/CreateRecipeDialog';
import type { CookbookRecipe } from '@/services/cookbook';

export default function Cookbook() {
  const {
    loading,
    error,
    recipes,
    favorites,
    favoriteIds,
    prepItems,
    suggestToMake,
    createProduction,
    logWaste,
    toggleFavorite,
    exportRecipeSheet,
    exportDailyPrepSummary,
    wasteEvents,
    productionEvents,
    inventoryItems,
  } = useCookbook();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<CookbookRecipe | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const recipeMap = useMemo(() => {
    const map = new Map<string, CookbookRecipe>();
    recipes.forEach((recipe) => map.set(recipe.item.id, recipe));
    return map;
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    if (!searchTerm) return recipes;
    return recipes.filter((recipe) => recipe.item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [recipes, searchTerm]);

  const filteredFavorites = useMemo(() => {
    if (!searchTerm) return favorites;
    return favorites.filter((recipe) => recipe.item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [favorites, searchTerm]);

  const prepItemsForCount = useMemo(
    () => prepItems.map((item) => ({ id: item.id, name: item.name, uom: item.uom })),
    [prepItems]
  );

  const handleExportRecipe = (recipeId: string) => {
    const payload = exportRecipeSheet(recipeId);
    if (!payload) return;
    downloadCsv(payload.csv, payload.filename);
  };

  const handleExportDailyPrep = () => {
    const payload = exportDailyPrepSummary();
    if (!payload) return;
    downloadCsv(payload.csv, payload.filename);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Inventory Cookbook
          </h1>
          <p className="text-muted-foreground">
            Merge recipes with Items &amp; Setup inventory for live costing, smart prep, and waste tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportDailyPrep}>
            <FileDown className="h-4 w-4 mr-2" />
            Daily Prep Summary
          </Button>
          <DailyCountDialog items={prepItemsForCount} />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Recipe
          </Button>
        </div>
      </header>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            {error}. Showing synced demo data so you can continue designing the cookbook experience.
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Linked Recipes" value={recipes.length} subtitle="Inventory-backed and costed" />
        <StatCard title="Favorites" value={favoriteIds.length} subtitle="Go-to recipes for quick access" />
        <StatCard title="Prep Items" value={prepItems.length} subtitle="Prep planner ready items" />
        <StatCard
          title="Events (7d)"
          value={productionEvents.length + wasteEvents.length}
          subtitle={`${productionEvents.length} production • ${wasteEvents.length} waste`}
        />
      </section>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes by name…"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="recipes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recipes">Recipes ({filteredRecipes.length})</TabsTrigger>
          <TabsTrigger value="favorites">Favorites ({filteredFavorites.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="recipes">
          <CookbookGrid
            recipes={filteredRecipes}
            favoriteIds={favoriteIds}
            onSelect={setSelectedRecipe}
            onToggleFavorite={toggleFavorite}
            onExportRecipe={handleExportRecipe}
            loading={loading}
          />
        </TabsContent>
        <TabsContent value="favorites">
          <CookbookGrid
            recipes={filteredFavorites}
            favoriteIds={favoriteIds}
            onSelect={setSelectedRecipe}
            onToggleFavorite={toggleFavorite}
            onExportRecipe={handleExportRecipe}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Daily Prep Planner</h2>
            <p className="text-sm text-muted-foreground">
              Suggested make quantities with instant production logging and waste tracking.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleExportDailyPrep}>
            <FileDown className="h-4 w-4 mr-2" />
            Export summary
          </Button>
        </div>
        <PrepList
          items={prepItems}
          suggestToMake={suggestToMake}
          onLogProduction={createProduction}
          onLogWaste={logWaste}
          onViewRecipe={(recipeId) => setSelectedRecipe(recipeMap.get(recipeId) ?? null)}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EventCard
          title="Recent Production"
          icon={<Activity className="h-4 w-4" />}
          empty="Production batches log once Supabase migrations run."
          items={productionEvents.map((event) => ({
            id: event.id,
            title: event.item?.name ?? 'Unknown item',
            description: `${event.actual_quantity ?? event.planned_quantity} ${event.item?.unit?.abbreviation || ''} • ${event.status}`,
            timestamp: event.prep_date,
          }))}
        />
        <EventCard
          title="Recent Waste"
          icon={<AlertTriangle className="h-4 w-4" />}
          empty="Waste events log locally when Supabase is unavailable."
          items={wasteEvents.slice(0, 5).map((event) => ({
            id: event.id,
            title: event.item?.name ?? 'Unknown item',
            description: `${event.quantity} ${event.item?.unit?.name || ''} • ${event.waste_type}`,
            timestamp: event.waste_date,
          }))}
        />
      </section>

      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={!!selectedRecipe}
        onOpenChange={(open) => setSelectedRecipe(open ? selectedRecipe : null)}
        onExport={handleExportRecipe}
        isFavorite={selectedRecipe ? favoriteIds.includes(selectedRecipe.item.id) : false}
      />

      <CreateRecipeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        inventoryItems={inventoryItems}
        onCreate={async () => undefined}
      />
    </div>
  );
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function StatCard({ title, value, subtitle }: { title: string; value: number; subtitle: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

interface EventCardProps {
  title: string;
  icon: ReactNode;
  empty: string;
  items: Array<{ id: string; title: string; description: string; timestamp: string }>;
}

function EventCard({ title, icon, empty, items }: EventCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <div className="p-2 rounded-md bg-muted text-muted-foreground">{icon}</div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>Live once Supabase tables are configured—sample data shown today.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="text-sm border-b pb-2 last:border-0 last:pb-0">
              <div className="font-medium">{item.title}</div>
              <div className="text-muted-foreground text-xs flex items-center justify-between">
                <span>{item.description}</span>
                <span>{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
