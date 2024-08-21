
import { credentials, loadPackageDefinition } from '@grpc/grpc-js'

import { loadSync } from '@grpc/proto-loader'
import path from 'path'

const transactionProtoPath = path.resolve(__dirname, '../../../protos', 'arryt.proto');
const transactionProtoDefinitionLoader = loadSync(transactionProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const transactionsProto = loadPackageDefinition(transactionProtoDefinitionLoader).arryt;

export const transactionsClient = new transactionsProto.Transactions(process.env.DUCK_API!, credentials.createInsecure());