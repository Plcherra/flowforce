import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Heart, 
  MessageCircle, 
  Eye, 
  Pin, 
  Calendar,
  Bell,
  Newspaper,
  FileText,
  Search,
  Plus,
  Filter
} from 'lucide-react';
import { useCompanyUpdates } from '@/hooks/useCompanyUpdates';
import { useCan } from '@/hooks/useCan';
import { useProfile } from '@/hooks/useProfile';
import { CompanyUpdate } from '@/types/companyUpdates';
import { formatDistanceToNow } from 'date-fns';
import CreateUpdateWizard from '@/components/updates/CreateUpdateWizard';
import { WizardFormData } from '@/components/updates/CreateUpdateWizard';

export default function CompanyUpdates() {
  const isMobile = useIsMobile();
  const { can } = useCan();
  const { profile } = useProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [likedUpdates, setLikedUpdates] = useState<Set<string>>(new Set());
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  
  const { 
    updates, 
    loading, 
    comments, 
    likeUpdate, 
    addComment, 
    markAsViewed,
    createUpdate
  } = useCompanyUpdates();

  const canCreateUpdate = useMemo(() => {
    if (can('systemSettings') || can('manageCompany')) {
      return true;
    }

    const role = (profile?.role || '').toLowerCase();
    return ['owner', 'company_admin', 'admin', 'manager'].includes(role);
  }, [can, profile?.role]);

  const handleUpdateComplete = (formData: WizardFormData) => {
    createUpdate({
      title: formData.title,
      content: formData.content,
      richContent: formData.richContent,
      type: formData.type,
      priority: formData.priority,
      isPinned: false
    });
  };

  const getUpdateIcon = (type: CompanyUpdate['type']) => {
    switch (type) {
      case 'announcement':
        return <Bell className="h-4 w-4" />;
      case 'news':
        return <Newspaper className="h-4 w-4" />;
      case 'event':
        return <Calendar className="h-4 w-4" />;
      case 'policy':
        return <FileText className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: CompanyUpdate['type']) => {
    switch (type) {
      case 'announcement':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'news':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'event':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'policy':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleLike = (updateId: string) => {
    const newLikedUpdates = new Set(likedUpdates);
    if (likedUpdates.has(updateId)) {
      newLikedUpdates.delete(updateId);
    } else {
      newLikedUpdates.add(updateId);
    }
    setLikedUpdates(newLikedUpdates);
    likeUpdate(updateId);
  };

  const handleComment = (updateId: string) => {
    const content = commentInputs[updateId];
    if (content?.trim()) {
      addComment(updateId, content);
      setCommentInputs(prev => ({ ...prev, [updateId]: '' }));
    }
  };

  const toggleComments = (updateId: string) => {
    setShowComments(prev => ({ ...prev, [updateId]: !prev[updateId] }));
  };

  const getUpdateComments = (updateId: string) => {
    return comments.filter(comment => comment.updateId === updateId);
  };

  // Filter and sort updates
  const filteredUpdates = updates
    .filter(update => 
      update.status === 'published' &&
      (update.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       update.content.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
    });

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading updates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-lg">📢</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold">Company Updates</h1>
                  <p className="text-sm text-muted-foreground">Latest news & announcements</p>
                </div>
              </div>
              {canCreateUpdate && (
                <Button 
                  size={isMobile ? "sm" : "default"} 
                  className="shrink-0"
                  onClick={() => setCreateWizardOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {isMobile ? '' : 'New Update'}
                </Button>
              )}
            </div>
            
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search updates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Updates Feed */}
        <div className="px-4 py-6 space-y-4">
          {filteredUpdates.map((update) => {
            const updateComments = getUpdateComments(update.id);
            const isLiked = likedUpdates.has(update.id);
            
            return (
              <Card key={update.id} className={`${update.isPinned ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
                <CardHeader className="pb-3 px-4 pt-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={update.author.avatar} />
                      <AvatarFallback className="text-xs">
                        {update.author.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{update.author.name}</h3>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {update.author.role}
                        </Badge>
                        {update.isPinned && (
                          <Pin className="h-3 w-3 text-primary shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(update.publishDate), { addSuffix: true })}
                        </span>
                        <Badge className={`text-xs ${getTypeColor(update.type)} flex items-center gap-1`}>
                          {getUpdateIcon(update.type)}
                          <span className="capitalize">{update.type}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-4">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-bold mb-2 leading-tight">{update.title}</h2>
                      {update.richContent ? (
                        <div 
                          className="prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: update.richContent }}
                        />
                      ) : (
                        <p className="text-foreground leading-relaxed text-sm">{update.content}</p>
                      )}
                    </div>

                    {/* Engagement Stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground py-2 border-t border-border">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{update.views}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        <span>{update.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{update.comments}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(update.id)}
                        className={`h-8 px-3 ${isLiked ? 'text-red-600 hover:text-red-700' : ''}`}
                      >
                        <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                        <span className="text-xs">Like</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleComments(update.id)}
                        className="h-8 px-3"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs">Comment</span>
                      </Button>
                    </div>

                    {/* Comments Section */}
                    {showComments[update.id] && (
                      <div className="space-y-3 pt-3 border-t border-border">
                        {/* Comment Input */}
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Write a comment..."
                            value={commentInputs[update.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ 
                              ...prev, 
                              [update.id]: e.target.value 
                            }))}
                            className="min-h-[60px] resize-none text-sm"
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleComment(update.id)}
                              disabled={!commentInputs[update.id]?.trim()}
                              className="h-8"
                            >
                              <span className="text-xs">Post</span>
                            </Button>
                          </div>
                        </div>

                        {/* Existing Comments */}
                        {updateComments.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarImage src={comment.author.avatar} />
                              <AvatarFallback className="text-xs">
                                {comment.author.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="bg-muted/50 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-xs truncate">{comment.author.name}</span>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                                <p className="text-xs leading-relaxed">{comment.content}</p>
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 px-2 mt-1">
                                <Heart className="h-3 w-3 mr-1" />
                                <span className="text-xs">{comment.likes}</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredUpdates.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📢</span>
              </div>
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'No updates found' : 'No Updates Yet'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm 
                  ? `No updates match "${searchTerm}"`
                  : 'Company updates and announcements will appear here.'
                }
              </p>
              {!searchTerm && canCreateUpdate && (
                <Button className="mt-6" onClick={() => setCreateWizardOpen(true)}>
                  Create your first update
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <CreateUpdateWizard
        open={createWizardOpen}
        onOpenChange={setCreateWizardOpen}
        onComplete={handleUpdateComplete}
      />
    </div>
  );
}
