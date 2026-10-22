import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Factory, Trash2, Settings, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useInventoryItems,
  useInventoryLocations,
  useCreateWaste,
  useCreateInventoryAdjustment,
} from "@/hooks/useInventory";
import { asArray, safeArrayMap } from "@/utils/reactQueryTypes";
import { InventoryTransfersPanel } from "@/features/inventory/components/InventoryTransfersPanel";
import { InventoryLayout } from "../components/InventoryLayout";
import { IfCan } from "@/components/permissions/IfCan";
import { ProductionEventForm } from "@/features/inventory/components/ProductionEventForm";
import { ProductionEventList } from "@/features/inventory/components/ProductionEventList";
import { useInventoryFormState } from "@/features/inventory/hooks/useInventoryForm";
import {
  wasteTypes,
  type WasteTypeValue,
  submitWasteForm,
  processAdjustmentForm,
} from "./inventoryActionsHelpers";

export default function InventoryActionsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  // Fetch real data
  const {
    data: itemsData,
    isLoading: itemsLoading,
    error: itemsError,
  } = useInventoryItems();
  const {
    data: locationsData,
    isLoading: locationsLoading,
    error: locationsError,
  } = useInventoryLocations();

  // Show error toasts for failed queries
  useEffect(() => {
    if (itemsError) {
      toast({
        title: "Unable to load items",
        description: itemsError instanceof Error ? itemsError.message : "Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [itemsError, toast]);

  useEffect(() => {
    if (locationsError) {
      toast({
        title: "Unable to load locations",
        description: locationsError instanceof Error ? locationsError.message : "Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [locationsError, toast]);
  const items = asArray(itemsData);
  const locations = asArray(locationsData);
  const createWaste = useCreateWaste();
  const createAdjustment = useCreateInventoryAdjustment();
  const isReferenceDataLoading = itemsLoading || locationsLoading;

  const {
    values: wasteForm,
    errors: wasteErrors,
    setField: setWasteField,
    setErrors: setWasteErrors,
    reset: resetWasteForm,
    showValidationToast,
  } = useInventoryFormState({
    item_id: "",
    location_id: "",
    quantity: "",
    waste_type: "" as WasteTypeValue | "",
    reason: "",
  });
  type WasteFormState = typeof wasteForm;

  const {
    values: adjustmentForm,
    errors: adjustmentErrors,
    setField: setAdjustmentField,
    setErrors: setAdjustmentErrors,
    reset: resetAdjustmentForm,
  } = useInventoryFormState({
    item_id: "",
    location_id: "",
    adjustment_type: "",
    quantity: "",
    reason: "",
  });
  type AdjustmentFormState = typeof adjustmentForm;

  const itemOptions = useMemo(
    () =>
      safeArrayMap(items, (item) => ({
        id: item.id,
        label: `${item.name} (${item.unit?.name || "units"})`,
      })),
    [items],
  );
  const locationOptions = useMemo(
    () =>
      safeArrayMap(locations, (location) => ({
        id: location.id,
        label: location.name,
      })),
    [locations],
  );
  const wasteFormDisabled = createWaste.isPending || isReferenceDataLoading;
  const adjustmentFormDisabled =
    createAdjustment.isPending || isReferenceDataLoading;

  const buildSelectHandler = useCallback(
    <Form extends Record<string, string>>(
      setter: (field: keyof Form, value: string) => void,
      field: keyof Form,
    ) =>
      (value: string) =>
        setter(field, value),
    [],
  );

  const handleWasteSelect = useMemo(
    () => ({
      item: buildSelectHandler<WasteFormState>(setWasteField, "item_id"),
      location: buildSelectHandler<WasteFormState>(
        setWasteField,
        "location_id",
      ),
      type: buildSelectHandler<WasteFormState>(setWasteField, "waste_type"),
    }),
    [buildSelectHandler, setWasteField],
  );

  const handleAdjustmentSelect = useMemo(
    () => ({
      item: buildSelectHandler<AdjustmentFormState>(
        setAdjustmentField,
        "item_id",
      ),
      location: buildSelectHandler<AdjustmentFormState>(
        setAdjustmentField,
        "location_id",
      ),
      type: buildSelectHandler<AdjustmentFormState>(
        setAdjustmentField,
        "adjustment_type",
      ),
    }),
    [buildSelectHandler, setAdjustmentField],
  );

  const handleWasteSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await submitWasteForm({
        form: wasteForm,
        items,
        setErrors: setWasteErrors,
        showValidationToast,
        resetForm: resetWasteForm,
        mutateWaste: createWaste.mutateAsync,
      });
    },
    [
      createWaste.mutateAsync,
      items,
      resetWasteForm,
      setWasteErrors,
      showValidationToast,
      wasteForm,
    ],
  );

  const handleAdjustmentSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await processAdjustmentForm({
        form: adjustmentForm,
        items,
        setErrors: setAdjustmentErrors,
        showValidationToast,
        resetForm: resetAdjustmentForm,
        mutateAdjustment: createAdjustment.mutateAsync,
      });
    },
    [
      adjustmentForm,
      createAdjustment.mutateAsync,
      items,
      setAdjustmentErrors,
      showValidationToast,
      resetAdjustmentForm,
    ],
  );

  const renderFormSkeleton = (
    <div className="space-y-4" aria-live="polite">
      {[0, 1, 2, 3].map((key) => (
        <div key={key} className="space-y-2">
          <Skeleton className="h-4 w-24 rounded-md bg-muted/70 dark:bg-muted/40" />
          <Skeleton className="h-10 w-full rounded-md bg-muted/70 dark:bg-muted/40" />
        </div>
      ))}
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-md bg-muted/70 dark:bg-muted/40" />
        <Skeleton className="h-10 flex-1 rounded-md bg-muted/70 dark:bg-muted/40" />
      </div>
    </div>
  );

  const loadError = itemsError ?? locationsError;
  const showEmptyState =
    !isReferenceDataLoading &&
    !loadError &&
    (items.length === 0 || locations.length === 0);

  return (
    <InventoryLayout>
      <IfCan permission="inventory.view">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("common.inventoryActions")} </h1>
            <p className="text-muted-foreground">
              {t("inventory.recordProductionWasteAdjustmentsAndTransfers")} </p>
          </div>

          {loadError && (
            <Alert variant="destructive">
              <AlertTitle>{t("inventory.unableToLoadInventoryData")}</AlertTitle>
              <AlertDescription>
                {loadError.message ?? "Please refresh and try again."}
              </AlertDescription>
            </Alert>
          )}

          {showEmptyState && (
            <Alert>
              <AlertTitle>{t("inventory.inventorySetupRequired")}</AlertTitle>
              <AlertDescription>
                {t("inventory.addAtLeastOneInventoryItemAndLocationToLogWasteOrAdjustments")} </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="production" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
              <TabsTrigger
                value="production"
                className="flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Factory className="h-4 w-4 text-primary" />
                {t("dashboard.production")} </TabsTrigger>
              <TabsTrigger
                value="waste"
                className="flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Trash2 className="h-4 w-4 text-primary" />
                {t("inventory.logWaste")} </TabsTrigger>
              <TabsTrigger
                value="adjustments"
                className="flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Settings className="h-4 w-4 text-primary" />
                {t("inventory.adjustments")} </TabsTrigger>
              <TabsTrigger
                value="transfers"
                className="flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                {t("inventory.transfers")} </TabsTrigger>
            </TabsList>

            <TabsContent value="production" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="h-5 w-5 text-primary" />
                    {t("inventory.recordProductionEvent")} </CardTitle>
                  <CardDescription>
                    {t("inventory.trackMaterialUsageYieldAndCostsForPrepBatchCookedOrBakedProductionRuns")} </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductionEventForm />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t("inventory.recentProductionEvents")}</CardTitle>
                  <CardDescription>
                    {t("inventory.costSummariesAndMaterialUsageForTheMostRecentProductionRuns")} </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductionEventList />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="waste" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-primary" />
                    {t("inventory.logWaste")} </CardTitle>
                  <CardDescription>
                    {t("inventory.recordSpoilagePrepErrorsAndOtherWaste")} </CardDescription>
                </CardHeader>
                <CardContent>
                  {isReferenceDataLoading ? (
                    renderFormSkeleton
                  ) : (
                    <form onSubmit={handleWasteSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="waste-item">{t("inventory.item3")}</Label>
                          <Select
                            value={wasteForm.item_id}
                            onValueChange={handleWasteSelect.item}
                            disabled={wasteFormDisabled || !itemOptions.length}
                            required
                          >
                            <SelectTrigger
                              aria-invalid={Boolean(wasteErrors.item_id)}
                            >
                              <SelectValue
                                placeholder={
                                  itemOptions.length
                                    ? "Select item"
                                    : "No items available"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {itemOptions.length ? (
                                itemOptions.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.label}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  {t("inventory.addAnInventoryItemFirst")} </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {wasteErrors.item_id && (
                            <p className="text-sm text-destructive">
                              {wasteErrors.item_id}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="waste-location">{t("schedule.location")}</Label>
                          <Select
                            value={wasteForm.location_id}
                            onValueChange={handleWasteSelect.location}
                            disabled={
                              wasteFormDisabled || !locationOptions.length
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  locationOptions.length
                                    ? "Select location"
                                    : "No locations yet"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {locationOptions.length ? (
                                locationOptions.map((location) => (
                                  <SelectItem
                                    key={location.id}
                                    value={location.id}
                                  >
                                    {location.label}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  {t("inventory.createALocationFirst")} </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="waste-quantity">{t("inventory.quantity2")}</Label>
                          <Input
                            id="waste-quantity"
                            type="number"
                            step="0.1"
                            min="0"
                            inputMode="decimal"
                            placeholder="0.0"
                            value={wasteForm.quantity}
                            onChange={(e) =>
                              setWasteField("quantity", e.target.value)
                            }
                            required
                            aria-invalid={Boolean(wasteErrors.quantity)}
                            disabled={wasteFormDisabled}
                          />
                          {wasteErrors.quantity && (
                            <p className="text-sm text-destructive">
                              {wasteErrors.quantity}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="waste-type">{t("inventory.wasteType")}</Label>
                          <Select
                            value={wasteForm.waste_type}
                            onValueChange={handleWasteSelect.type}
                            disabled={wasteFormDisabled}
                            required
                          >
                            <SelectTrigger
                              aria-invalid={Boolean(wasteErrors.waste_type)}
                            >
                              <SelectValue placeholder={t("messages.selectType")} />
                            </SelectTrigger>
                            <SelectContent>
                              {wasteTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {wasteErrors.waste_type && (
                            <p className="text-sm text-destructive">
                              {wasteErrors.waste_type}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="waste-reason">{t("inventory.reasonNotes")}</Label>
                        <Textarea
                          id="waste-reason"
                          placeholder={t("inventory.describeTheReasonForWaste")}
                          rows={3}
                          value={wasteForm.reason}
                          onChange={(e) =>
                            setWasteField("reason", e.target.value)
                          }
                          disabled={wasteFormDisabled}
                        />
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            resetWasteForm();
                            setWasteErrors({});
                          }}
                          disabled={wasteFormDisabled}
                        >
                          {t("inventory.clearForm")} </Button>
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={wasteFormDisabled}
                        >
                          {createWaste.isPending ? "Recording..." : "Log Waste"}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adjustments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    {t("inventory.inventoryAdjustments")} </CardTitle>
                  <CardDescription>
                    {t("inventory.correctInventoryCountsAndMakeManualAdjustments")} </CardDescription>
                </CardHeader>
                <CardContent>
                  {isReferenceDataLoading ? (
                    renderFormSkeleton
                  ) : (
                    <form
                      onSubmit={handleAdjustmentSubmit}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="adj-item">{t("inventory.item3")}</Label>
                          <Select
                            value={adjustmentForm.item_id}
                            onValueChange={handleAdjustmentSelect.item}
                            disabled={
                              adjustmentFormDisabled || !itemOptions.length
                            }
                            required
                          >
                            <SelectTrigger
                              aria-invalid={Boolean(adjustmentErrors.item_id)}
                            >
                              <SelectValue
                                placeholder={
                                  itemOptions.length
                                    ? "Select item"
                                    : "No items available"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {itemOptions.length ? (
                                itemOptions.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.label}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  {t("inventory.addAnInventoryItemFirst")} </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {adjustmentErrors.item_id && (
                            <p className="text-sm text-destructive">
                              {adjustmentErrors.item_id}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="adj-location">{t("inventory.location")}</Label>
                          <Select
                            value={adjustmentForm.location_id}
                            onValueChange={handleAdjustmentSelect.location}
                            disabled={
                              adjustmentFormDisabled || !locationOptions.length
                            }
                            required
                          >
                            <SelectTrigger
                              aria-invalid={Boolean(
                                adjustmentErrors.location_id,
                              )}
                            >
                              <SelectValue
                                placeholder={
                                  locationOptions.length
                                    ? "Select location"
                                    : "No locations yet"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {locationOptions.length ? (
                                locationOptions.map((location) => (
                                  <SelectItem
                                    key={location.id}
                                    value={location.id}
                                  >
                                    {location.label}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  {t("inventory.createALocationFirst")} </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {adjustmentErrors.location_id && (
                            <p className="text-sm text-destructive">
                              {adjustmentErrors.location_id}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="adj-type">{t("inventory.adjustmentType")}</Label>
                          <Select
                            value={adjustmentForm.adjustment_type}
                            onValueChange={handleAdjustmentSelect.type}
                            disabled={adjustmentFormDisabled}
                            required
                          >
                            <SelectTrigger
                              aria-invalid={Boolean(
                                adjustmentErrors.adjustment_type,
                              )}
                            >
                              <SelectValue placeholder={t("messages.selectType")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="increase">{t("inventory.increase")}</SelectItem>
                              <SelectItem value="decrease">{t("inventory.decrease")}</SelectItem>
                            </SelectContent>
                          </Select>
                          {adjustmentErrors.adjustment_type && (
                            <p className="text-sm text-destructive">
                              {adjustmentErrors.adjustment_type}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="adj-quantity">{t("inventory.quantity2")}</Label>
                          <Input
                            id="adj-quantity"
                            type="number"
                            step="0.1"
                            min="0"
                            inputMode="decimal"
                            placeholder="0.0"
                            value={adjustmentForm.quantity}
                            onChange={(e) =>
                              setAdjustmentField("quantity", e.target.value)
                            }
                            required
                            aria-invalid={Boolean(adjustmentErrors.quantity)}
                            disabled={adjustmentFormDisabled}
                          />
                          {adjustmentErrors.quantity && (
                            <p className="text-sm text-destructive">
                              {adjustmentErrors.quantity}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adj-reason">{t("inventory.reason")}</Label>
                        <Textarea
                          id="adj-reason"
                          placeholder={t("inventory.describeTheReasonForAdjustment")}
                          rows={3}
                          value={adjustmentForm.reason}
                          onChange={(e) =>
                            setAdjustmentField("reason", e.target.value)
                          }
                          required
                          aria-invalid={Boolean(adjustmentErrors.reason)}
                          disabled={adjustmentFormDisabled}
                        />
                        {adjustmentErrors.reason && (
                          <p className="text-sm text-destructive">
                            {adjustmentErrors.reason}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            resetAdjustmentForm();
                            setAdjustmentErrors({});
                          }}
                          disabled={adjustmentFormDisabled}
                        >
                          {t("inventory.clearForm")} </Button>
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={adjustmentFormDisabled}
                        >
                          {createAdjustment.isPending
                            ? "Applying..."
                            : "Apply Adjustment"}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transfers">
              <InventoryTransfersPanel />
            </TabsContent>
          </Tabs>
        </div>
      </IfCan>
    </InventoryLayout>
  );
}
