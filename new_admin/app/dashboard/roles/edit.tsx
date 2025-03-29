"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";
import { Checkbox } from "../../../components/ui/checkbox";
import { Search } from "lucide-react";

// Define the form schema with validation
const formSchema = z.object({
  name: z.string().min(1, { message: "Название обязательно" }),
  active: z.boolean().default(false),
  code: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

interface Permission {
  id: string;
  slug: string;
  description: string;
  active: boolean;
}

export default function RoleEdit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const authHeaders = useGetAuthHeaders();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissionOptions, setPermissionOptions] = useState<{ value: string; label: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      active: false,
      code: "",
      permissions: [],
    },
  });

  // Fetch permission options for the multi-select
  const { data: permissionsData } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      try {
        const response = await apiClient.api.permissions.index.get({
          query: {
            fields: ["id", "slug", "description", "active"].join(","),
            limit: "100",
            offset: "0",
          },
          headers: authHeaders,
        });
        
        return response?.data?.data || [];
      } catch (error) {
        toast.error("Failed to fetch permissions");
        throw error;
      }
    },
  });

  // Fetch role data
  const { data: role, isLoading } = useQuery({
    queryKey: ["roleEdit", id],
    queryFn: async () => {
      if (!id) return null;
      
      try {
        const response = await apiClient.api.roles({id}).get({
          headers: authHeaders,
        });
        
        return response?.data?.data;
      } catch (error) {
        toast.error("Failed to fetch role", {
          description: "There was an error loading the role. Please try again.",
        });
        throw error;
      }
    },
    enabled: !!id && !!authHeaders,
  });

  // Fetch role permissions
  const { data: rolePermissions } = useQuery({
    queryKey: ["rolePermissions", id],
    queryFn: async () => {
      if (!id) return null;
      
      try {
        const response = await apiClient.api.roles({id}).permissions.get({
          headers: authHeaders,
        });
        
        return response.data?.data || [];
      } catch (error) {
        toast.error("Failed to fetch role permissions");
        throw error;
      }
    },
    enabled: !!id && !!authHeaders,
  });

  // Update form values when data is loaded
  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        active: role.active,
        code: role.code || "",
      });
    }
  }, [role, form]);

  // Update selected permissions when role permissions are loaded
  useEffect(() => {
    if (rolePermissions) {
      const permissionIds = rolePermissions.map((p: any) => p.permission_id);
      setSelectedPermissions(permissionIds);
      form.setValue("permissions", permissionIds);
    }
  }, [rolePermissions, form]);

  // Transform permissions data into format needed for multi-select
  useEffect(() => {
    if (permissionsData) {
      // @ts-ignore
      const options = permissionsData.map((permission: Permission) => ({
        // @ts-ignore
        value: permission.id,
        // @ts-ignore
        label: `${permission.description} (${permission.slug})`,
      }));
      setPermissionOptions(options);
    }
  }, [permissionsData]);

  // Дополнительно группируем права по категориям для улучшенного UI
  const groupedPermissionOptions = useMemo(() => {
    if (!permissionsData) return {};
    // @ts-ignore
    return permissionsData.reduce((acc: Record<string, any[]>, permission: Permission) => {
      // Используем первую часть slug в качестве категории
      const category = permission.slug?.split('_')[0] || 'general';
      
      if (!acc[category]) {
        acc[category] = [];
      }
      
      acc[category].push(permission);
      return acc;
    }, {});
  }, [permissionsData]);

  // Получаем список категорий
  const categories = useMemo(() => {
    return Object.keys(groupedPermissionOptions).sort();
  }, [groupedPermissionOptions]);

  // Фильтруем опции в соответствии с поиском и выбранной категорией
  const filteredOptions = useMemo(() => {
    if (!permissionsData) return [];
    
    // @ts-ignore
    return permissionsData.filter((permission: Permission) => {
      // Фильтрация по поиску
      const matchesSearch = 
        !searchQuery || 
        permission.slug?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        permission.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Фильтрация по категории
      const category = permission.slug?.split('_')[0] || 'general';
      const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [permissionsData, searchQuery, selectedCategory]);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!id) return;
    
    setIsSubmitting(true);
    try {
      // Update role details
      await apiClient.api.roles({id}).put({
        // @ts-ignore
        data: {
          name: values.name,
          active: values.active,
          // @ts-ignore
          code: values.code,
        },
        // @ts-ignore
      }, {
        headers: authHeaders,
      });
      
      // Update role permissions if permissions field exists
      // if (values.permissions) {
      //   await apiClient.api.roles({id}).permissions.post({
      //     // @ts-ignore
      //     data: {
      //       permission_ids: values.permissions,
      //     },
      //     // @ts-ignore
      //     headers: authHeaders,
      //   });
      // }
      
      toast.success("Role updated successfully");
      router.push("/dashboard/roles");
    } catch (error) {
      toast.error("Failed to update role", {
        description: "There was an error updating the role. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionChange = (selectedIds: string[]) => {
    setSelectedPermissions(selectedIds);
    form.setValue("permissions", selectedIds);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/dashboard/roles">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to roles
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Role</CardTitle>
          <CardDescription>
            Update role details and permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Role name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Role code" {...field} />
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
                        Whether this role is active in the system
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

              <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permissions</FormLabel>
                    <FormDescription>
                      Select the permissions that this role should have
                    </FormDescription>
                    
                    {/* Поиск и фильтры */}
                    <div className="flex flex-col space-y-4 mb-4">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="Поиск по правам..."
                          className="pl-8"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      
                      {/* Переключатели категорий */}
                      <div className="flex flex-wrap gap-2">
                        <Badge 
                          variant={selectedCategory === 'all' ? "default" : "outline"} 
                          className="cursor-pointer hover:bg-accent/20 transition-colors px-3 py-1"
                          onClick={() => setSelectedCategory('all')}
                        >
                          Все категории
                        </Badge>
                        {categories.map((category) => (
                          <Badge 
                            key={category}
                            variant={category === selectedCategory ? "default" : "outline"} 
                            className="cursor-pointer hover:bg-accent/20 transition-colors px-3 py-1"
                            onClick={() => setSelectedCategory(category === selectedCategory ? 'all' : category)}
                          >
                            <span className="capitalize">{category}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {selectedCategory === 'all' ? (
                      // Группируем права по категориям
                      <div className="space-y-6 border rounded-md p-4 bg-background max-h-[400px] overflow-y-auto">
                        {categories.map(category => {
                          const categoryPermissions = groupedPermissionOptions[category];
                          // Фильтруем по поиску
                          // @ts-ignore
                          const filteredCategoryPermissions = categoryPermissions.filter(
                            (permission: Permission) => !searchQuery || 
                              permission.slug?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              permission.description?.toLowerCase().includes(searchQuery.toLowerCase())
                          );
                          
                          if (filteredCategoryPermissions.length === 0) return null;
                          
                          return (
                            <div key={category} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold capitalize">{category}</h4>
                                <div className="h-px flex-1 bg-border"></div>
                                <Badge variant="outline" className="text-xs">
                                  {filteredCategoryPermissions.length}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {filteredCategoryPermissions.map((permission: Permission) => (
                                  <div
                                    key={permission.id}
                                    className={`flex items-start p-2 rounded border ${
                                      selectedPermissions.includes(permission.id) 
                                        ? 'bg-primary/5 border-primary/30' 
                                        : 'hover:bg-accent/5'
                                    }`}
                                  >
                                    <Checkbox
                                      id={`permission-${permission.id}`}
                                      checked={selectedPermissions.includes(permission.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          handlePermissionChange([...selectedPermissions, permission.id]);
                                        } else {
                                          handlePermissionChange(
                                            selectedPermissions.filter(id => id !== permission.id)
                                          );
                                        }
                                      }}
                                      className="mr-2 mt-0.5"
                                    />
                                    <div className="space-y-1">
                                      <label
                                        htmlFor={`permission-${permission.id}`}
                                        className="text-sm font-medium leading-none cursor-pointer"
                                      >
                                        {permission.slug}
                                      </label>
                                      {permission.description && (
                                        <p className="text-xs text-muted-foreground">
                                          {permission.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Отображаем только выбранную категорию
                      <div className="border rounded-md p-4 bg-background max-h-[400px] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {/* @ts-ignore */}
                          {filteredOptions.map((permission: Permission) => (
                            <div
                              key={permission.id}
                              className={`flex items-start p-2 rounded border ${
                                selectedPermissions.includes(permission.id) 
                                  ? 'bg-primary/5 border-primary/30' 
                                  : 'hover:bg-accent/5'
                              }`}
                            >
                              <Checkbox
                                id={`permission-${permission.id}`}
                                checked={selectedPermissions.includes(permission.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    handlePermissionChange([...selectedPermissions, permission.id]);
                                  } else {
                                    handlePermissionChange(
                                      selectedPermissions.filter(id => id !== permission.id)
                                    );
                                  }
                                }}
                                className="mr-2 mt-0.5"
                              />
                              <div className="space-y-1">
                                <label
                                  htmlFor={`permission-${permission.id}`}
                                  className="text-sm font-medium leading-none cursor-pointer"
                                >
                                  {permission.slug}
                                </label>
                                {permission.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {permission.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Информация о выбранных правах */}
                    <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                      <div>
                        Выбрано: {selectedPermissions.length} {selectedPermissions.length === 1 ? 'право' : 'прав'}
                      </div>
                      {selectedPermissions.length > 0 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handlePermissionChange([])}
                        >
                          Очистить всё
                        </Button>
                      )}
                    </div>
                    
                    <FormMessage />
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