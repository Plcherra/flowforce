import { createContext, useContext, useMemo, useState } from 'react';
import { subWeeks } from 'date-fns';
import { useCompany } from '@/hooks/useCompany';
import { useProfile } from '@/hooks/useProfile';
import type { DateRange } from '../hooks/useIdeaInsights';

export type IdeaStage = 'identify' | 'diagnose' | 'execute' | 'assess';

export interface IdeaContextValue {
  stage: IdeaStage;
  setStage: (stage: IdeaStage) => void;
  range: DateRange;
  setRange: (range: DateRange) => void;
  companyId: string | undefined;
  activeCycleId: string | null;
  setActiveCycleId: (cycleId: string | null) => void;
}

export const IdeaContext = createContext<IdeaContextValue | null>(null);

interface IdeaProviderProps {
  children: React.ReactNode;
}

export function IdeaProvider({ children }: IdeaProviderProps) {
  const defaultEnd = new Date();
  const [stage, setStage] = useState<IdeaStage>('identify');
  const [range, setRange] = useState<DateRange>({
    start: subWeeks(defaultEnd, 1),
    end: defaultEnd,
  });
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const { company } = useCompany();
  const { profile } = useProfile();

  const normalizeCompanyId = (value: string | null | undefined) => {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const fallbackCompanyId =
    normalizeCompanyId(profile?.company_id) ??
    normalizeCompanyId(profile?.companyId) ??
    normalizeCompanyId(import.meta.env.VITE_DEFAULT_COMPANY_ID);

  const resolvedCompanyId = normalizeCompanyId(company?.id) ?? fallbackCompanyId;

  const value = useMemo<IdeaContextValue>(
    () => ({
      stage,
      setStage,
      range,
      setRange,
      companyId: resolvedCompanyId,
      activeCycleId,
      setActiveCycleId,
    }),
    [activeCycleId, range, resolvedCompanyId, stage],
  );

  return <IdeaContext.Provider value={value}>{children}</IdeaContext.Provider>;
}

export function useIdeaContext(): IdeaContextValue {
  const context = useContext(IdeaContext);
  if (!context) {
    throw new Error('useIdeaContext must be used within an IdeaProvider');
  }
  return context;
}
