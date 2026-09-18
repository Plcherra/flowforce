import { useParams } from "@/lib/router-adapter";
import CountDetailPage from "@/features/inventory/routes/CountDetail";

export default function InventoryCountExecution() {
  const { countId: rawCountId } = useParams<{ countId?: string | string[] }>();
  const countId = Array.isArray(rawCountId) ? rawCountId[0] : rawCountId;

  return <CountDetailPage countId={countId} />;
}
