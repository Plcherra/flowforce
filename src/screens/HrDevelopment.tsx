import { ArrowRight, Sparkles, Target, Award, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  XPBar,
  BadgesGallery,
  RecognitionFeed,
  GamificationLeaderboard,
} from "@/features/gamification/components";

const summaryBadges = [
  {
    id: "goal-architect",
    name: "Goal Architect",
    description: "Designed five multi-team OKRs with automated nudges.",
    xpValue: 320,
    icon: Target,
    earnedAt: "2 days ago",
  },
  {
    id: "culture-champion",
    name: "Culture Champion",
    description: "Launched peer-to-peer recognition pilots this quarter.",
    xpValue: 180,
    icon: Sparkles,
    earnedAt: "Last week",
  },
  {
    id: "learning-pilot",
    name: "Learning Pilot",
    description: "Completed advanced onboarding tracks in under 14 days.",
    xpValue: 210,
    icon: Shield,
    earnedAt: "4 days ago",
  },
  {
    id: "automation-wave",
    name: "Automation Wave",
    description: "Triggered 10 Copilot challenges via HR automations.",
    xpValue: 150,
    icon: Award,
    earnedAt: null,
    locked: true,
  },
];

const recognitionDemoFeed = [
  {
    id: "rec-1",
    name: "Jordan Chen",
    badgeLabel: "Goal Milestone",
    badgeClassName: "bg-blue-100 text-blue-700",
    message: "Closed FY24 Revenue OKR with cross-functional partnership.",
    xpSnapshot: 180,
    createdAt: new Date().toISOString(),
  },
  {
    id: "rec-2",
    name: "Priya Malik",
    badgeLabel: "Training Completed",
    badgeClassName: "bg-purple-100 text-purple-700",
    message: "Completed CX onboarding with a perfect QA score.",
    xpSnapshot: 120,
    createdAt: new Date().toISOString(),
  },
  {
    id: "rec-3",
    name: "Marcus Hall",
    badgeLabel: "Manual Recognition",
    badgeClassName: "bg-amber-100 text-amber-700",
    message: "Recognized for mentoring peer coaching group.",
    xpSnapshot: 90,
    createdAt: new Date().toISOString(),
  },
];

const leaderboardShowcase = [
  {
    id: "leader-1",
    name: "Alicia Patel",
    xp: 4820,
    goalsCompleted: 7,
    role: "People Partner",
    department: "Operations",
    rank: 1,
  },
  {
    id: "leader-2",
    name: "Noah Griffin",
    xp: 4380,
    goalsCompleted: 5,
    role: "Store Manager",
    department: "Retail",
    rank: 2,
  },
  {
    id: "leader-3",
    name: "Lucia Mendes",
    xp: 4050,
    goalsCompleted: 6,
    role: "Learning Lead",
    department: "HR",
    rank: 3,
  },
  {
    id: "leader-4",
    name: "Devon Wright",
    xp: 3760,
    goalsCompleted: 4,
    role: "Ops Specialist",
    department: "Field Ops",
    rank: 4,
  },
];

export default function HrDevelopment() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-10 px-6 py-16">
        <div className="space-y-3 text-center">
          <Badge variant="secondary" className="text-primary">
            HR & Development
          </Badge>
          <h1 className="text-4xl font-bold text-slate-900">
            Unified XP, Recognition, and Growth
          </h1>
          <p className="text-lg text-slate-600">
            Showcase the culture engine for your teams with XP progress, live
            recognitions, and leaderboard insights connected across modules.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button size="lg" className="gap-2">
              Launch HR Workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              See Platform Tour
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr,0.7fr]">
          <XPBar
            currentXP={6120}
            nextMilestone={{
              label: "Engagement Tier",
              xpRequired: 8000,
              description: "Unlock company-wide recognition broadcasts.",
            }}
            previousMilestone={{ label: "Momentum Reached", xpRequired: 5000 }}
            className="h-full"
          />
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                HR & Development Summary
              </CardTitle>
              <CardDescription>
                Copilot-ready overview of XP, badges, and workforce momentum.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <p>
                Connect recognition automation, training completions, and goal
                progress to a single XP graph. HR & Development keeps every win
                visible while surfacing who is ready for the next challenge.
              </p>
              <ul className="space-y-2">
                <li>
                  • Auto-syncs XP from Goals, Tasks, Learning Center, and Manual
                  shout-outs.
                </li>
                <li>
                  • Highlights badges earned in the last 30 days with locked
                  tiers for upcoming challenges.
                </li>
                <li>
                  • Provides leader-ready reports and Copilot recommendations
                  instantly.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <BadgesGallery
            badges={summaryBadges}
            columns={2}
            title="Badge Journey"
            description="Live snapshot of earned badges plus upcoming tiers."
          />
          <RecognitionFeed
            events={recognitionDemoFeed}
            title="Live Recognition Feed"
            description="Recent milestones and onboarding wins."
            className="h-full"
          />
        </div>

        <GamificationLeaderboard
          entries={leaderboardShowcase}
          title="XP Leaderboard Preview"
          description="Top talent by XP and completed goals for the current quarter."
        />
      </div>
    </div>
  );
}
