import { Suspense } from "react";
import { Workspace } from "@/components/workspace";
import { Loading } from "@/components/primitives";
export default function WorkspaceLayout() {
  return (
    <Suspense fallback={<Loading label="Opening workspace" />}>
      <Workspace />
    </Suspense>
  );
}
