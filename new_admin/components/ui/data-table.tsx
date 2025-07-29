"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  PaginationState,
  OnChangeFn,
} from "@tanstack/react-table";
import { Button } from "./button";
import { useState } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "./select";
import { Skeleton } from "./skeleton";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  pageSize?: number;
  pageCount?: number;
  pageSizeOptions?: number[];
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  pageSize = 10,
  pageCount,
  pageSizeOptions = [10, 20, 30, 50, 100],
  pagination,
  onPaginationChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  
  // Используем локальную пагинацию, если не передан onPaginationChange
  const [localPagination, setLocalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  });

  // Определяем, используем ли мы серверную или клиентскую пагинацию
  const isServerPagination = !!onPaginationChange;
  
  // Используем переданную пагинацию или локальную
  const paginationState = pagination || localPagination;
  const setPaginationState = onPaginationChange || setLocalPagination;
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Используем getPaginationRowModel только для клиентской пагинации
    ...(isServerPagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    // Для серверной пагинации передаем pageCount
    ...(isServerPagination && pageCount !== undefined ? { manualPagination: true, pageCount } : {}),
    onPaginationChange: setPaginationState,
    state: {
      sorting,
      globalFilter,
      pagination: paginationState,
    },
  });

  // Функция для получения случайной ширины скелетона для более естественного вида
  const getRandomWidth = (colIndex: number) => {
    if (colIndex === columns.length - 1) return "w-16"; // Для колонки с действиями ширина меньше
    
    const widths = ["w-full", "w-4/5", "w-3/4", "w-2/3"];
    return widths[colIndex % widths.length];
  };

  return (
    <div>
      <div className="bg-background rounded-md border overflow-hidden">
        <div className="max-h-[calc(100vh-25rem)] overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b transition-colors hover:bg-muted/50 bg-muted/50">
                  {headerGroup.headers.map((header) => {
                    return (
                      <th 
                        key={header.id} 
                        className="h-9 px-3 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 py-2 bg-muted sticky top-0 z-10"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                // Отображаем скелетоны строк, количество которых соответствует текущему размеру страницы
                Array.from({ length: paginationState.pageSize }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="border-b transition-colors hover:bg-muted/50 *:border-border [&>:not(:last-child)]:border-r">
                    {columns.map((_, colIndex) => (
                      <td key={`skeleton-cell-${colIndex}`} className="p-3 align-middle py-2">
                        <Skeleton className={`h-6 ${getRandomWidth(colIndex)}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted *:border-border [&>:not(:last-child)]:border-r odd:bg-muted/90 odd:hover:bg-muted/90"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-3 align-middle [&:has([role=checkbox])]:pr-0">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-24 text-center p-3"
                  >
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={paginationState.pageSize.toString()}
            onValueChange={(value) => {
              const newSize = Number(value);
              table.setPageSize(newSize);
            }}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder={paginationState.pageSize} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {Math.ceil(table.getPageCount() / paginationState.pageSize) || 1}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}