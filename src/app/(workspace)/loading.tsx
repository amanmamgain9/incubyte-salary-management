import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";

export default function WorkspaceLoading() {
  return (
    <Card>
      <LoadingState label="Loading" />
    </Card>
  );
}
