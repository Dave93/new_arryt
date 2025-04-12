"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../lib/eden-client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Checkbox } from "../../../components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../../components/ui/select";
import { useQuery } from "@tanstack/react-query";

// Define interface for organization
interface Organization {
  id: string;
  name: string;
}

// Define the form schema
const formSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Name is required" }),
  sort: z.coerce.number().min(0, { message: "Sort must be a positive number" }),
  color: z.string().min(1, { message: "Color is required" }),
  organization_id: z.string().min(1, { message: "Organization is required" }),
  yandex_delivery_statuses: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  status_change_text: z.string().optional().nullable(),
  finish: z.boolean().default(false),
  cancel: z.boolean().default(false),
  waiting: z.boolean().default(false),
  need_location: z.boolean().default(false),
  on_way: z.boolean().default(false),
  in_terminal: z.boolean().default(false),
  should_pay: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function OrderStatusEdit({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      name: "",
      sort: 0,
      color: "#ffffff",
      organization_id: "",
      yandex_delivery_statuses: "",
      code: "",
      status_change_text: "",
      finish: false,
      cancel: false,
      waiting: false,
      need_location: false,
      on_way: false,
      in_terminal: false,
      should_pay: false,
    },
  });

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await apiClient.api.organizations.cached.get();
        
        if (response.data && Array.isArray(response.data)) {
          setOrganizations(response.data);
        }
      } catch {
        toast.error("Failed to fetch organizations");
      }
    };

    fetchOrganizations();
  }, []);

  // Fetch order status data with useQuery
  const { isLoading } = useQuery({
    queryKey: ["orderStatusEdit", params.id],
    queryFn: async () => {
      try {
        const {data: response} = await apiClient.api.order_status({
            id: params.id
        }).get({
          query: {
            fields: [
              "id",
              "name",
              "sort",
              "color",
              "organization_id",
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
        });
        
        const data = response?.data;
        if (data) {
          // Set form values
          form.reset({
            id: data.id,
            name: data.name,
            sort: data.sort,
            color: data.color || "#ffffff",
            organization_id: data.organization_id,
            yandex_delivery_statuses: data.yandex_delivery_statuses || "",
            code: data.code || "",
            status_change_text: data.status_change_text || "",
            finish: !!data.finish,
            cancel: !!data.cancel,
            waiting: !!data.waiting,
            need_location: !!data.need_location,
            on_way: !!data.on_way,
            in_terminal: !!data.in_terminal,
            should_pay: !!data.should_pay,
          });
        }
        
        return data;
      } catch (error) {
        toast.error("Failed to fetch order status", {
          description: "There was an error loading the order status details. Please try again.",
        });
        throw error;
      }
    },
    enabled: !!params.id,
  });

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await apiClient.api.order_status({id: params.id}).put({
        // @ts-ignore
        data: values,
      });
      
      toast.success("Order status updated successfully");
      router.push(`/dashboard/order_status/${params.id}`);
    } catch {
      toast.error("Failed to update order status", {
        description: "There was an error updating the order status. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/dashboard/order_status">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to order statuses
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Edit Order Status</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] flex items-center justify-center">
              <p>Loading order status details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href={`/dashboard/order_status/${params.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to order status details
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Order Status</CardTitle>
          <CardDescription>
            Update the order status information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Status name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organization_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Sort order" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="color" 
                            className="w-12 h-10 p-1"
                            {...field} 
                          />
                          <Input 
                            placeholder="Color hex code" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
                              if (colorInput) colorInput.value = e.target.value;
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="yandex_delivery_statuses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yandex Delivery Statuses</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Yandex delivery statuses" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Comma-separated list of Yandex delivery statuses
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Status code" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status_change_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Change Text</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Status change notification text" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Text to display when order status changes to this status
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="finish"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Finishing status</FormLabel>
                        <FormDescription>
                          Mark as a finishing status
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cancel"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Cancellation status</FormLabel>
                        <FormDescription>
                          Mark as a cancellation status
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="waiting"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Waiting status</FormLabel>
                        <FormDescription>
                          Mark as waiting for customer
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="need_location"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Requires location</FormLabel>
                        <FormDescription>
                          Status requires location tracking
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="on_way"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">On the way</FormLabel>
                        <FormDescription>
                          Mark as on the way status
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="in_terminal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">In terminal</FormLabel>
                        <FormDescription>
                          Mark as in terminal status
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="should_pay"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Pay to courier</FormLabel>
                        <FormDescription>
                          Should pay to courier for this status
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 