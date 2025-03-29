"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, useGetAuthHeaders } from "../../../../lib/eden-client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { ArrowLeft, Edit, Search } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Switch } from "../../../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { Badge } from "../../../../components/ui/badge";
import { format } from "date-fns";
import { Input } from "../../../../components/ui/input";

interface Role {
  id: string;
  name: string;
  code: string;
  active: boolean;
  created_at: string;
}

interface Permission {
  id: string;
  slug: string;
  description: string;
  active: boolean;
}

export default function RoleShow() {
  const params = useParams();
  const id = params.id as string;
  const authHeaders = useGetAuthHeaders();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Fetch role data
  const { data: role, isLoading } = useQuery({
    queryKey: ["role", id],
    queryFn: async () => {
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
  const { data: rolePermissions = [] } = useQuery({
    queryKey: ["rolePermissions", id],
    queryFn: async () => {
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
  
  if (isLoading) {
    return <RoleSkeleton />;
  }

  // Фильтрация и группировка прав
  const filteredPermissions = rolePermissions.filter((perm: any) => {
    // Фильтрация по поиску
    const matchesSearch = 
      !searchQuery || 
      perm.permission_slug?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      perm.permission_description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Фильтрация по категории
    const category = perm.permission_slug?.split('_')[0] || 'general';
    const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Получаем уникальные категории для фильтрации
  const categories = rolePermissions.reduce((acc: string[], perm: any) => {
    const category = perm.permission_slug?.split('_')[0] || 'general';
    if (!acc.includes(category)) {
      acc.push(category);
    }
    return acc;
  }, []).sort();

  // Группируем разрешения по категориям для визуализации
  const permissionsByCategory = rolePermissions.reduce((acc: Record<string, any[]>, perm: any) => {
    const category = perm.permission_slug?.split('_')[0] || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/roles">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to roles
          </Link>
        </Button>
        
        <Button asChild>
          <Link href={`/dashboard/roles/edit?id=${id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{role?.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <div className="mt-1">
                    <Switch checked={role?.active} disabled className="ml-2" />
                  </div>
                </div>
                {role?.code && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Code</h3>
                    <p className="mt-1">{role.code}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
                  <p className="mt-1">
                    {role?.created_at ? format(new Date(role.created_at), "dd.MM.yyyy HH:mm") : "N/A"}
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="permissions" className="mt-4">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium">Права доступа</h3>
                  {rolePermissions?.length > 0 && (
                    <Badge variant="secondary">
                      {filteredPermissions.length} из {rolePermissions.length} {rolePermissions.length === 1 ? 'право' : 'прав'}
                    </Badge>
                  )}
                </div>
                
                {/* Компактный список категорий */}
                {rolePermissions?.length > 0 && Object.keys(permissionsByCategory).length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-3">Категории прав:</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge 
                        variant={selectedCategory === 'all' ? "default" : "outline"} 
                        className="cursor-pointer hover:bg-accent/20 transition-colors px-3 py-1"
                        onClick={() => setSelectedCategory('all')}
                      >
                        Все ({rolePermissions.length})
                      </Badge>
                      {Object.entries(permissionsByCategory).map(([category, perms]) => {
                        const permList = perms as any[];
                        return (
                          <Badge 
                            key={category}
                            variant={category === selectedCategory ? "default" : "outline"} 
                            className="cursor-pointer hover:bg-accent/20 transition-colors px-3 py-1"
                            onClick={() => setSelectedCategory(category === selectedCategory ? 'all' : category)}
                          >
                            <span className="capitalize">{category}</span> ({permList.length})
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {rolePermissions?.length > 0 && (
                  <div className="space-y-4">
                    {/* Поиск */}
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
                    
                    {/* Результаты */}
                    {filteredPermissions.length > 0 ? (
                      <>
                        {selectedCategory === 'all' ? (
                          // Группируем права по категориям в режиме "Все категории"
                          <div className="space-y-5">
                            {Object.entries(permissionsByCategory).map(([category, categoryPerms]) => {
                              const permsList = categoryPerms as any[];
                              // Фильтруем разрешения по поисковому запросу
                              const filteredCategoryPerms = permsList.filter(perm => 
                                !searchQuery || 
                                perm.permission_slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                perm.permission_description?.toLowerCase().includes(searchQuery.toLowerCase())
                              );
                              
                              if (filteredCategoryPerms.length === 0) return null;
                              
                              return (
                                <div key={category} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold capitalize">{category}</h4>
                                    <div className="h-px flex-1 bg-border"></div>
                                    <Badge variant="outline" className="text-xs">
                                      {filteredCategoryPerms.length} {filteredCategoryPerms.length === 1 ? 'право' : 'прав'}
                                    </Badge>
                                  </div>
                                  <div className="grid gap-2">
                                    {filteredCategoryPerms.map((perm: any) => (
                                      <div 
                                        key={perm.permission_id} 
                                        className="flex items-center space-x-3 p-2 rounded-md border bg-card hover:bg-accent/5 transition-colors"
                                      >
                                        <div className="flex-1">
                                          <div className="font-medium">{perm.permission_slug || perm.permission_id}</div>
                                          {perm.permission_description && (
                                            <p className="text-sm text-muted-foreground">
                                              {perm.permission_description}
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
                          // Отображаем права выбранной категории в плоском списке
                          <div className="grid gap-2">
                            {filteredPermissions.map((perm: any) => (
                              <div 
                                key={perm.permission_id} 
                                className="flex items-center space-x-3 p-2 rounded-md border bg-card hover:bg-accent/5 transition-colors"
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{perm.permission_slug || perm.permission_id}</div>
                                  {perm.permission_description && (
                                    <p className="text-sm text-muted-foreground">
                                      {perm.permission_description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-md border border-dashed p-6 text-center">
                        <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-muted mb-2">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-4 w-4 text-muted-foreground"
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v4M12 16h.01" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-medium mb-1">Не найдено прав</h3>
                        <p className="text-sm text-muted-foreground">
                          Измените параметры поиска или фильтрации
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {rolePermissions?.length === 0 && (
                  <div className="rounded-md border border-dashed p-8 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 text-muted-foreground"
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium mb-1">Нет назначенных прав</h3>
                    <p className="text-sm text-muted-foreground">
                      Этой роли не назначены права доступа
                    </p>
                    <Button asChild variant="link" size="sm" className="mt-4">
                      <Link href={`/dashboard/roles/edit?id=${id}`}>
                        Назначить права
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-8 w-1/3 bg-slate-200 animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-10 w-1/4 bg-slate-200 animate-pulse rounded mb-6" />
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="h-4 w-16 bg-slate-200 animate-pulse rounded mb-2" />
              <div className="h-6 w-24 bg-slate-200 animate-pulse rounded" />
            </div>
            <div>
              <div className="h-4 w-24 bg-slate-200 animate-pulse rounded mb-2" />
              <div className="h-6 w-32 bg-slate-200 animate-pulse rounded" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-4 w-20 bg-slate-200 animate-pulse rounded mb-2" />
            <div className="h-24 w-full bg-slate-200 animate-pulse rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 