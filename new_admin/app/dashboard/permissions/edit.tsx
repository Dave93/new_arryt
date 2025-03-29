"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, useGetAuthHeaders } from "../../../lib/eden-client";
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
import { Switch } from "../../../components/ui/switch";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";

// Define the form schema with validation
const formSchema = z.object({
  slug: z.string().min(1, { message: "Код обязателен" }),
  active: z.boolean().default(false),
  description: z.string().min(1, { message: "Описание обязательно" }),
});

export default function PermissionEdit({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = params.id;
  const authHeaders = useGetAuthHeaders();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: "",
      active: false,
      description: "",
    },
  });

  // Fetch permission data
  const { data: permission, isLoading } = useQuery({
    queryKey: ["permissionEdit", id],
    queryFn: async () => {
      if (!id) return null;
      
      try {
        const {data: response} = await apiClient.api.permissions({id}).get({
          headers: authHeaders,
        });
        
        return response?.data;
      } catch (error) {
        toast.error("Failed to fetch permission", {
          description: "There was an error loading the permission. Please try again.",
        });
        throw error;
      }
    },
    enabled: !!id && !!authHeaders,
  });

  // Update form values when data is loaded
  useEffect(() => {
    if (permission) {
      form.reset({
        slug: permission.slug,
        active: permission.active,
        description: permission.description,
      });
    }
  }, [permission, form]);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!id) return;
    
    setIsSubmitting(true);
    try {
      await apiClient.api.permissions({id}).put({
        // @ts-ignore
        data: values,
        // @ts-ignore
      }, {
        headers: authHeaders,
      });
      
      toast.success("Permission updated successfully");
      router.push("/dashboard/permissions");
    } catch (error) {
      toast.error("Failed to update permission", {
        description: "There was an error updating the permission. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading skeleton could be added here for better UX

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/dashboard/permissions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to permissions
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Permission</CardTitle>
          <CardDescription>
            Update permission details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Permission code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Permission description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Whether this permission is active in the system
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 