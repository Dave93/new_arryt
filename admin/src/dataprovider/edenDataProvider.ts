import { DataProvider, GetListParams } from "@refinedev/core";
import { apiFetch } from "../eden";

export const edenDataProvider: DataProvider = {
  getList: async ({
    resource,
    pagination,
    sorters,
    filters,
    meta,
  }: GetListParams) => {
    const { current, pageSize } = pagination!;
    /**
     * create query params string from meta?.fields
     * meta?.fields possible value is
     * [
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
        {
          organization: ["id", "name"],
        },
      ]
    */
    const fields = meta?.fields
      ?.map((field) => {
        if (typeof field === "string") {
          return `fields=${field}`;
        } else {
          return Object.keys(field).map((key) => {
            // @ts-ignore
            return field[key].map((f) => `fields=${key}.${f}`).join("&");
          });
        }
      })
      .join("&");
    const resourceName = resource as string;

    const query = {
      limit: pageSize,
      offset: (current! - 1) * pageSize!,
      fields: meta?.fields,
      filters: JSON.stringify(filters),
    };

    // @ts-ignore
    if (meta.extract_all) {
      // @ts-ignore
      query.ext_all = 1;
    }

    const { data, error } = (await apiFetch(
      // @ts-ignore
      `/api/${resourceName}`,
      {
        query,
        headers: meta?.requestHeaders,
      }
    )) as {
      data: {
        data: any[];
        total: number;
      } | null;
      error?: any;
    };
    console.log('error', error);
    if (error) throw Error(error?.value);
    return {
      data: data?.data ?? [],
      total: data?.total ?? 0,
    };
  },
  getMany: async ({ resource, ids, metaData }) => {
    // const camelResource = camelCase(resource);

    // const operation = metaData?.operation ?? camelResource;

    // const { query, variables } = gql.query({
    //   operation,
    //   variables: {
    //     where: {
    //       value: { id_in: ids },
    //       type: "JSON",
    //     },
    //   },
    //   fields: metaData?.fields,
    // });

    // const response = await client.request(query, variables);

    return {
      data: [],
    };
  },

  // @ts-ignore
  create: async ({ resource, variables, meta }) => {
    const { data, error } = await apiFetch(
      // @ts-ignore
      `/api/${resource}`,
      {
        method: "POST",
        body: { data: variables, fields: meta?.fields },
        headers: meta?.requestHeaders,
      }
    );
    if (error) throw Error(error?.value);
    return {
      data,
    };
  },

  createMany: async ({ resource, variables, metaData }) => {
    return {
      data: [],
    };
  },

  // @ts-ignore
  update: async ({ resource, id, variables, meta }) => {
    const { data, error } = await apiFetch(
      // @ts-ignore
      `/api/${resource}/${id}`,
      {
        method: "PUT",
        body: { data: variables, fields: meta?.fields },
        headers: meta?.requestHeaders,

      }
    );
    if (error) throw Error(error?.value);
    return {
      data,
    };
  },

  updateMany: async ({ resource, ids, variables, metaData }) => {
    return {
      data: [],
    };
  },

  // @ts-ignore
  getOne: async ({ resource, id, meta }) => {
    const resourceName = resource as string;

    const { data, error } = (await apiFetch(
      // @ts-ignore
      `/api/${resourceName}/${id}`,
      {
        query: {
          fields: meta?.fields,
        },
        headers: meta?.requestHeaders,
      }
    )) as {
      data: {
        data: any[];
      } | null;
      error?: any;
    };
    if (error) throw Error(error?.value);
    return {
      data: data?.data ?? [],
    };
  },

  // @ts-ignore
  deleteOne: async ({ resource, id, metaData }) => {
    return {
      data: {},
    };
  },
  // @ts-ignore
  deleteMany: async ({ resource, ids, metaData }) => {
    return {
      data: {},
    };
  },

  getApiUrl: () => {
    throw Error("Not implemented on refine-graphql data provider.");
  },

  // @ts-ignore
  custom: async ({ url, method, headers, metaData }) => {
    if (metaData) {
      if (metaData.operation) {
        if (method === "get") {
          return {
            data: {},
          };
        } else {
          return {
            data: {},
          };
        }
      } else {
        throw Error("GraphQL operation name required.");
      }
    } else {
      throw Error(
        "GraphQL need to operation, fields and variables values in metaData object."
      );
    }
  },
};
