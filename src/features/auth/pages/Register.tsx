import { Trans, useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Users, Mail, Lock, MapPin, Phone } from "lucide-react";
import { Link, useNavigate } from "@/lib/router-adapter";

const industries = [
  { value: "retail", labelKey: "auth.retail" },
  { value: "hospitality", labelKey: "auth.hospitality" },
  { value: "healthcare", labelKey: "auth.healthcare" },
  { value: "manufacturing", labelKey: "auth.manufacturing" },
  { value: "technology", labelKey: "auth.technology" },
  { value: "education", labelKey: "auth.education" },
  { value: "other", labelKey: "auth.other" },
] as const;

const companySizes = [
  { value: "1-5 employees", labelKey: "auth.size1To5" },
  { value: "6-25 employees", labelKey: "auth.size6To25" },
  { value: "26-50 employees", labelKey: "auth.size26To50" },
  { value: "51-100 employees", labelKey: "auth.size51To100" },
  { value: "101-500 employees", labelKey: "auth.size101To500" },
  { value: "500+ employees", labelKey: "auth.size500Plus" },
] as const;

export default function Register() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    companySize: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    agreedToTerms: false,
  });
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would submit to the registration API
    // Navigate to company registration with template building flow
    // Note: Next.js navigation does not support react-router location state.
    // If prefill is needed, persist it (e.g. localStorage) or encode into query params.
    navigate("/company-registration");
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/10 flex items-center justify-center py-12">
      <div className="max-w-2xl w-full mx-auto px-4">
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground">
              {t("auth.registerCompany.title")}</CardTitle>
            <CardDescription className="text-muted-foreground text-lg">
              {t("auth.startYourFreeTrialAndGetYourTeamOrganizedInMinutes")}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-primary" />
                  {t("auth.companyInformation")}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="companyName">{t("auth.companyName")}</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) =>
                        handleInputChange("companyName", e.target.value)
                      }
                      placeholder={t("auth.enterYourCompanyName")}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="industry">{t("auth.industry")}</Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) =>
                        handleInputChange("industry", value)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("auth.selectIndustry")} />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry.value} value={industry.value}>
                            {t(industry.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="companySize">{t("auth.companySize")}</Label>
                    <Select
                      value={formData.companySize}
                      onValueChange={(value) =>
                        handleInputChange("companySize", value)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("auth.selectSize")} />
                      </SelectTrigger>
                      <SelectContent>
                        {companySizes.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {t(size.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  {t("auth.yourInformation")}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">{t("auth.firstName")}</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      placeholder={t("auth.enterYourFirstName")}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">{t("auth.lastName")}</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      placeholder={t("auth.enterYourLastName")}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">{t("auth.emailAddress")}</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        placeholder={t("auth.emailPlaceholder")}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">{t("auth.phoneNumber")}</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        placeholder={t("auth.enterYourPhone")}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="password">{t("auth.password2")}</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        placeholder={t("auth.createAPassword")}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="address">{t("auth.companyAddress")}</Label>
                    <div className="relative mt-1">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) =>
                          handleInputChange("address", e.target.value)
                        }
                        placeholder={t("auth.enterYourCompanyAddress")}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreedToTerms}
                  onCheckedChange={(checked) =>
                    handleInputChange("agreedToTerms", checked as boolean)
                  }
                  required
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground">
                  <Trans
                    i18nKey="auth.agreeToTerms"
                    components={{
                      terms: (
                        <Link to="#" className="text-primary hover:underline" />
                      ),
                      privacy: (
                        <Link to="#" className="text-primary hover:underline" />
                      ),
                    }}
                  />
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg font-semibold"
                disabled={!formData.agreedToTerms}
              >
                {t("auth.startFreeTrial")}</Button>

              <p className="text-center text-sm text-muted-foreground">
                {t("auth.alreadyHaveAccount")}{" "}
                <Link
                  to="/auth"
                  className="text-primary hover:underline font-medium"
                >
                  {t("auth.signInHere")}
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
