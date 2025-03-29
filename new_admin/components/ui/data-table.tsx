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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Button } from "./button";
import { Input } from "./input";
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

  // Определяем высоту строк таблицы, чтобы избежать скачков при загрузке
  const tableRowsHeight = pagination?.pageSize 
    ? pagination.pageSize <= 5 
      ? pagination.pageSize * 60 
      : 300
    : 300;

  // Функция для получения случайной ширины скелетона для более естественного вида
  const getRandomWidth = (colIndex: number) => {
    if (colIndex === columns.length - 1) return "w-16"; // Для колонки с действиями ширина меньше
    
    const widths = ["w-full", "w-4/5", "w-3/4", "w-2/3"];
    return widths[colIndex % widths.length];
  };

  // Функция для получения разной прозрачности для чередования строк
  const getRowOpacity = (index: number) => {
    return index % 2 === 0 ? "opacity-100" : "opacity-80";
  };

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              // Отображаем скелетоны строк, количество которых соответствует текущему размеру страницы
              Array.from({ length: paginationState.pageSize }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className={getRowOpacity(index)}>
                  {columns.map((column, colIndex) => (
                    <TableCell key={`skeleton-cell-${colIndex}`}>
                      <Skeleton className={`h-6 ${getRandomWidth(colIndex)}`} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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