import { useState } from "react";
import {
  useRouterContext,
  useDataProvider,
  useResource,
} from "@refinedev/core";
import {
  ResourceRouterParams,
  BaseRecord,
  CrudSorting,
  CrudFilters,
  MetaDataQuery,
} from "@refinedev/core";
import { userFriendlyResourceName } from "@refinedev/core";
import { Excel } from "./src";
import { TableColumnType } from "antd";
import { MapDataFn } from "@refinedev/core/dist/hooks/export/types";
import { ConfigOptions } from "export-to-csv";

type UseExportOptionsType<
  TData extends BaseRecord = BaseRecord,
  TVariables = any
> = {
  resourceName?: string;
  mapData?: MapDataFn<TData, TVariables>;
  sorter?: CrudSorting;
  filters?: CrudFilters;
  maxItemCount?: number;
  pageSize?: number;
  exportOptions?: ConfigOptions;
  metaData?: MetaDataQuery;
  dataProviderName?: string;
  columns?: TableColumnType<TData>[];
  onError?: (error: any) => void;
};

type UseExportReturnType = {
  isLoading: boolean;
  triggerExport: () => Promise<void>;
};

/**
 * `useExport` hook allows you to make your resources exportable.
 *
 * @see {@link https://refine.dev/docs/core/hooks/import-export/useExport} for more details.
 *
 * @typeParam TData - Result data of the query extends {@link https://refine.dev/docs/api-references/interfaceReferences#baserecord `BaseRecord`}
 * @typeParam TVariables - Values for params.
 *
 */
export const useTableExport = <
  TData extends BaseRecord = BaseRecord,
  TVariables = any
>({
  resourceName,
  sorter,
  filters,
  maxItemCount,
  pageSize = 1000,
  mapData = (item) => item as any,
  exportOptions,
  metaData,
  dataProviderName,
  columns,
  onError,
}: UseExportOptionsType<TData, TVariables> = {}): UseExportReturnType => {
  const [isLoading, setIsLoading] = useState(false);

  const dataProvider = useDataProvider();

  const { useParams } = useRouterContext();

  const { resource: routeResourceName } = useParams<ResourceRouterParams>();
  let { resource: resourceResource } = useResource(routeResourceName);
  let resource = resourceResource?.name;

  if (resourceName) {
    resource = resourceName;
  }

  const filename = `${userFriendlyResourceName(
    resource,
    "plural"
  )}-${new Date().toLocaleString()}`;

  const { getList } = dataProvider(dataProviderName);

  const triggerExport = async () => {
    setIsLoading(true);

    let rawData: BaseRecord[] = [];

    let current = 1;
    let preparingData = true;
    while (preparingData) {
      try {
        console.log("current", {
          resource,
          filters,
          sort: sorter,
          pagination: {
            current,
            pageSize,
          },
          meta: metaData,
        });

        const { data, total } = await getList<TData>({
          resource,
          filters,
          sort: sorter,
          pagination: {
            current,
            pageSize,
          },
          meta: {
            ...metaData,
            extract_all: true,
          },
        });

        current++;
        console.log("total", total);
        console.log("data", data);
        rawData.push(...data);

        if (maxItemCount && rawData.length >= maxItemCount) {
          rawData = rawData.slice(0, maxItemCount);
          preparingData = false;
        }
        console.log(+total === rawData.length);
        if (+total === rawData.length) {
          preparingData = false;
        }
      } catch (error) {
        setIsLoading(false);
        preparingData = false;

        onError?.(error);

        return;
      }
    }

    // const csvExporter = new ExportToCsv({
    //   filename,
    //   useKeysAsHeaders: true,
    //   ...exportOptions,
    // });

    //   csvExporter.generateCsv(rawData.map(mapData as any));

    const filteredColumns: any = columns!.filter((column: any) => {
      if (column.exportable === false) {
        return false;
      }
      return true;
    });
    console.log("filteredColumns", filteredColumns);
    try {
      const excel = new Excel();
      excel
        .addSheet("test")
        .addColumns(filteredColumns)
        .addDataSource(rawData, {
          str2Percent: true,
        })
        .saveAs(filename + ".xlsx");
    } catch (error) {
      console.log("exporting error", error);
    }

    setIsLoading(false);
  };

  return {
    isLoading,
    triggerExport,
  };
};
