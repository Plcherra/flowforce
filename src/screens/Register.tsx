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
import { useNavigate, Link } from "react-router-dom";

const industries = [
  "Retail",
  "Hospitality",
  "Healthcare",
  "Manufacturing",
  "Technology",
  "Education",
  "Other",
];

const companySizes = [
  "1-5 employees",
  "6-25 employees",
  "26-50 employees",
  "51-100 employees",
  "101-500 employees",
  "500+ employees",
];

export default function Register() {
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
    navigate("/company-registration", {
      state: {
        formData,
        enableCustomTemplates: true,
      },
    });
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center py-12">
      <div className="max-w-2xl w-full mx-auto px-4">
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-8">
            <div className="w-16 h-16 bg-[#3F51B5] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">
              Register Your Company
            </CardTitle>
            <CardDescription className="text-gray-600 text-lg">
              Start your free trial and get your team organized in minutes
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-[#3F51B5]" />
                  Company Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) =>
                        handleInputChange("companyName", e.target.value)
                      }
                      placeholder="Enter your company name"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="industry">Industry *</Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) =>
                        handleInputChange("industry", value)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem
                            key={industry}
                            value={industry.toLowerCase()}
                          >
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="companySize">Company Size *</Label>
                    <Select
                      value={formData.companySize}
                      onValueChange={(value) =>
                        handleInputChange("companySize", value)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {companySizes.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-[#3F51B5]" />
                  Your Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      placeholder="Enter your first name"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      placeholder="Enter your last name"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        placeholder="Enter your email"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        placeholder="Enter your phone"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        placeholder="Create a password"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="address">Company Address</Label>
                    <div className="relative mt-1">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) =>
                          handleInputChange("address", e.target.value)
                        }
                        placeholder="Enter your company address"
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
                <Label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the{" "}
                  <Link to="#" className="text-[#3F51B5] hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="#" className="text-[#3F51B5] hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#3F51B5] hover:bg-[#3F51B5]/90 text-white py-6 text-lg font-semibold"
                disabled={!formData.agreedToTerms}
              >
                Start Free Trial
              </Button>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/auth"
                  className="text-[#3F51B5] hover:underline font-medium"
                >
                  Sign in here
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
