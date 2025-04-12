"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "../../../../lib/eden-client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Switch } from "../../../../components/ui/switch";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../../components/ui/alert-dialog";

export default function PermissionDetails() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch permission data
  const { data: permission, isLoading } = useQuery({
    queryKey: ["permission", id],
    queryFn: async () => {
      try {
        const {data: response} = await apiClient.api.permissions({id}).get();
        
        return response?.data;
      } catch (error) {
        toast.error("Failed to fetch permission", {
          description: "There was an error loading the permission. Please try again.",
        });
        throw error;
      }
    },
    enabled: !!id,
  });

  // Handle permission deletion
  const handleDelete = async () => {
    // setIsDeleting(true);
    // try {
      // await apiClient.api.permissions({id}).delete();
      
    //   toast.success("Permission deleted successfully");
    //   router.push("/dashboard/permissions");
    // } catch (error) {
    //   toast.error("Failed to delete permission", {
    //     description: "There was an error deleting the permission. Please try again.",
    //   });
    // } finally {
    //   setIsDeleting(false);
    // }
  };

  if (isLoading) {
    return <PermissionSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/permissions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to permissions
          </Link>
        </Button>
        
        <div className="flex items-center space-x-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/permissions/edit?id=${id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  permission and may affect any roles that use it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Details</CardTitle>
          <CardDescription>
            View information about this permission.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Code</h3>
                <p className="mt-1 text-lg font-medium">{permission?.slug}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
                <p className="mt-1">
                  {permission?.created_at ? format(new Date(permission.created_at), "dd.MM.yyyy HH:mm") : "-"}
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
              <p className="mt-1">{permission?.description}</p>
            </div>
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Active</h3>
              <Switch checked={permission?.active} disabled />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Skeleton loader for the permission details
function PermissionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-32" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-48" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-40" />
              </div>
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 