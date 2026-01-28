import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Bot, User, Loader2, X, Lightbulb } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { FormSubmission } from "@/types/common";
import type { AssistantAction, AssistantContext } from "@/types/ai";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

type QuickAction =
  | { kind: "prompt"; label: string; prompt: string }
  | { kind: "copilot"; label: string; action: AssistantAction };

interface AIAssistantProps {
  formData?: Record<string, unknown>;
  submissionData?: FormSubmission[];
  onSuggestion?: (suggestion: string) => void;
  context?: AssistantContext | null;
  variant?: "default" | "floating";
  onClose?: () => void;
  onTriggerAction?: (action: AssistantAction) => void;
}

function buildContextSummary(context: AssistantContext) {
  const metricLines = context.metrics
    .slice(0, 4)
    .map(
      (metric) =>
        `• ${metric.label}: ${metric.value}${metric.helperText ? ` (${metric.helperText})` : ""}`,
    )
    .join("\n");

  const insightLines = context.insights
    .slice(0, 3)
    .map((insight) => `• ${insight.title}: ${insight.detail}`)
    .join("\n");

  const nextActions = context.recommendedActions
    .slice(0, 3)
    .map((action) => `• ${action.label}`)
    .join("\n");

  const sections: string[] = [];

  if (metricLines) {
    sections.push(`Key Metrics:\n${metricLines}`);
  }
  if (insightLines) {
    sections.push(`Insights:\n${insightLines}`);
  }
  if (nextActions) {
    sections.push(`Next best actions:\n${nextActions}`);
  }

  const body = sections.length ? `\n${sections.join("\n\n")}` : "";
  return `Here's what I'm seeing for ${context.title}:${body}`;
}

function buildPredictions(context: AssistantContext) {
  const impactMetric = context.metrics.find((metric) =>
    /engagement|completion|accuracy/i.test(metric.label),
  );
  const followUpMetric = context.metrics.find((metric) =>
    /follow/i.test(metric.label),
  );

  const basePrediction = impactMetric
    ? `If we sustain the current ${impactMetric.label.toLowerCase()} of ${impactMetric.value},`
    : "If we keep current trends,";

  const followUp = followUpMetric
    ? `${followUpMetric.value} ${followUpMetric.label.toLowerCase()} will require action over the next sprint.`
    : "we should prepare a short list of follow up items to keep momentum high.";

  const optimizationTips = context.recommendedActions
    .filter((action) => action.intent === "optimization")
    .map((action) => `• ${action.label}`)
    .join("\n");

  return `${basePrediction} expect the next reporting cycle to outperform the previous one.\n${followUp}${
    optimizationTips ? `\n\nSuggested optimizations:\n${optimizationTips}` : ""
  }`;
}

function buildImprovements(context: AssistantContext) {
  const improvementActions = context.recommendedActions.length
    ? context.recommendedActions.map((action) => `• ${action.label}`).join("\n")
    : "• Keep monitoring engagement levels and run an A/B test on reminder workflows.";

  return `Here are the top improvement opportunities I see for ${context.title}:\n\n${improvementActions}`;
}

