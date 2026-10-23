import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import FormFieldLibrary, {
  type FieldTemplate,
} from "@/features/forms/components/editor/FormFieldLibrary";
import FormEditorPanel from "@/features/forms/components/editor/FormEditorPanel";
import FormLivePreview from "@/features/forms/components/editor/FormLivePreview";
import { builderPaneMode } from "@/features/forms/utils/formsSurface";

type Pane = "library" | "editor" | "preview";

export function FormBuilderWorkspace({
  onAddField,
}: {
  onAddField: (template: FieldTemplate) => void;
}) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(1024);
  const [pane, setPane] = useState<Pane>("editor");

  useEffect(() => {
    const apply = () => setWidth(window.innerWidth);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const panes: Array<{ id: Pane; label: string }> = [
    { id: "library", label: t("forms.fieldLibrary") },
    { id: "editor", label: t("forms.formEditor") },
    { id: "preview", label: t("forms.livePreview2") },
  ];

  const paneView = (id: Pane) => {
    if (id === "library") return <FormFieldLibrary onAddField={onAddField} />;
    if (id === "editor") return <FormEditorPanel />;
    return <FormLivePreview />;
  };

  if (builderPaneMode(width) === "stack") {
    return (
      <div className="flex min-h-0 flex-1 flex-col" data-testid="form-builder-stack">
        <div className="flex shrink-0 gap-1 border-b p-2">
          {panes.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={pane === item.id ? "default" : "outline"}
              className="min-h-11 flex-1"
              onClick={() => setPane(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{paneView(pane)}</div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="min-h-0 flex-1 overflow-hidden"
      data-testid="form-builder-columns"
    >
      <ResizablePanel defaultSize={22} minSize={16} className="flex min-h-0 min-w-0 flex-col">
        <FormFieldLibrary onAddField={onAddField} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={48} minSize={32} className="flex min-h-0 min-w-0 flex-col">
        <FormEditorPanel />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={30} minSize={20} className="flex min-h-0 min-w-0 flex-col">
        <FormLivePreview />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
