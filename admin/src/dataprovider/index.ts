import { edenDataProvider } from "./edenDataProvider";
export default edenDataProvider;

export * from "./edenDataProvider";

export {
  GraphQLClient,
  batchRequests,
  gql,
  rawRequest,
  request,
  resolveRequestDocument,
} from "graphql-request";

export type {
  BatchRequestDocument,
  BatchRequestsExtendedOptions,
  BatchRequestsOptions,
  ClientError,
  GraphQLWebSocketClient,
  RawRequestExtendedOptions,
  RawRequestOptions,
  RequestDocument,
  RequestExtendedOptions,
  RequestOptions,
  Variables,
} from "graphql-request";

export * as qqlQueryBuilder from "gql-query-builder";
