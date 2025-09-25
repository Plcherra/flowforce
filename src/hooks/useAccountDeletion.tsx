
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UseAccountDeletionProps {
  userId: string;
  onSignOut: () => Promise<void>;
}

interface DeletionStats {
  initialCounts: Record<string, number>;
  finalCounts: Record<string, number>;
  totalRecordsDeleted: number;
  executionTimeMs: number;
  deletedTables: string[];
  errors: string[];
}

export function useAccountDeletion({ userId, onSignOut }: UseAccountDeletionProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState(0);
  const [deletionStep, setDeletionStep] = useState('');
  const [deletionComplete, setDeletionComplete] = useState(false);
  const [deletionStats, setDeletionStats] = useState<DeletionStats | null>(null);

  const simulateProgress = () => {
    const steps = [
      'Initializing secure deletion process...',
      'Validating user authentication...',
      'Counting records across all tables...',
      'Handling company ownership transfers...',
      'Deleting user-generated content...',
      'Removing task assignments and workflows...',
      'Cleaning up messages and communications...',
      'Processing financial records...',
      'Deleting forms and submissions...',
      'Removing inventory transactions...',
      'Cascading profile deletion...',
      'Revoking authentication access...',
      'Verifying complete data removal...',
      'Finalizing deletion process...'
    ];
    
    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < steps.length) {
        setDeletionStep(steps[currentStep]);
        // Progress from 0 to 85% during simulation, final 15% when actual deletion completes
        setDeletionProgress(Math.min(85, ((currentStep + 1) / steps.length) * 85));
        currentStep++;
      }
    }, 1500); // Faster progression for better UX

    return progressInterval;
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeletionProgress(0);
    setDeletionStep('Initializing bulletproof account deletion...');
    setDeletionComplete(false);
    setDeletionStats(null);
    
    const progressInterval = simulateProgress();
    const startTime = Date.now();
    
    try {
      // Get the current session to send the auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found - please sign in again');
      }


      // Call the enhanced edge function with better error handling
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      clearInterval(progressInterval);

      if (error) {
        throw new Error(`Deletion service error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Account deletion failed');
      }

      // Set completion state with comprehensive stats
      setDeletionProgress(100);
      setDeletionStep('Account deletion completed successfully!');
      setDeletionComplete(true);
      setDeletionStats(data.deletionStats);

      // Clear all local storage and session storage immediately
      localStorage.clear();
      sessionStorage.clear();

      // Clear any cached data
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }

      // Show comprehensive success message with detailed stats
      toast({
        title: "Account Deleted Successfully",
        description: `Your account and ${data.deletionStats?.totalRecordsDeleted || 'all'} associated records have been permanently deleted across ${data.deletionStats?.deletedTables?.length || 'multiple'} tables. Completed in ${Math.round((data.deletionStats?.executionTimeMs || 0) / 1000)}s.`,
        duration: 8000,
      });

      // Wait to show completion screen, then sign out and redirect
      setTimeout(async () => {
        try {
          // Attempt graceful sign out (will likely fail since auth record is deleted)
          await supabase.auth.signOut({ scope: 'global' });
        } catch (signOutError) {
          // Sign out after deletion expected to fail
        }
        
        // Call the onSignOut callback
        await onSignOut();
        
        // Force redirect to auth page
        window.location.href = '/auth';
      }, 3000);

    } catch (error: any) {
      clearInterval(progressInterval);
      
      const executionTime = Date.now() - startTime;
      
      // For security, still try to sign out even on error
      try {
        await supabase.auth.signOut({ scope: 'global' });
        localStorage.clear();
        sessionStorage.clear();
        await onSignOut();
      } catch (signOutError) {
        // Force sign out error
      }
      
      // Show detailed error message
      toast({
        title: "Deletion Error", 
        description: `${error.message || "Account deletion failed"}. You have been signed out for security. Execution time: ${Math.round(executionTime / 1000)}s. If your account still exists, please contact support.`,
        variant: "destructive",
        duration: 10000,
      });
      
      // Redirect to auth page even on error for security
      setTimeout(() => {
        window.location.href = '/auth';
      }, 2000);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isDeleting,
    deletionProgress,
    deletionStep,
    deletionComplete,
    deletionStats,
    handleDeleteAccount,
  };
}
