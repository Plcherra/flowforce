import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import ProfileOverview from "@/features/profile/components/ProfileOverview";
import ProfileForm from "@/features/profile/components/ProfileForm";
import AccountSecurity from "@/features/profile/components/AccountSecurity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Profile() {
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();
  const { profile, loading, refetchProfile } = useProfile();

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div
      className={`${isMobile ? "p-4 space-y-4" : "p-6 space-y-6 max-w-4xl mx-auto"}`}
    >
      <div>
        <h1
          className={`${isMobile ? "text-2xl" : "text-3xl"} font-bold tracking-tight`}
        >
          Profile Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs
        defaultValue="profile"
        className={`${isMobile ? "space-y-4" : "space-y-6"}`}
      >
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent
          value="profile"
          className={`${isMobile ? "space-y-4" : "space-y-6"}`}
        >
          <div
            className={`grid ${isMobile ? "grid-cols-1 gap-4" : "grid-cols-1 lg:grid-cols-3 gap-6"}`}
          >
            <ProfileOverview profile={profile} userEmail={user?.email} />

            <ProfileForm
              profile={profile}
              userEmail={user?.email}
              userId={user?.id || ""}
              onProfileUpdate={refetchProfile}
            />
          </div>
        </TabsContent>

        <TabsContent
          value="security"
          className={`${isMobile ? "space-y-4" : "space-y-6"}`}
        >
          <AccountSecurity userId={user?.id || ""} onSignOut={signOut} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
