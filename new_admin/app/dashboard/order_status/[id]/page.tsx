"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, useGetAuthHeaders } from "../../../../lib/eden-client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../../../components/ui/card";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Badge } from "../../../../components/ui/badge";
import { ArrowLeft, Edit, Trash } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../../../../components/ui/alert-dialog";

interface OrderStatus {
  id: string;
  name: string;
  sort: number;
  color: string;
  finish: boolean;
  cancel: boolean;
  waiting: boolean;
  need_location: boolean;
  on_way: boolean;
  in_terminal: boolean;
  should_pay: boolean;
  yandex_delivery_statuses: string | null;
  code: string | null;
  status_change_text: string | null;
  organization: {
    id: string;
    name: string;
  };
}

export default function OrderStatusDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const authHeaders = useGetAuthHeaders();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: orderStatus, isLoading } = useQuery<OrderStatus>({
    queryKey: ["orderStatus", id],
    // @ts-ignore
    queryFn: async () => {
      try {
        const {data: response} = await apiClient.api.order_status({
          id
        }).get({
          query: {
            fields: [
              "id",
              "name",
              "sort",
              "color",
              "finish",
              "cancel",
              "waiting",
              "need_location",
              "on_way",
              "in_terminal",
              "should_pay",
              "yandex_delivery_statuses",
              "code",
              "status_change_text",
              "organization.id",
              "organization.name",
            ].join(","),
          },
          headers: authHeaders,
        });

        return response?.data;
      } catch (error) {
        toast.error("Failed to fetch order status details", {
          description: "There was an error loading the order status details. Please try again.",
        });
        throw error;
      }
    },
  });

  const handleDelete = async () => {
    // setIsDeleting(true);
    // try {
    //   await apiClient.api.order_status({
    //     id
    //   }).delete({
    //     headers: authHeaders,
    //   });
      
    //   toast.success("Order status deleted successfully");
    //   router.push("/dashboard/order_status");
    // } catch {
    //   toast.error("Failed to delete order status", {
    //     description: "There was an error deleting the order status. Please try again.",
    //   });
    // } finally {
    //   setIsDeleting(false);
    // }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/order_status">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to order statuses
          </Link>
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/order_status/edit?id=${id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the order status
                  and remove it from our servers.
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
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">
              {/* @ts-ignore */}
              {isLoading ? <Skeleton className="h-8 w-1/3" /> : orderStatus?.name}
            </CardTitle>
            <CardDescription>Order Status Details</CardDescription>
          </div>
          {/* @ts-ignore */}
          {!isLoading && orderStatus?.color && (
            <div 
              className="w-8 h-8 rounded-full border border-gray-200"
              // @ts-ignore
              style={{ backgroundColor: orderStatus.color }} 
            />
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-1/4" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Organization</p>
                  {/* @ts-ignore */}
                  <p className="text-lg font-medium">{orderStatus?.organization?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Sort Order</p>
                  {/* @ts-ignore */}
                  <p className="text-lg font-medium">{orderStatus?.sort}</p>
                </div>
              </div>

              {/* @ts-ignore */}
              {(orderStatus?.code || orderStatus?.status_change_text) && (
                <div className="grid grid-cols-2 gap-4">
                  {/* @ts-ignore */}
                  {orderStatus.code && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Code</p>
                      {/* @ts-ignore */}
                      <p className="text-lg font-medium">{orderStatus.code}</p>
                    </div>
                  )}
                  {/* @ts-ignore */}
                  {orderStatus.status_change_text && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status Change Text</p>
                      {/* @ts-ignore */}
                      <p className="text-lg font-medium">{orderStatus.status_change_text}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Status Properties</p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {/* @ts-ignore */}
                      <Badge variant={orderStatus?.finish ? "default" : "outline"}>
                        {/* @ts-ignore */}
                        {orderStatus?.finish ? "Yes" : "No"}
                      </Badge>
                      <span>Finishing status</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* @ts-ignore */}
                      <Badge variant={orderStatus?.cancel ? "default" : "outline"}>
                        {/* @ts-ignore */}
                        {orderStatus?.cancel ? "Yes" : "No"}
                      </Badge>
                      <span>Cancellation status</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* @ts-ignore */}
                      <Badge variant={orderStatus?.waiting ? "default" : "outline"}>
                        {/* @ts-ignore */}
                        {orderStatus?.waiting ? "Yes" : "No"}
                      </Badge>
                      <span>Waiting for customer</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Additional Properties</p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {/* @ts-ignore */}
                      <Badge variant={orderStatus?.need_location ? "default" : "outline"}>
                        {/* @ts-ignore */}
                        {orderStatus?.need_location ? "Yes" : "No"}
                      </Badge>
                      <span>Requires location</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* @ts-ignore */}
                      <Badge variant={orderStatus?.on_way ? "default" : "outline"}>
                        {/* @ts-ignore */}
                        {orderStatus?.on_way ? "Yes" : "No"}
                      </Badge>
                      <span>On the way</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* @ts-ignore */}
                      <Badge variant={orderStatus?.in_terminal ? "default" : "outline"}>
                        {/* @ts-ignore */}
                        {orderStatus?.in_terminal ? "Yes" : "No"}
                      </Badge>
                      <span>In terminal</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* @ts-ignore */}
                      <Badge variant={orderStatus?.should_pay ? "default" : "outline"}>
                        {/* @ts-ignore */}
                        {orderStatus?.should_pay ? "Yes" : "No"}
                      </Badge>
                      <span>Pay to courier</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* @ts-ignore */}
              {orderStatus?.yandex_delivery_statuses && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Yandex Delivery Statuses</p>
                  {/* @ts-ignore */}
                  <p className="text-lg font-medium mt-1">{orderStatus.yandex_delivery_statuses}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 