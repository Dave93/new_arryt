"use client";

import TerminalEdit from "../edit";
import { Suspense } from "react";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Skeleton } from "../../../../components/ui/skeleton";

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Skeleton className="h-4 w-1/4 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-1/4 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          
          <div>
            <Skeleton className="h-4 w-1/4 mb-4" />
            <Skeleton className="h-40 w-full rounded-md" />
          </div>
          
          <Skeleton className="h-10 w-[100px] mt-6" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <TerminalEdit />
    </Suspense>
  );
} 