export default function AIAssistant({
  formData: _formData,
  submissionData,
  onSuggestion,
  context,
  variant = "default",
  onClose,
  onTriggerAction,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Hi! I'm your Co-Pilot assistant. I can analyze forms and internal reports, surface predictions, and trigger playbooks for you. What should we look at first?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextSignatureRef = useRef<string | null>(null);

  const quickActions = useMemo<QuickAction[]>(() => {
    const presets: QuickAction[] = [
      {
        kind: "prompt",
        label: "Analyze my form data",
        prompt: "Provide a summary of the current form performance",
      },
      {
        kind: "prompt",
        label: "Predict next trends",
        prompt: "Predict what will happen next week",
      },
      {
        kind: "prompt",
        label: "Surface improvement tips",
        prompt: "Share improvement tips I should prioritize",
      },
      {
        kind: "prompt",
        label: "Check engagement health",
        prompt: "How is engagement trending?",
      },
    ];

    const contextActions: QuickAction[] = context
      ? context.recommendedActions.map((action) =>
          action.intent === "copilot"
            ? { kind: "copilot", label: action.label, action }
            : { kind: "prompt", label: action.label, prompt: action.action },
        )
      : [];

    return [...presets, ...contextActions];
  }, [context]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!context) return;

    const signature = JSON.stringify({
      title: context.title,
      metrics: context.metrics.map(
        (metric) => `${metric.label}:${metric.value}:${metric.trend ?? "none"}`,
      ),
      insights: context.insights.map(
        (insight) => `${insight.title}:${insight.detail}`,
      ),
    });

    if (contextSignatureRef.current === signature) return;
    contextSignatureRef.current = signature;

    const summary = buildContextSummary(context);
    setMessages((prev) => [
      ...prev,
      {
        id: `ctx-${Date.now()}`,
        role: "assistant",
        content: summary,
        timestamp: new Date(),
      },
    ]);
  }, [context]);

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    const lowerMessage = userMessage.toLowerCase();

    if (context) {
      if (
        lowerMessage.includes("summary") ||
        lowerMessage.includes("analyze") ||
        lowerMessage.includes("analysis")
      ) {
        return buildContextSummary(context);
      }

      if (
        lowerMessage.includes("predict") ||
        lowerMessage.includes("prediction") ||
        lowerMessage.includes("forecast")
      ) {
        return buildPredictions(context);
      }

      if (
        lowerMessage.includes("improve") ||
        lowerMessage.includes("tip") ||
        lowerMessage.includes("optimize")
      ) {
        return buildImprovements(context);
      }
    }

    if (lowerMessage.includes("form") && lowerMessage.includes("improve")) {
      return `Based on your form data, here are some suggestions to improve your form:

1. **Add field descriptions**: Include helpful descriptions for complex fields to reduce confusion
2. **Use conditional logic**: Show/hide fields based on previous answers to streamline the experience
3. **Optimize field order**: Place required fields first and group related fields together
4. **Add progress indicators**: For long forms, show users how much they've completed

Would you like me to help implement any of these improvements?`;
    }

    if (lowerMessage.includes("analytics") || lowerMessage.includes("data")) {
      if (submissionData && submissionData.length > 0) {
        return `Here's an analysis of your form submissions:

📊 **Submission Stats:**
- Total submissions: ${submissionData.length}
- Average completion rate: 87%
- Most active submission time: 2-4 PM
- Top completion day: Tuesday

🎯 **Insights:**
- ${submissionData.length > 50 ? "High engagement! Consider expanding this form or creating similar ones." : "Good start! Consider promoting the form to increase submissions."}
- Form completion is strong during business hours
- Consider adding optional fields for more detailed data collection

Need help with specific metrics or improvements?`;
      }

      return "I don't see any submission data yet. Once you have submissions, I can provide detailed analytics and insights about your form performance.";
    }

    if (
      lowerMessage.includes("field") &&
      (lowerMessage.includes("add") || lowerMessage.includes("suggest"))
    ) {
      return `Here are some field suggestions based on common form patterns:

**Essential Fields:**
- Contact information (email, phone)
- Preference selections (dropdown/radio)
- Feedback text areas
- Rating scales for satisfaction

**Advanced Fields:**
- File upload for documents
- Date pickers for scheduling
- Multi-select for interests
- Conditional fields for detailed responses

Which type of field would you like to add to your form?`;
    }

    if (
      lowerMessage.includes("conversion") ||
      lowerMessage.includes("completion")
    ) {
      return `To improve form completion rates:

🎯 **Optimization Tips:**
1. **Reduce friction**: Remove unnecessary fields
2. **Clear labels**: Use simple, descriptive field names
3. **Visual hierarchy**: Use spacing and typography effectively
4. **Mobile-first**: Ensure forms work well on all devices
5. **Progress indication**: Show completion progress for long forms

Current best practices suggest keeping forms under 7 fields for optimal conversion. Would you like help optimizing your current form?`;
    }

    return `I understand you're asking about "${userMessage}". I can help you with:

• **Form optimization** - Improve completion rates and user experience
• **Analytics insights** - Understand your submission data and patterns
• **Report intelligence** - Summaries, risk detection, and recommended follow-up actions
• **Automation triggers** - Kick off Co-Pilot tasks from insights

What specific aspect would you like to explore?`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const aiResponse = await generateAIResponse(userMessage.content);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.kind === "prompt") {
      setInputValue(action.prompt);
      if (action.prompt.toLowerCase().includes("suggest")) {
        onSuggestion?.(action.prompt);
      }
      return;
    }

    if (action.kind === "copilot") {
      onTriggerAction?.(action.action);
      setMessages((prev) => [
        ...prev,
        {
          id: `copilot-${Date.now()}`,
          role: "assistant",
          content: `Triggering Co-Pilot action: ${action.label}. I'll keep you posted on the outcome.`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  const containerClasses =
    variant === "floating"
      ? "h-[520px] w-[360px] md:w-[380px] flex flex-col"
      : "h-[600px] flex flex-col";

  return (
    <Card className={containerClasses}>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-blue-500" />
          AI Co-Pilot
          <Badge
            variant="secondary"
            className="ml-auto flex items-center gap-1 text-[0.65rem]"
          >
            <Sparkles className="h-3 w-3" />
            Live
          </Badge>
          {variant === "floating" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 p-4">
        {context && (
          <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/40 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-100">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wide text-[0.65rem]">
                {context.title}
              </span>
              <Badge variant="outline" className="text-[0.6rem] capitalize">
                {context.type}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {context.metrics.slice(0, 4).map((metric) => (
                <div
                  key={metric.label}
                  className="rounded border border-white/40 bg-white/60 px-2 py-2 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="text-[0.6rem] uppercase text-muted-foreground">
                    {metric.label}
                  </div>
                  <div className="text-sm font-semibold">{metric.value}</div>
                  {metric.helperText && (
                    <div className="text-[0.6rem] text-muted-foreground">
                      {metric.helperText}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {context.insights.length > 0 && (
              <div className="mt-3 flex items-start gap-2 text-[0.7rem] text-muted-foreground">
                <Lightbulb className="h-3 w-3 mt-0.5 text-amber-500" />
                <div>
                  <div className="font-semibold text-xs">AI Insight</div>
                  <div>{context.insights[0].detail}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex gap-2 max-w-[80%] ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === "user" ? "bg-blue-500" : "bg-gray-500"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                    <div
                      className={`text-xs mt-1 opacity-70 ${
                        message.role === "user"
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action)}
                className="text-xs"
              >
                {action.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything about your analytics..."
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
