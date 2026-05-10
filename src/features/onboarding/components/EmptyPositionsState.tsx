import { Users } from "lucide-react";

export default function EmptyPositionsState() {
  return (
    <div className="text-center py-8 text-gray-500">
      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p>No positions added yet</p>
      <p className="text-xs">Add positions to organize your team structure</p>
    </div>
  );
}
