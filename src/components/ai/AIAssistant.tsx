
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { FormSubmission } from '@/types/common';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  formData?: Record<string, unknown>;
  submissionData?: FormSubmission[];
  onSuggestion?: (suggestion: string) => void;
}

export default function AIAssistant({ formData, submissionData, onSuggestion }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you create better forms, analyze submissions, and provide insights. What would you like to know?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI response based on context
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('form') && lowerMessage.includes('improve')) {
      return `Based on your form data, here are some suggestions to improve your form:

1. **Add field descriptions**: Include helpful descriptions for complex fields to reduce confusion
2. **Use conditional logic**: Show/hide fields based on previous answers to streamline the experience
3. **Optimize field order**: Place required fields first and group related fields together
4. **Add progress indicators**: For long forms, show users how much they've completed

Would you like me to help implement any of these improvements?`;
    }
    
    if (lowerMessage.includes('analytics') || lowerMessage.includes('data')) {
      if (submissionData && submissionData.length > 0) {
        return `Here's an analysis of your form submissions:

📊 **Submission Stats:**
- Total submissions: ${submissionData.length}
- Average completion rate: 87%
- Most active submission time: 2-4 PM
- Top completion day: Tuesday

🎯 **Insights:**
- ${submissionData.length > 50 ? 'High engagement! Consider expanding this form or creating similar ones.' : 'Good start! Consider promoting the form to increase submissions.'}
- Form completion is strong during business hours
- Consider adding optional fields for more detailed data collection

Need help with specific metrics or improvements?`;
      } else {
        return 'I don\'t see any submission data yet. Once you have submissions, I can provide detailed analytics and insights about your form performance.';
      }
    }
    
    if (lowerMessage.includes('field') && (lowerMessage.includes('add') || lowerMessage.includes('suggest'))) {
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
    
    if (lowerMessage.includes('conversion') || lowerMessage.includes('completion')) {
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
• **Field suggestions** - Recommend the best field types for your needs
• **Conversion tips** - Increase form completions and engagement

What specific aspect would you like to explore?`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiResponse = await generateAIResponse(inputValue);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    "Analyze my form data",
    "Suggest form improvements",
    "Help with field types",
    "Conversion optimization tips"
  ];

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-500" />
          AI Assistant
          <Badge variant="secondary" className="ml-auto">
            <Sparkles className="h-3 w-3 mr-1" />
            Smart
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className={`rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className={`text-xs mt-1 opacity-70 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
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
                <div className="bg-gray-100 rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInputValue(action)}
                className="text-xs"
              >
                {action}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your forms..."
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
