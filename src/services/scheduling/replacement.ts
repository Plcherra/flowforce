import type { Employee } from '@/hooks/useEmployees';

export interface ReplacementCandidate extends Employee {
  score: number;
}

interface GetReplacementCandidatesParams {
  employees: Employee[];
  requiredLevel?: number;
}

export function getReplacementCandidates({
  employees,
  requiredLevel = 1,
}: GetReplacementCandidatesParams): ReplacementCandidate[] {
  return employees
    .map((employee) => {
      const reliability = employee.reliability ?? 0;
      const level = employee.skillLevel ?? 1;
      const meetsLevel = level >= requiredLevel ? 1 : 0;
      const meetsReliability = reliability >= 70 ? 1 : 0;
      const score = reliability + meetsLevel * 25 + meetsReliability * 15 + level * 3;
      return { ...employee, score };
    })
    .sort((a, b) => b.score - a.score);
}

export default getReplacementCandidates;
