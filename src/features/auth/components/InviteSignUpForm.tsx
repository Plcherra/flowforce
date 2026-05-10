"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "@/lib/router-adapter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Users, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InviteData } from "@/types/auth";
import { showErrorToast } from "@/utils/errorHandler";

interface InviteSignUpFormProps {
  onSubmit: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  isLoading: boolean;
}

export default function InviteSignUpForm({
  onSubmit,
  isLoading,
}: InviteSignUpFormProps) {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInviteDetails = async () => {
      const inviteCode = searchParams.get("invite");
      if (!inviteCode) return;

      try {
        const { data, error } = await supabase
          .from("company_invites")
          .select("email, first_name, last_name, phone, birth_date, role")
          .eq("invite_token", inviteCode)
          .eq("status", "pending")
          .maybeSingle();

        if (error) {
          showErrorToast(error, "fetching invite details");
          return;
        }

        if (!data) {
          toast({
            title: "Invalid Invitation",
            description: "This invitation link is invalid or has expired.",
            variant: "destructive",
          });
          return;
        }

        setInviteData({
          email: data.email,
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          phone: data.phone || "",
          birthDate: data.birth_date || "",
          role: data.role,
        });
      } catch (error) {
        showErrorToast(error, "fetching invite details");
      } finally {
        setLoading(false);
      }
    };

    fetchInviteDetails();
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData) return;

    await onSubmit(
      inviteData.email,
      password,
      inviteData.firstName,
      inviteData.lastName,
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">
              Loading invitation...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!inviteData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>Invalid or expired invitation link.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>Activate Your Account</CardTitle>
        </div>
        <CardDescription>
          Your account has been pre-created. Set a password to activate it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Pre-filled employee information */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-green-800">
              Your Profile Information
            </h4>
          </div>
          <div className="space-y-2 text-sm text-green-700">
            <p>
              <strong>Name:</strong> {inviteData.firstName}{" "}
              {inviteData.lastName}
            </p>
            <p>
              <strong>Email:</strong> {inviteData.email}
            </p>
            <p>
              <strong>Role:</strong> {inviteData.role}
            </p>
            {inviteData.phone && (
              <p>
                <strong>Phone:</strong> {inviteData.phone}
              </p>
            )}
            {inviteData.birthDate && (
              <p>
                <strong>Birth Date:</strong>{" "}
                {new Date(inviteData.birthDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Create Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a secure password"
              required
              minLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Password must be at least 6 characters long
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Activating account..." : "Activate Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
