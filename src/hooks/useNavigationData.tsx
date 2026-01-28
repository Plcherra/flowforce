import { useNavigationStructure } from "./useNavigationStructure";
import { useActiveNavigation } from "./useActiveNavigation";

// Re-export types for backward compatibility
export type {
  ProcessedNavigationItem,
  ProcessedNavigationSection,
} from "./useActiveNavigation";

export function useNavigationData() {
  const { navigationStructure, canManageSections } = useNavigationStructure();
  const { processedSections, getIsActive } =
    useActiveNavigation(navigationStructure);

  return {
    processedSections,
    canManageSections,
    getIsActive,
  };
}
