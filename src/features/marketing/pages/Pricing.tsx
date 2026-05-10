import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Check, Users, Calculator } from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";

const pricingTiers = [
  {
    name: "Free",
    description: "Perfect for small teams getting started",
    monthlyPrice: 0,
    annualPrice: 0,
    userLimit: 5,
    features: [
      "Up to 5 users",
      "Basic scheduling",
      "Task management",
      "Internal messaging",
      "Standard support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Pro",
    description: "Best for growing businesses",
    monthlyPrice: 29,
    annualPrice: 25,
    userLimit: 50,
    features: [
      "Up to 50 users",
      "Advanced scheduling",
      "Custom forms",
      "Analytics & reporting",
      "Priority support",
      "API access",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations",
    monthlyPrice: null,
    annualPrice: null,
    userLimit: null,
    features: [
      "Unlimited users",
      "Custom integrations",
      "Advanced analytics",
      "Dedicated support",
      "SSO & SAML",
      "Custom onboarding",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [calculatorUsers, setCalculatorUsers] = useState(10);
  const navigate = useNavigate();

  const calculatePrice = (users: number) => {
    if (users <= 5) return 0;
    if (users <= 50) return (users - 5) * 5;
    return "Contact Sales";
  };

  const calculatedPrice = calculatePrice(calculatorUsers);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Choose the plan that fits your team size and needs. Start free and
            scale as you grow.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4">
            <span
              className={`font-medium ${!isAnnual ? "text-[#3F51B5]" : "text-gray-500"}`}
            >
              Monthly
            </span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-[#3F51B5]"
            />
            <span
              className={`font-medium ${isAnnual ? "text-[#3F51B5]" : "text-gray-500"}`}
            >
              Annual
            </span>
            <Badge className="bg-green-100 text-green-800 border-green-200">
              Save 15%
            </Badge>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative ${tier.popular ? "border-[#3F51B5] border-2 shadow-xl scale-105" : "border shadow-lg"} hover:shadow-xl transition-all duration-300`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#3F51B5] text-white">
                  Most Popular
                </Badge>
              )}

              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                  {tier.name}
                </CardTitle>
                <CardDescription className="text-gray-600 mb-4">
                  {tier.description}
                </CardDescription>
                <div className="text-4xl font-bold text-gray-900">
                  {tier.monthlyPrice !== null ? (
                    <>
                      ${isAnnual ? tier.annualPrice : tier.monthlyPrice}
                      <span className="text-lg font-normal text-gray-500">
                        /mo
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl">Custom</span>
                  )}
                </div>
                {isAnnual &&
                  tier.monthlyPrice !== null &&
                  tier.monthlyPrice > 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      Save ${(tier.monthlyPrice - tier.annualPrice) * 12}/year
                    </p>
                  )}
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${tier.popular ? "bg-[#3F51B5] hover:bg-[#3F51B5]/90" : "bg-gray-900 hover:bg-gray-800"} text-white`}
                  size="lg"
                  onClick={() => {
                    if (tier.cta === "Contact Sales") {
                      // In a real app, this would open a contact form
                      alert(
                        "Contact sales functionality would be implemented here",
                      );
                    } else {
                      navigate("/company-registration");
                    }
                  }}
                >
                  {tier.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pricing Calculator */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-[#3F51B5]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calculator className="h-8 w-8 text-[#3F51B5]" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
              Pricing Calculator
            </CardTitle>
            <CardDescription>
              Calculate your monthly cost based on team size
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Users: {calculatorUsers}
              </label>
              <input
                type="range"
                min="1"
                max="75"
                value={calculatorUsers}
                onChange={(e) => setCalculatorUsers(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>1</span>
                <span>75+</span>
              </div>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {typeof calculatedPrice === "number" ? (
                  <>
                    ${calculatedPrice}
                    <span className="text-lg font-normal text-gray-500">
                      /month
                    </span>
                  </>
                ) : (
                  calculatedPrice
                )}
              </div>
              <p className="text-gray-600">
                {calculatorUsers <= 5 && "Free tier - perfect for small teams"}
                {calculatorUsers > 5 &&
                  calculatorUsers <= 50 &&
                  `$5 per user above 5 users (${calculatorUsers - 5} × $5)`}
                {calculatorUsers > 50 &&
                  "Enterprise pricing - contact us for a custom quote"}
              </p>
            </div>

            <Button
              className="w-full bg-[#3F51B5] hover:bg-[#3F51B5]/90 text-white"
              size="lg"
              onClick={() => navigate("/company-registration")}
            >
              <Users className="mr-2 h-5 w-5" />
              Get Started with {calculatorUsers} Users
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
