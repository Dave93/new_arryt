// import { plugin } from "bun";
// import { loadPackageDefinition } from "node_modules/@grpc/grpc-js/build/src/index";
// import { loadSync } from "node_modules/@grpc/proto-loader/build/src/index";
// import protobuf from 'protobufjs';

// await plugin({
//     name: "YAML",
//     async setup(build) {

//         // when a .yaml file is imported...
//         build.onLoad({ filter: /\.proto$/ }, async (args) => {
//             // read and parse the file
//             const text = await Bun.file(args.path).text();
//             const { package: packageName } = protobuf.parse(text);
//             const transactionProtoDefinitionLoader = loadSync(args.path, {
//                 keepCase: true,
//                 longs: String,
//                 enums: String,
//                 defaults: true,
//                 oneofs: true,
//             });
//             const transactionsProto = loadPackageDefinition(transactionProtoDefinitionLoader);
//             console.log('transactionsProto', transactionsProto[packageName])
//             // and returns it as a module
//             return {
//                 exports: transactionsProto[packageName],
//                 loader: "js", // special loader for JS objects
//             };
//         });
//     },
// });


import { plugin } from "bun";
import { loadPackageDefinition } from "node_modules/@grpc/grpc-js/build/src/index";
import { loadSync } from "node_modules/@grpc/proto-loader/build/src/index";
import protobuf from "protobufjs";

await plugin({
    name: "proto-loader",
    async setup(build) {
        // Assume 'protobufjs' is used for parsing .proto files

        build.onLoad({ filter: /\.proto$/ }, async (args) => {
            // Read the .proto file content
            const text = await Bun.file(args.path).text();

            // Use protobuf.js or another library to parse the .proto file
            const root = protobuf.parse(text, {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true,
            });
            const packageName = root.package;
            // console.log('package', root)
            const transactionProtoDefinitionLoader = loadSync(args.path, {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true,
            });
            const transactionsProto = loadPackageDefinition(transactionProtoDefinitionLoader)[packageName];


            // console.log('root.nestedArray', root.nested)
            // Example of converting protobuf definitions to something usable in JS
            // root.nestedArray.forEach((type) => {
            //     if (type instanceof protobuf.Namespace) {

            //     }
            //     if (type instanceof protobuf.Type) {
            //         exports[type.name] = type.toJSON();
            //     }
            // });
            // console.log('exports', exports)
            // Return the parsed .proto definitions as a module
            return {
                exports: { default: transactionsProto },
                loader: "object", // Use the "object" loader to convert the exports to a module
            };
        });
    },
});