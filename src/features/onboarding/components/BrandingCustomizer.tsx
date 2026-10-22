import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Type, Layout, Code } from "lucide-react";
import { CustomBranding } from "@/types/customTemplate";

interface BrandingCustomizerProps {
  branding: CustomBranding;
  onBrandingChange: (branding: CustomBranding) => void;
}

const fontFamilies = [
  "Inter, sans-serif",
  "Roboto, sans-serif",
  "Poppins, sans-serif",
  "Open Sans, sans-serif",
  "Lato, sans-serif",
  "Montserrat, sans-serif",
];

export default function BrandingCustomizer({
  branding,
  onBrandingChange,
}: BrandingCustomizerProps) {
  const [_logoFile, setLogoFile] = useState<File | null>(null);

  const handleStyleChange = (property: keyof CustomBranding, value: any) => {
    onBrandingChange({
      ...branding,
      [property]: value,
    });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // In a real implementation, you'd upload to storage and get URL
      const reader = new FileReader();
      reader.onload = (e) => {
        handleStyleChange("logo", e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Customize Your Brand</h3>
        <p className="text-muted-foreground">
          Create a unique look and feel for your company&apos;s workspace
        </p>
      </div>

      <Tabs defaultValue="logo" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="logo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Company Logo
              </CardTitle>
              <CardDescription>
                Upload your company logo (recommended: 200x60px, PNG/SVG)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-border transition-colors">
                  {branding.logo ? (
                    <div className="space-y-2">
                      <img
                        src={branding.logo}
                        alt="Logo preview"
                        className="max-h-16 mx-auto"
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleStyleChange("logo", undefined)}
                      >
                        Remove Logo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, SVG up to 2MB
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Typography
              </CardTitle>
              <CardDescription>
                Choose fonts that reflect your brand personality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Font Family</Label>
                  <Select
                    value={branding.fontFamily}
                    onValueChange={(value) =>
                      handleStyleChange("fontFamily", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {fontFamilies.map((font) => (
                        <SelectItem key={font} value={font}>
                          <span style={{ fontFamily: font }}>
                            {font.split(",")[0]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Font Preview */}
                  <div className="p-4 rounded border bg-muted">
                    <div style={{ fontFamily: branding.fontFamily }}>
                      <h4
                        className="text-lg font-bold mb-2"
                        style={{
                          color: branding.primaryColor,
                          fontFamily: branding.fontFamily,
                        }}
                      >
                        Sample Heading
                      </h4>
                      <p
                        className="text-sm mb-2"
                        style={{
                          color: branding.secondaryColor,
                          fontFamily: branding.fontFamily,
                        }}
                      >
                        This is how your text will look with the selected font
                        family and colors. Your workspace will use this
                        typography throughout the interface.
                      </p>
                      <div
                        className="mt-2 text-xs"
                        style={{
                          color: branding.accentColor,
                          fontFamily: branding.fontFamily,
                        }}
                      >
                        Accent color and font preview
                      </div>
                      <div className="mt-3 pt-2 border-t border-border">
                        <div className="text-xs text-muted-foreground">
                          Font:{" "}
                          <span style={{ fontFamily: branding.fontFamily }}>
                            {branding.fontFamily.split(",")[0]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Header Style</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        value: "modern",
                        label: "Modern",
                        desc: "Clean lines, minimal shadows",
                      },
                      {
                        value: "classic",
                        label: "Classic",
                        desc: "Traditional, serif elements",
                      },
                      {
                        value: "minimal",
                        label: "Minimal",
                        desc: "Ultra-clean, no borders",
                      },
                      {
                        value: "bold",
                        label: "Bold",
                        desc: "Strong shadows, thick borders",
                      },
                    ].map((style) => (
                      <div
                        key={style.value}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          branding.headerStyle === style.value
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border hover:border-border"
                        }`}
                        onClick={() =>
                          handleStyleChange("headerStyle", style.value)
                        }
                      >
                        <div className="font-medium text-sm">{style.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {style.desc}
                        </div>

                        {/* Mini header preview */}
                        <div className="mt-2 p-2 bg-background rounded text-xs">
                          <div
                            className={`
                               ${style.value === "modern" ? "border-b border-border pb-1" : ""}
                               ${style.value === "classic" ? "border-b-2 border-border pb-1 font-serif" : ""}
                               ${style.value === "minimal" ? "pb-1" : ""}
                               ${style.value === "bold" ? "border-b-4 border-border pb-1 font-bold" : ""}
                             `}
                            style={{
                              color: branding.primaryColor,
                              fontFamily: branding.fontFamily,
                            }}
                          >
                            Header Preview
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Layout Style
              </CardTitle>
              <CardDescription>
                Customize the overall layout and component styles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Sidebar Style</Label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    {
                      value: "expanded",
                      label: "Expanded",
                      desc: "Full-width sidebar with labels",
                      preview: "w-16 h-12 bg-muted rounded-l mr-2",
                    },
                    {
                      value: "collapsed",
                      label: "Collapsed",
                      desc: "Icon-only sidebar, hover to expand",
                      preview: "w-8 h-12 bg-muted rounded-l mr-2",
                    },
                    {
                      value: "floating",
                      label: "Floating",
                      desc: "Floating sidebar with rounded edges",
                      preview: "w-12 h-10 bg-muted rounded ml-2 mr-2",
                    },
                  ].map((style) => (
                    <div
                      key={style.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        branding.sidebarStyle === style.value
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-border"
                      }`}
                      onClick={() =>
                        handleStyleChange("sidebarStyle", style.value)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">
                            {style.label}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {style.desc}
                          </div>
                        </div>

                        {/* Mini layout preview */}
                        <div className="flex items-center">
                          <div className={style.preview}></div>
                          <div className="w-20 h-12 bg-muted rounded-r"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Card Style</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "rounded", label: "Rounded", class: "rounded-lg" },
                    { value: "sharp", label: "Sharp", class: "rounded-none" },
                    {
                      value: "elevated",
                      label: "Elevated",
                      class: "rounded-lg shadow-lg",
                    },
                  ].map((style) => (
                    <div
                      key={style.value}
                      className={`p-3 border cursor-pointer transition-all ${
                        branding.cardStyle === style.value
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-border"
                      } ${style.class}`}
                      onClick={() =>
                        handleStyleChange("cardStyle", style.value)
                      }
                    >
                      <div className="text-center">
                        <div className="font-medium text-sm">{style.label}</div>
                        <div
                          className={`mt-2 w-full h-8 bg-muted ${style.class}`}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Background Pattern</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      value: "none",
                      label: "None",
                      style: { backgroundColor: "hsl(var(--muted))" },
                    },
                    {
                      value: "dots",
                      label: "Dots",
                      style: {
                        backgroundColor: "hsl(var(--muted))",
                        backgroundImage:
                          "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                      },
                    },
                    {
                      value: "lines",
                      label: "Lines",
                      style: {
                        backgroundColor: "hsl(var(--muted))",
                        backgroundImage:
                          "linear-gradient(45deg, hsl(var(--border)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--border)) 25%, transparent 25%)",
                        backgroundSize: "20px 20px",
                      },
                    },
                    {
                      value: "gradient",
                      label: "Gradient",
                      style: {
                        background:
                          "linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--border)) 100%)",
                      },
                    },
                  ].map((pattern) => (
                    <div
                      key={pattern.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        (branding.backgroundPattern || "none") === pattern.value
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-border"
                      }`}
                      onClick={() =>
                        handleStyleChange("backgroundPattern", pattern.value)
                      }
                    >
                      <div className="text-center">
                        <div className="font-medium text-sm mb-2">
                          {pattern.label}
                        </div>
                        <div
                          className="w-full h-12 rounded border"
                          style={pattern.style}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Advanced Customization
              </CardTitle>
              <CardDescription>
                Add custom CSS for advanced styling (optional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Custom CSS</Label>
                  <Textarea
                    value={branding.customCSS || ""}
                    onChange={(e) =>
                      handleStyleChange("customCSS", e.target.value)
                    }
                    placeholder="/* Add your custom CSS here */&#10;.my-custom-class {&#10; /* Custom styles */&#10;}"
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Advanced users can add custom CSS to further customize the
                    appearance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>
            See how your branding choices will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Main Preview */}
            <div
              className="p-6 rounded-lg border relative overflow-hidden"
              style={{
                fontFamily: branding.fontFamily,
                ...(branding.backgroundPattern === "dots" && {
                  backgroundImage:
                    "radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }),
                ...(branding.backgroundPattern === "lines" && {
                  backgroundImage:
                    "linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,0.05) 25%, transparent 25%)",
                  backgroundSize: "20px 20px",
                }),
                ...(branding.backgroundPattern === "gradient" && {
                  background: `linear-gradient(135deg, color-mix(in srgb, ${branding.primaryColor} 6%, transparent), color-mix(in srgb, ${branding.secondaryColor} 6%, transparent))`,
                }),
              }}
            >
              {/* Header Preview */}
              <div
                className={`
                  flex items-center space-x-3 pb-4 mb-4
                  ${branding.headerStyle === "modern" ? "border-b border-border" : ""}
                  ${branding.headerStyle === "classic" ? "border-b-2 border-border" : ""}
                  ${branding.headerStyle === "minimal" ? "" : ""}
                  ${branding.headerStyle === "bold" ? "border-b-4 pb-2" : ""}
                `}
                style={{
                  borderColor:
                    branding.headerStyle === "bold"
                      ? branding.primaryColor
                      : undefined,
                }}
              >
                {branding.logo && (
                  <img src={branding.logo} alt="Logo" className="h-8" />
                )}
                <div
                  className={`
                    text-xl
                    ${branding.headerStyle === "classic" ? "font-serif font-medium" : ""}
                    ${branding.headerStyle === "bold" ? "font-bold" : "font-semibold"}
                    ${branding.headerStyle === "minimal" ? "font-light" : ""}
                  `}
                  style={{ color: branding.primaryColor }}
                >
                  Your Company Name
                </div>
              </div>

              {/* Layout Preview */}
              <div className="flex gap-4">
                {/* Sidebar Preview */}
                <div
                  className={`
                    bg-background/80 border rounded flex flex-col items-center justify-center
                    ${branding.sidebarStyle === "expanded" ? "w-24 p-3" : ""}
                    ${branding.sidebarStyle === "collapsed" ? "w-12 p-2" : ""}
                    ${branding.sidebarStyle === "floating" ? "w-16 p-2 rounded-xl shadow-lg" : ""}
                  `}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${branding.secondaryColor} 12%, transparent)`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded mb-2"
                    style={{ backgroundColor: branding.primaryColor }}
                  ></div>
                  <div
                    className="w-4 h-4 rounded mb-2"
                    style={{ backgroundColor: branding.accentColor }}
                  ></div>
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: branding.secondaryColor }}
                  ></div>
                </div>

                {/* Content Area with Cards */}
                <div className="flex-1 space-y-3">
                  {[1, 2].map((card) => (
                    <div
                      key={card}
                      className={`
                        bg-background p-4 border
                        ${branding.cardStyle === "rounded" ? "rounded-lg" : ""}
                        ${branding.cardStyle === "sharp" ? "rounded-none" : ""}
                        ${branding.cardStyle === "elevated" ? "rounded-lg shadow-lg" : ""}
                      `}
                    >
                      <div
                        className="w-16 h-3 rounded mb-2"
                        style={{ backgroundColor: branding.primaryColor }}
                      ></div>
                      <div className="w-full h-2 bg-muted rounded mb-1"></div>
                      <div className="w-3/4 h-2 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color Palette */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground mb-2">Color Palette</div>
                <div className="flex gap-2">
                  <div
                    className="w-12 h-8 rounded text-primary-foreground text-xs flex items-center justify-center"
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    Primary
                  </div>
                  <div
                    className="w-12 h-8 rounded text-primary-foreground text-xs flex items-center justify-center"
                    style={{ backgroundColor: branding.secondaryColor }}
                  >
                    Secondary
                  </div>
                  <div
                    className="w-12 h-8 rounded text-primary-foreground text-xs flex items-center justify-center"
                    style={{ backgroundColor: branding.accentColor }}
                  >
                    Accent
                  </div>
                </div>
              </div>
            </div>

            {/* Typography Sample */}
            <div
              className="p-4 bg-background rounded-lg border"
              style={{ fontFamily: branding.fontFamily }}
            >
              <div className="text-sm text-muted-foreground mb-2">
                Typography Sample
              </div>
              <h3
                className={`
                  text-lg mb-2
                  ${branding.headerStyle === "classic" ? "font-serif" : ""}
                  ${branding.headerStyle === "bold" ? "font-bold" : "font-semibold"}
                  ${branding.headerStyle === "minimal" ? "font-light" : ""}
                `}
                style={{ color: branding.primaryColor }}
              >
                Sample Heading Text
              </h3>
              <p className="text-foreground text-sm">
                This is how regular paragraph text will appear in your
                application. The font family and header styles create a cohesive
                look throughout your workspace.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
