import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChefHat, Plus, BookOpen, Clock } from "lucide-react";
import { InventoryLayout } from "../components/InventoryLayout";
import { IfCan } from "@/components/permissions/IfCan";

export default function CookbookPage() {
  const { t } = useTranslation();
  return (
    <InventoryLayout>
      <IfCan permission="inventory.view">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <ChefHat className="h-8 w-8" />
                {t("inventory.cookbookRecipes")} </h1>
              <p className="text-muted-foreground">
                {t("inventory.recipeManagementWithInventoryIntegration")} </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline">{t("inventory.importRecipes")}</Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("inventory.newRecipe")} </Button>
            </div>
          </div>

          {/* Coming Soon */}
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <ChefHat className="h-16 w-16 text-muted-foreground" />
                  <Clock className="h-6 w-6 text-primary absolute -bottom-1 -right-1 bg-background rounded-full p-1" />
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2">
                {t("inventory.cookbookComingSoon")} </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {t("inventory.aComprehensiveRecipeManagementSystemThatIntegratesWithYourInventoryForAccurateCostingAndPrepPlanning")} </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <h4 className="font-medium">{t("inventory.recipeLibrary")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("inventory.storeAndOrganizeRecipes")} </p>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-4 text-center">
                    <ChefHat className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <h4 className="font-medium">{t("inventory.inventoryIntegration")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("inventory.linkIngredientsToInventory")} </p>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-4 text-center">
                    <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <h4 className="font-medium">{t("inventory.costCalculation")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("inventory.automaticRecipeCosting")} </p>
                  </CardContent>
                </Card>
              </div>

              <p className="text-sm text-muted-foreground">
                {t("inventory.thisFeatureIsCurrentlyUnderDevelopmentAndWillBeAvailableInAFutureUpdate")} </p>
            </CardContent>
          </Card>
        </div>
      </IfCan>
    </InventoryLayout>
  );
}
