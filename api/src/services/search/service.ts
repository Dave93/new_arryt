import { CacheControlService } from "@api/src/modules/cache/service";
import { DB } from "@api/src/lib/db";
import { OrderMobilePeriodStat, OrdersLocationEntity } from "@api/src/services/search/search.dto";
import { and, eq, gte, InferSelectModel, lte, sql } from "drizzle-orm";
import { order_status, order_transactions, orders, users } from "@api/drizzle/schema";
import { getSetting } from "@api/src/utils/settings";
import dayjs from "dayjs";
import Redis from "ioredis";

export class SearchService {
    constructor(
        private readonly cacheControl: CacheControlService,
        private readonly db: DB,
        private readonly redis: Redis,
    ) {
    }


    // check if index exists
    async checkIndexExists(indexName: string): Promise<boolean> {
        // check if elasticsearch index exists using fetch

        const elasticUrl = `${process.env.ELASTICSEARCH_HOST}/${indexName}`;

        const response = await fetch(elasticUrl, {
            method: "HEAD",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
        });
        console.log("response", response);
        return response.status == 200;
    }

    // create indices
    async checkOrderLocationsIndex() {
        try {
            const projectPrefix = process.env.PROJECT_SEARCH_PREFIX;
            const exists = await this.checkIndexExists(`${projectPrefix}_order_locations`);
            const elasticUrl = `${process.env.ELASTICSEARCH_HOST}/${projectPrefix}_order_locations`;

            if (!exists) {
                const indexMapping = {
                    settings: {
                        number_of_shards: 1,
                        number_of_replicas: 0,
                    },
                    mappings: {
                        properties: {
                            order_id: {
                                type: 'keyword',
                            },
                            location: {
                                type: 'geo_point',
                            },
                            terminal_id: {
                                type: 'keyword',
                            },
                            courier_id: {
                                type: 'keyword',
                            },
                            order_status_id: {
                                type: 'keyword',
                            },
                            created_at: {
                                type: 'date',
                            },
                            increment: {
                                type: 'integer',
                            },
                        },
                    },
                };
                const response = await fetch(elasticUrl, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
                    },
                    body: JSON.stringify(indexMapping),
                });
            }
        } catch (e: any) {
            console.log(e.message);
        }
    }

    async checkOrderIndex() {
        try {
            const projectPrefix = process.env.PROJECT_SEARCH_PREFIX;
            const exists = await this.checkIndexExists(`${projectPrefix}_orders`);
            const elasticUrl = `${process.env.ELASTICSEARCH_HOST}/${projectPrefix}_orders`;

            if (!exists) {
                const indexMapping = {
                    settings: {
                        number_of_shards: 1,
                        number_of_replicas: 0,
                    },
                    mappings: {
                        properties: {
                            id: {
                                type: 'keyword',
                            },
                            organization_id: {
                                type: 'keyword',
                            },
                            terminal_id: {
                                type: 'keyword',
                            },
                            courier_id: {
                                type: 'keyword',
                            },
                            order_status_id: {
                                type: 'keyword',
                            },
                            order_number: {
                                type: 'keyword',
                            },
                            created_at: {
                                type: 'date',
                            },
                            cancel_reason: {
                                type: 'text',
                            },
                            score: {
                                type: 'integer',
                            },
                            order_items: {
                                properties: {
                                    productId: {
                                        type: 'keyword',
                                    },
                                    quantity: {
                                        type: 'integer',
                                    },
                                    price: {
                                        type: 'float',
                                    },
                                    name: {
                                        type: 'keyword',
                                    },
                                },
                            },
                            order_price: {
                                type: 'integer',
                            },
                            customer_id: {
                                type: 'keyword',
                            },
                            delivery_address: {
                                type: 'text',
                            },
                            delivery_comment: {
                                type: 'text',
                            },
                            delivery_price: {
                                type: 'integer',
                            },
                            delivery_pricing_id: {
                                type: 'keyword',
                            },
                            delivery_type: {
                                type: 'keyword',
                            },
                            distance: {
                                type: 'float',
                            },
                            duration: {
                                type: 'integer',
                            },
                            finished_date: {
                                type: 'date',
                            },
                            from_location: {
                                type: 'geo_point',
                            },
                            payment_type: {
                                type: 'keyword',
                            },
                            pre_distance: {
                                type: 'float',
                            },
                            pre_duration: {
                                type: 'integer',
                            },
                            to_location: {
                                type: 'geo_point',
                            },
                            orders_couriers: {
                                properties: {
                                    id: {
                                        type: 'keyword',
                                    },
                                    phone: {
                                        type: 'keyword',
                                    },
                                    first_name: {
                                        type: 'keyword',
                                    },
                                    drive_type: {
                                        type: 'keyword',
                                    },
                                    last_name: {
                                        type: 'keyword',
                                    },
                                    car_model: {
                                        type: 'keyword',
                                    },
                                    car_number: {
                                        type: 'keyword',
                                    },
                                    location: {
                                        type: 'geo_point',
                                    },
                                },
                            },
                            orders_customers: {
                                properties: {
                                    id: {
                                        type: 'keyword',
                                    },
                                    phone: {
                                        type: 'keyword',
                                    },
                                    name: {
                                        type: 'keyword',
                                    },
                                },
                            },
                            orders_order_status: {
                                properties: {
                                    id: {
                                        type: 'keyword',
                                    },
                                    name: {
                                        type: 'keyword',
                                    },
                                    cancel: {
                                        type: 'boolean',
                                    },
                                    finish: {
                                        type: 'boolean',
                                    },
                                    waiting: {
                                        type: 'boolean',
                                    },
                                },
                            },
                            orders_terminals: {
                                properties: {
                                    id: {
                                        type: 'keyword',
                                    },
                                    name: {
                                        type: 'keyword',
                                    },
                                    active: {
                                        type: 'boolean',
                                    },
                                    external_id: {
                                        type: 'keyword',
                                    },
                                },
                            },
                            orders_organization: {
                                properties: {
                                    id: {
                                        type: 'keyword',
                                    },
                                    name: {
                                        type: 'keyword',
                                    },
                                    active: {
                                        type: 'boolean',
                                    },
                                    external_id: {
                                        type: 'keyword',
                                    },
                                },
                            },
                        },
                    },
                };
                const response = await fetch(elasticUrl, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
                    },
                    body: JSON.stringify(indexMapping),
                });
            }
        } catch (e: any) {
            console.log(e.message);
        }
    }


    async bulkIndex(map: any[]) {
        const projectPrefix = process.env.PROJECT_SEARCH_PREFIX;
        const elasticUrl = `${process.env.ELASTICSEARCH_HOST}/${projectPrefix}_order_locations/_bulk`;

        const bulk = map.flatMap((doc) => [
            { index: { _index: `${projectPrefix}_order_locations` } },
            doc,
        ]);

        const response = await fetch(elasticUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: bulk.join("\n") + "\n",
        });
        console.log("response", response);
    }

    async search(indexName: string, query: any) {
        const projectPrefix = process.env.PROJECT_SEARCH_PREFIX;
        const elasticUrl = `${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`;

        const response = await fetch(elasticUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(query),
        });
        const json = await response.json();
        return json.hits.hits;
    }

    async indexOrder(order: any) {
        const projectPrefix = process.env.PROJECT_SEARCH_PREFIX;
        const elasticUrl = `${process.env.ELASTICSEARCH_HOST}/${projectPrefix}_orders/_doc/${order.id}`;

        await this.checkOrderIndex();

        if (order.from_lat) {
            order['from_location'] = {
                lat: order.from_lat,
                lon: order.from_lon,
            };
            delete order.from_lat;
            delete order.from_lon;
        }
        if (order.to_lat) {
            order['to_location'] = {
                lat: order.to_lat,
                lon: order.to_lon,
            };
            delete order.to_lat;
            delete order.to_lon;
        }

        if (order['orders_couriers']) {
            if (order['orders_couriers'].latitude) {
                order['orders_couriers']['location'] = {
                    lat: order['orders_couriers'].latitude,
                    lon: order['orders_couriers'].longitude,
                };
                delete order['orders_couriers'].latitude;
                delete order['orders_couriers'].longitude;
            }
        }

        const response = await fetch(elasticUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(order),
        });
        console.log("response", response);
    }

    async findOrderLocations(orderId: string) {
        const projectPrefix = process.env.PROJECT_SEARCH_PREFIX;
        const elasticUrl = `${process.env.ELASTICSEARCH_HOST}/${projectPrefix}_order_locations/_search`;

        const query = {
            query: {
                match: {
                    order_id: orderId,
                },
            },
            size: 10000,
            sort: [
                {
                    increment: {
                        order: 'asc',
                    },
                },
            ],
        };

        const response = await fetch(elasticUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(query),
        });
        const json = await response.json();
        return json.hits.hits as OrdersLocationEntity[];
    }

    async orderMobilePeriodStat(user: InferSelectModel<typeof users>) {
        const orderStatuses = await this.cacheControl.getOrderStatuses();
        const finishedStatuses = orderStatuses.filter((status) => status.finish).map((status) => status.id);
        const canceledStatuses = orderStatuses.filter((status) => status.cancel).map((status) => status.id);
        const currentUser = await this.cacheControl.getUser(user.id);

        const finishedMatch: { match_phrase: { order_status_id: string } }[] = [];
        finishedStatuses.forEach((status) => {
            finishedMatch.push({ match_phrase: { order_status_id: status } });
        });

        const canceledMatch: { match_phrase: { order_status_id: string } }[] = [];
        canceledStatuses.forEach((status) => {
            canceledMatch.push({ match_phrase: { order_status_id: status } });
        });

        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_orders`;

        const searches = [
            // orders for today
            { index: indexName },
            {
                aggs: {},
                size: 0,
                fields: [
                    {
                        field: 'created_at',
                        format: 'date_time',
                    },
                ],
                script_fields: {},
                stored_fields: ['*'],
                runtime_mappings: {},
                _source: {
                    excludes: [],
                },
                query: {
                    bool: {
                        must: [],
                        filter: [
                            {
                                match_phrase: {
                                    courier_id: user.id,
                                },
                            },
                            {
                                range: {
                                    created_at: {
                                        gte: 'now/d',
                                        lte: 'now+1d/d+4h',
                                    },
                                },
                            },
                            {
                                bool: {
                                    minimum_should_match: 1,
                                    should: finishedMatch,
                                },
                            },
                        ],
                        should: [],
                        must_not: [],
                    },
                },
            },

            { index: indexName },
            {
                aggs: {},
                size: 0,
                fields: [
                    {
                        field: 'created_at',
                        format: 'date_time',
                    },
                ],
                script_fields: {},
                stored_fields: ['*'],
                runtime_mappings: {},
                _source: {
                    excludes: [],
                },
                query: {
                    bool: {
                        must: [],
                        filter: [
                            {
                                match_phrase: {
                                    courier_id: user.id,
                                },
                            },
                            {
                                range: {
                                    created_at: {
                                        gte: 'now/d',
                                        lte: 'now+1d/d+4h',
                                    },
                                },
                            },
                            {
                                bool: {
                                    minimum_should_match: 1,
                                    should: canceledMatch,
                                },
                            },
                        ],
                        should: [],
                        must_not: [],
                    },
                },
            },

            { index: indexName },
            {
                aggs: {
                    delivery_price: {
                        sum: {
                            field: 'delivery_price',
                        },
                    },
                },
                size: 0,
                fields: [
                    {
                        field: 'created_at',
                        format: 'date_time',
                    },
                ],
                script_fields: {},
                stored_fields: ['*'],
                runtime_mappings: {},
                _source: {
                    excludes: [],
                },
                query: {
                    bool: {
                        must: [],
                        filter: [
                            {
                                match_phrase: {
                                    courier_id: user.id,
                                },
                            },
                            {
                                range: {
                                    created_at: {
                                        gte: 'now/d',
                                        lte: 'now+1d/d+4h',
                                    },
                                },
                            },
                            {
                                bool: {
                                    minimum_should_match: 1,
                                    should: finishedMatch,
                                },
                            },
                        ],
                        should: [],
                        must_not: [],
                    },
                },
            },

            // orders for this yesterday
            { index: indexName },
            {
                aggs: {},
                size: 0,
                fields: [
                    {
                        field: 'created_at',
                        format: 'date_time',
                    },
                ],
                script_fields: {},
                stored_fields: ['*'],
                runtime_mappings: {},
                _source: {
                    excludes: [],
                },
                query: {
                    bool: {
                        must: [],
                        filter: [
                            {
                                match_phrase: {
                                    courier_id: user.id,
                                },
                            },
                            {
                                range: {
                                    created_at: {
                                        gte: 'now-1d/d',
                                        lte: 'now-1d/d+4h',
                                    },
                                },
                            },
                            {
                                bool: {
                                    minimum_should_match: 1,
                                    should: finishedMatch,
                                },
                            },
                        ],
                        should: [],
                        must_not: [],
                    },
                },
            },

            { index: indexName },
            {
                aggs: {},
                size: 0,
                fields: [
                    {
                        field: 'created_at',
                        format: 'date_time',
                    },
                ],
                script_fields: {},
                stored_fields: ['*'],
                runtime_mappings: {},
                _source: {
                    excludes: [],
                },
                query: {
                    bool: {
                        must: [],
                        filter: [
                            {
                                match_phrase: {
                                    courier_id: user.id,
                                },
                            },
                            {
                                range: {
                                    created_at: {
                                        gte: 'now-1d/d',
                                        lte: 'now-1d/d+4h',
                                    },
                                },
                            },
                            {
                                bool: {
                                    minimum_should_match: 1,
                                    should: canceledMatch,
                                },
                            },
                        ],
                        should: [],
                        must_not: [],
                    },
                },
            },

            { index: indexName },
            {
                aggs: {
                    delivery_price: {
                        sum: {
                            field: 'delivery_price',
                        },
                    },
                },
                size: 0,
                fields: [
                    {
                        field: 'created_at',
                        format: 'date_time',
                    },
                ],
                script_fields: {},
                stored_fields: ['*'],
                runtime_mappings: {},
                _source: {
                    excludes: [],
                },
                query: {
                    bool: {
                        must: [],
                        filter: [
                            {
                                match_phrase: {
                                    courier_id: user.id,
                                },
                            },
                            {
                                range: {
                                    created_at: {
                                        gte: 'now-1d/d',
                                        lte: 'now-1d/d+4h',
                                    },
                                },
                            },
                            {
                                bool: {
                                    minimum_should_match: 1,
                                    should: finishedMatch,
                                },
                            },
                        ],
                        should: [],
                        must_not: [],
                    },
                },
            },

            // orders for this week
            { index: indexName },
            {
                aggs: {},
                size: 0,
                fields: [
                    {
                        field: 'created_at',
                        format: 'date_time',
                    },
                ],
                script_fields: {},
                stored_fields: ['*'],
                runtime_mappings: {},
                _source: {
                    excludes: [],
                },
                query: {
                    bool: {
                        must: [],
                        filter: [
                            {
                                match_phrase: {
                                    courier_id: user.id,
                                },
                            },
                            {
                                range: {
                                    created_at: {
                                        gte: 'now/w',
                                        lte: 'now/w+1d+4h',
                                    },
                                },
                            },
                            {
                                bool: {
                                    minimum_should_match: 1,
                                    should: finishedMatch,
                                },
                            },
                        ],
                        should: [],
                        must_not: [],
                    },
                },
            },

            { index: indexName },
            {
                aggs: {},
                size: 0,
                fields: [
                    {
                        field: 'created_at',
                        format: 'date_time',
                    },
                ],
                script_fields: {},
                stored_fields: ['*'],
                runtime_mappings: {},
                _source: {
                    excludes: [],
                },
                query: {
                    bool: {
                        must: [],
                        filter: [
                            {
                                match_phrase: {
                                    courier_id: user.id,
                                },
                            },
                            {
                                range: {
                                    created_at: {
                                        gte: 'now/w',
                                        lte: 'now/w+1d+4h',
                                    },
                                },
                            },
                            {
                                bool: {
                                    minimum_should_match: 1,
                                    should: canceledMatch,
                                },
                            },
                        ],
                        should: [],
                        must_not: [],
                    },
                },
            },

            { index: indexName },
            {
                aggs: {
                    delivery_price: {
                        sum: {
                            field: 'delivery_price',
                        },
                    },
                },
                size: 0,
                fields: [
                    {
                        field: 'created_at',
                        format: 'date_time',
                    },
                ],
                script_fields: {},
                stored_fields: ['*'],
                runtime_mappings: {},
                _source: {
                    excludes: [],
                },
                query: {
                    bool: {
                        must: [],
                        filter: [
                            {
                                match_phrase: {
                                    courier_id: user.id,
                                },
                            },
                            {
                                range: {
                                    created_at: {
                                        gte: 'now/w',
                                        lte: 'now/w+1d+4h',
                                    },
                                },
                            },
                            {
                                bool: {
                                    minimum_should_match: 1,
                                    should: finishedMatch,
                                },
                            },
                        ],
                        should: [],
                        must_not: [],
                    },
                },
            },

            // orders for this month
            { index: indexName },
            {
                aggs: {},
                size: 0,
                fields: [
                    {
                        field: 'created_at',
                        format: 'date_time',
                    },
                ],
                script_fields: {},
                stored_fields: ['*'],
                runtime_mappings: {},
                _source: {
                    excludes: [],
                },
                query: {
                    bool: {
                        must: [],
                        filter: [
                            {
                                match_phrase: {
                                    courier_id: user.id,
                                },
                            },
                            {
                                range: {
                                    created_at: {
                                        gte: 'now/M-5h',
                                        lte: 'now/M+1d+4h',
                                    },
                                },
                            },
                            {
                                bool: {
                                    minimum_should_match: 1,
                                    should: finishedMatch,
                                },
                            },
                        ],
                        should: [],
                        must_not: [],
                    },
                },
            },

            { index: indexName },
            {
                aggs: {},
                size: 0,
                fields: [
                    {
                        field: 'created_at',
                        format: 'date_time',
                    },
                ],
                script_fields: {},
                stored_fields: ['*'],
                runtime_mappings: {},
                _source: {
                    excludes: [],
                },
                query: {
                    bool: {
                        must: [],
                        filter: [
                            {
                                match_phrase: {
                                    courier_id: user.id,
                                },
                            },
                            {
                                range: {
                                    created_at: {
                                        gte: 'now/M-5h',
                                        lte: 'now/M+1d+4h',
                                    },
                                },
                            },
                            {
                                bool: {
                                    minimum_should_match: 1,
                                    should: canceledMatch,
                                },
                            },
                        ],
                        should: [],
                        must_not: [],
                    },
                },
            },

            { index: indexName },
            {
                aggs: {
                    delivery_price: {
                        sum: {
                            field: 'delivery_price',
                        },
                    },
                },
                size: 0,
                fields: [
                    {
                        field: 'created_at',
                        format: 'date_time',
                    },
                ],
                script_fields: {},
                stored_fields: ['*'],
                runtime_mappings: {},
                _source: {
                    excludes: [],
                },
                query: {
                    bool: {
                        must: [],
                        filter: [
                            {
                                match_phrase: {
                                    courier_id: user.id,
                                },
                            },
                            {
                                range: {
                                    created_at: {
                                        gte: 'now/M-5h',
                                        lte: 'now/M+1d+4h',
                                    },
                                },
                            },
                            {
                                bool: {
                                    minimum_should_match: 1,
                                    should: finishedMatch,
                                },
                            },
                        ],
                        should: [],
                        must_not: [],
                    },
                },
            },
        ];

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/_msearch`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-ndjson',
            },
            body: searches.map((search) => JSON.stringify(search)).join('\n') + '\n',
        });

        const result = await resultJson.json();

        const { responses }: { responses: any[] } = result;

        const res: OrderMobilePeriodStat[] = [];
        const data: OrderMobilePeriodStat = {
            failedCount: 0,
            successCount: 0,
            totalPrice: 0,
            orderPrice: 0,
            bonusPrice: 0,
            fuelPrice: 0,
            labelCode: '',
        };

        // get sum of amount of order_transactions where transaction_type is 'order_bonus' for today
        let workStartHour = await getSetting(this.redis, "work_start_time");
        workStartHour = new Date(workStartHour).getHours();
        let workEndHour = await getSetting(this.redis, "work_end_time");
        workEndHour = new Date(workEndHour).getHours();
        const currentHour = new Date().getHours();

        // getting sum of amount for today
        const todaySum = await this.db.select({
            amount: sql<number>`sum(amount) as amount`,
        }).from(order_transactions).where(and(
            eq(order_transactions.courier_id, user.id),
            eq(order_transactions.transaction_type, 'order_bonus'),
            gte(order_transactions.created_at, currentHour < workStartHour ? dayjs().subtract(1, 'day').set('hour', workStartHour).toISOString() : dayjs().set('hour', workStartHour).toISOString()),
            lte(order_transactions.created_at, currentHour > workStartHour ? dayjs().add(1, 'day').set('hour', workEndHour).toISOString() : dayjs().set('hour', workEndHour).toISOString()),
        ));

        const yesterdaySum = await this.db.select({
            amount: sql<number>`sum(amount) as amount`,
        }).from(order_transactions).where(and(
            eq(order_transactions.courier_id, user.id),
            eq(order_transactions.transaction_type, 'order_bonus'),
            gte(order_transactions.created_at, currentHour < workStartHour ? dayjs().subtract(2, 'day').set('hour', workStartHour).toISOString() : dayjs().subtract(1, 'day').set('hour', workStartHour).toISOString()),
            lte(order_transactions.created_at, currentHour > workStartHour ? dayjs().set('hour', workEndHour).toISOString() : dayjs().subtract(1, 'day').set('hour', workEndHour).toISOString()),
        ));

        const thisWeekSum = await this.db.select({
            amount: sql<number>`sum(amount) as amount`,
        }).from(order_transactions).where(and(
            eq(order_transactions.courier_id, user.id),
            eq(order_transactions.transaction_type, 'order_bonus'),
            gte(order_transactions.created_at, dayjs().startOf('week').toISOString()),
            lte(order_transactions.created_at, dayjs().endOf('week').toISOString()),
        ));

        const thisMonthSum = await this.db.select({
            amount: sql<number>`sum(amount) as amount`,
        }).from(order_transactions).where(and(
            eq(order_transactions.courier_id, user.id),
            eq(order_transactions.transaction_type, 'order_bonus'),
            gte(order_transactions.created_at, dayjs().startOf('month').toISOString()),
            lte(order_transactions.created_at, dayjs().endOf('month').toISOString()),
        ));

        const todayDailyGarantSum = await this.db.select({
            amount: sql<number>`sum(amount) as amount`,
        }).from(order_transactions).where(and(
            eq(order_transactions.courier_id, user.id),
            eq(order_transactions.transaction_type, 'daily_garant'),
            gte(order_transactions.created_at, currentHour < workStartHour ? dayjs().subtract(1, 'day').set('hour', workStartHour).toISOString() : dayjs().set('hour', workStartHour).toISOString()),
            lte(order_transactions.created_at, currentHour > workStartHour ? dayjs().add(1, 'day').set('hour', workEndHour).toISOString() : dayjs().set('hour', workEndHour).toISOString()),
        ));

        const yesterdayDailyGarantSum = await this.db.select({
            amount: sql<number>`sum(amount) as amount`,
        }).from(order_transactions).where(and(
            eq(order_transactions.courier_id, user.id),
            eq(order_transactions.transaction_type, 'daily_garant'),
            gte(order_transactions.created_at, currentHour < workStartHour ? dayjs().subtract(2, 'day').set('hour', workStartHour).toISOString() : dayjs().subtract(1, 'day').set('hour', workStartHour).toISOString()),
            lte(order_transactions.created_at, currentHour > workStartHour ? dayjs().set('hour', workEndHour).toISOString() : dayjs().subtract(1, 'day').set('hour', workEndHour).toISOString()),
        ));

        const thisWeekDailyGarantSum = await this.db.select({
            amount: sql<number>`sum(amount) as amount`,
        }).from(order_transactions).where(and(
            eq(order_transactions.courier_id, user.id),
            eq(order_transactions.transaction_type, 'daily_garant'),
            gte(order_transactions.created_at, dayjs().startOf('week').toISOString()),
            lte(order_transactions.created_at, dayjs().endOf('week').toISOString()),
        ));

        const thisMonthDailyGarantSum = await this.db.select({
            amount: sql<number>`sum(amount) as amount`,
        }).from(order_transactions).where(and(
            eq(order_transactions.courier_id, user.id),
            eq(order_transactions.transaction_type, 'daily_garant'),
            gte(order_transactions.created_at, dayjs().startOf('month').toISOString()),
            lte(order_transactions.created_at, dayjs().endOf('month').toISOString()),
        ));

        let index = 0;
        responses.map((response, i) => {
            if (index == 0) {
                // @ts-ignore
                data.successCount = response.hits.total.value;
            }
            if (index == 1) {
                // @ts-ignore
                data.failedCount = response.hits.total.value;
            }

            if (index == 2) {
                index = 0;

                switch (res.length) {
                    case 0:
                        // @ts-ignore
                        data.bonusPrice = todaySum[0].amount ?? 0;
                        data.fuelPrice = 0;
                        if (currentUser.user.daily_garant_id) {
                            data.dailyGarantPrice = todayDailyGarantSum[0].amount ?? 0;
                        }
                        break;
                    case 1:
                        // @ts-ignore
                        data.bonusPrice = yesterdaySum[0].amount ?? 0;
                        data.fuelPrice = 0;
                        if (currentUser.user.daily_garant_id) {
                            data.dailyGarantPrice = yesterdayDailyGarantSum[0].amount ?? 0;
                        }
                        break;
                    case 2:
                        // @ts-ignore
                        data.bonusPrice = thisWeekSum._sum.amount ?? 0;
                        data.fuelPrice = 0;
                        if (currentUser.user.daily_garant_id) {
                            data.dailyGarantPrice = thisWeekDailyGarantSum[0].amount ?? 0;
                        }
                        break;
                    case 3:
                        // @ts-ignore
                        data.bonusPrice = thisMonthSum._sum.amount ?? 0;
                        data.fuelPrice = 0;
                        if (currentUser.user.daily_garant_id) {
                            data.dailyGarantPrice = thisMonthDailyGarantSum[0].amount ?? 0;
                        }
                        break;
                }
                if (data.bonusPrice) {
                    // @ts-ignore
                    data.totalPrice = response.aggregations.delivery_price.value + data.bonusPrice;
                } else {
                    // @ts-ignore
                    data.totalPrice = response.aggregations.delivery_price.value;
                }

                if (data.fuelPrice) {
                    // @ts-ignore
                    data.totalPrice = data.totalPrice + data.fuelPrice;
                }

                if (data.dailyGarantPrice) {
                    // @ts-ignore
                    data.totalPrice = data.totalPrice + data.dailyGarantPrice;
                }

                // @ts-ignore
                data.orderPrice = response.aggregations.delivery_price.value;
                switch (res.length) {
                    case 0:
                        data.labelCode = 'today';
                        break;
                    case 1:
                        data.labelCode = 'yesterday';
                        break;
                    case 2:
                        data.labelCode = 'week';
                        break;
                    case 3:
                        data.labelCode = 'month';
                        break;
                }
                res.push({ ...data });
            } else {
                index++;
            }
        });

        return res;

    }

    async getCourierScore(id: string) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_orders`;

        const body = {
            aggs: {
                '0': {
                    avg: {
                        field: 'score',
                    },
                },
            },
            size: 0,
            fields: [
                {
                    field: 'created_at',
                    format: 'date_time',
                },
                {
                    field: 'finished_date',
                    format: 'date_time',
                },
            ],
            script_fields: {},
            stored_fields: ['*'],
            runtime_mappings: {},
            _source: {
                excludes: [],
            },
            query: {
                bool: {
                    must: [],
                    filter: [
                        {
                            match_phrase: {
                                courier_id: id,
                            },
                        },
                        {
                            range: {
                                created_at: {
                                    gte: 'now/M',
                                    lte: 'now/M',
                                },
                            },
                        },
                    ],
                    should: [],
                    must_not: [],
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        // @ts-ignore
        return result.aggregations['0'].value ?? 0;
    }

    async getCouriersEfficiency(startDate: Date, endDate: Date, user: InferSelectModel<typeof users>, courierId: string[], terminalId: string[]) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_orders`;
        const body = {
            size: 0,
            query: {
                range: {
                    created_at: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            },
            aggs: {
                by_courier: {
                    terms: {
                        field: 'courier_id',
                    },
                    aggs: {
                        by_interval: {
                            filters: {
                                filters: {
                                    '10_to_15': {
                                        range: {
                                            created_at: {
                                                gte: dayjs(startDate.toISOString().split('T')[0]).hour(10).minute(0).second(0).toISOString(),
                                                lte: dayjs(startDate.toISOString().split('T')[0]).hour(15).minute(0).second(0).toISOString(),
                                            },
                                        },
                                    },
                                    '15_to_22': {
                                        range: {
                                            created_at: {
                                                gte: dayjs(startDate.toISOString().split('T')[0]).hour(15).minute(0).second(0).toISOString(),
                                                lte: dayjs(startDate.toISOString().split('T')[0]).hour(22).minute(0).second(0).toISOString(),
                                            },
                                        },
                                    },
                                    '22_to_3': {
                                        bool: {
                                            should: [
                                                {
                                                    range: {
                                                        created_at: {
                                                            gte: dayjs(startDate.toISOString().split('T')[0])
                                                                .hour(22)
                                                                .minute(0)
                                                                .second(0)
                                                                .toISOString(),
                                                            lte: dayjs(endDate.toISOString().split('T')[0])
                                                                .hour(15)
                                                                .minute(0)
                                                                .second(0)
                                                                .toISOString(),
                                                        },
                                                    },
                                                },
                                                {
                                                    range: {
                                                        created_at: {
                                                            gte: dayjs(startDate.toISOString().split('T')[0])
                                                                .hour(0)
                                                                .minute(0)
                                                                .second(0)
                                                                .toISOString(),
                                                            lte: dayjs(startDate.toISOString().split('T')[0])
                                                                .hour(3)
                                                                .minute(0)
                                                                .second(0)
                                                                .toISOString(),
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                },
                            },
                            aggs: {
                                total_orders: {
                                    sum: {
                                        field: 'order_count',
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        return await resultJson.json();
    }

    async ensureIndexExists(indexName: string, mapping: any) {
        const elasticUrl = `${process.env.ELASTICSEARCH_HOST}/${indexName}`;

        const response = await fetch(elasticUrl, {
            method: "HEAD",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
        });

        if (response.status == 200) {
            return;
        }

        const indexMapping = {
            settings: {
                number_of_shards: 1,
                number_of_replicas: 0,
            },
            mappings: {
                properties: mapping,
            },
        };
        const response2 = await fetch(elasticUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(indexMapping),
        });

        return response.status == 200;
    }

    async createNotification(notification: any) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_notifications`;
        const elasticUrl = `${process.env.ELASTICSEARCH_HOST}/${indexName}/_doc/${notification.id}`;

        await this.ensureIndexExists(indexName, {
            properties: {
                created_at: { type: 'date' },
                body: {
                    type: 'text',
                },
                title: {
                    type: 'text',
                },
                send_at: {
                    type: 'date',
                },
                status: {
                    type: 'keyword',
                },
                read_user_ids: {
                    type: 'keyword',
                },
                receiver_user_ids: {
                    type: 'keyword',
                },
                role: {
                    type: 'keyword',
                },
                sent_user_ids: {
                    type: 'keyword',
                },
                public: {
                    type: 'boolean',
                },
            },
        });

        const responseJson = await fetch(elasticUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(notification),
        });

        const response = await responseJson.json();

        // get this added document by getting id from response
        const notificationJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_doc/${response._id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
        });

        const notificationResponse = await notificationJson.json();

        return {
            ...notificationResponse._source,
            id: notificationResponse._id,
        };

    }

    async getOrdersByIds(ids: string[]) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_orders`;

        const body = {
            size: 10000,
            query: {
                terms: {
                    _id: ids,
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => hit._source);
    }

    async getOrdersByIdsAndOrganizationId(ids: string[], organizationId: string) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_orders`;

        const body = {
            size: 10000,
            query: {
                bool: {
                    must: [
                        {
                            terms: {
                                order_number: ids,
                            },
                        },
                        {
                            term: {
                                organization_id: organizationId,
                            },
                        },
                    ],
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => hit._source);
    }

    async getOrderByNumberAndOrganizationId(orderNumber: string, organizationId: string) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_orders`;

        const body = {
            size: 1,
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                order_number: orderNumber,
                            },
                        },
                        {
                            term: {
                                organization_id: organizationId,
                            },
                        },
                    ],
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => hit._source)[0];
    }

    async getAllNotifications(filters: {
        field: string;
        operator: string;
        value: string;
    }[], take: number, skip: number) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_notifications`;
        const query: {
            bool: {
                must: any[];
                filter: any[];
                should: any[];
                must_not: any[];
            };
        } = {
            bool: {
                must: [],
                filter: [],
                should: [],
                must_not: [],
            },
        };

        filters.forEach((filter) => {
            switch (filter.operator) {
                case 'eq':
                    query.bool.filter.push({
                        term: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'gte':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                gte: filter.value,
                            },
                        },
                    });
                    break;
                case 'lte':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                lte: filter.value,
                            },
                        },
                    });
                    break;
                case 'gt':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                gt: filter.value,
                            },
                        },
                    });
                    break;
                case 'lt':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                lt: filter.value,
                            },
                        },
                    });
                    break;
                case 'match':
                    query.bool.filter.push({
                        match: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'match_phrase':
                    query.bool.filter.push({
                        match_phrase: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'match_phrase_prefix':
                    query.bool.filter.push({
                        match_phrase_prefix: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'exists':
                    query.bool.filter.push({
                        exists: {
                            field: filter.field,
                        },
                    });
                    break;
                case 'wildcard':
                    query.bool.filter.push({
                        wildcard: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
            }
        });

        const body = {
            size: take,
            from: skip,
            query,
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => ({
            ...hit._source,
            id: hit._id,
        }));
    }

    async getAllMissedOrders(filters: {
        field: string;
        operator: string;
        value: string;
    }[], skip: number) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_missed_orders`;
        const query: {
            bool: {
                must: any[];
                filter: any[];
                should: any[];
                must_not: any[];
            };
        } = {
            bool: {
                must: [],
                filter: [],
                should: [],
                must_not: [],
            },
        };

        filters.forEach((filter) => {
            switch (filter.operator) {
                case 'eq':
                    query.bool.filter.push({
                        term: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'gte':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                gte: filter.value,
                            },
                        },
                    });
                    break;
                case 'lte':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                lte: filter.value,
                            },
                        },
                    });
                    break;
                case 'gt':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                gt: filter.value,
                            },
                        },
                    });
                    break;
                case 'lt':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                lt: filter.value,
                            },
                        },
                    });
                    break;
                case 'match':
                    query.bool.filter.push({
                        match: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'match_phrase':
                    query.bool.filter.push({
                        match_phrase: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'match_phrase_prefix':
                    query.bool.filter.push({
                        match_phrase_prefix: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'exists':
                    query.bool.filter.push({
                        exists: {
                            field: filter.field,
                        },
                    });
                    break;
                case 'wildcard':
                    query.bool.filter.push({
                        wildcard: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
            }
        });

        const body = {
            size: 800,
            from: skip,
            query: {
                function_score: {
                    query,
                    functions: [
                        {
                            filter: {
                                term: {
                                    status: 'new',
                                },
                            },
                            weight: 2,
                        },
                    ],
                    score_mode: 'multiply',
                },
            },
            sort: [
                {
                    _score: {
                        order: 'desc',
                    },
                },
            ],
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => ({
            ...hit._source,
            id: hit._id,
        }));
    }

    async notificationsConnection(filters: {
        field: string;
        operator: string;
        value: string;
    }[]) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_notifications`;
        const query: {
            bool: {
                must: any[];
                filter: any[];
                should: any[];
                must_not: any[];
            };
        } = {
            bool: {
                must: [],
                filter: [],
                should: [],
                must_not: [],
            },
        };

        filters.forEach((filter) => {
            switch (filter.operator) {
                case 'eq':
                    query.bool.filter.push({
                        term: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'gte':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                gte: filter.value,
                            },
                        },
                    });
                    break;
                case 'lte':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                lte: filter.value,
                            },
                        },
                    });
                    break;
                case 'gt':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                gt: filter.value,
                            },
                        },
                    });
                    break;
                case 'lt':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                lt: filter.value,
                            },
                        },
                    });
                    break;
                case 'match':
                    query.bool.filter.push({
                        match: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'match_phrase':
                    query.bool.filter.push({
                        match_phrase: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'match_phrase_prefix':
                    query.bool.filter.push({
                        match_phrase_prefix: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'exists':
                    query.bool.filter.push({
                        exists: {
                            field: filter.field,
                        },
                    });
                    break;
                case 'wildcard':
                    query.bool.filter.push({
                        wildcard: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
            }
        });

        const body = {
            query,
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return {
            _count: {
                id: result.hits.total.value,
            },
        }
    }

    async missedOrdersConnection(filters: {
        field: string;
        operator: string;
        value: string;
    }[]) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_missed_orders`;
        const query: {
            bool: {
                must: any[];
                filter: any[];
                should: any[];
                must_not: any[];
            };
        } = {
            bool: {
                must: [],
                filter: [],
                should: [],
                must_not: [],
            },
        };

        filters.forEach((filter) => {
            switch (filter.operator) {
                case 'eq':
                    query.bool.filter.push({
                        term: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'gte':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                gte: filter.value,
                            },
                        },
                    });
                    break;
                case 'lte':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                lte: filter.value,
                            },
                        },
                    });
                    break;
                case 'gt':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                gt: filter.value,
                            },
                        },
                    });
                    break;
                case 'lt':
                    query.bool.filter.push({
                        range: {
                            [filter.field]: {
                                lt: filter.value,
                            },
                        },
                    });
                    break;
                case 'match':
                    query.bool.filter.push({
                        match: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'match_phrase':
                    query.bool.filter.push({
                        match_phrase: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'match_phrase_prefix':
                    query.bool.filter.push({
                        match_phrase_prefix: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
                case 'exists':
                    query.bool.filter.push({
                        exists: {
                            field: filter.field,
                        },
                    });
                    break;
                case 'wildcard':
                    query.bool.filter.push({
                        wildcard: {
                            [filter.field]: filter.value,
                        },
                    });
                    break;
            }
        });

        const body = {
            query,
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return {
            _count: {
                id: result.hits.total.value,
            },
        }
    }

    async searchOrgOrders(orgId: string, terminalIds: string[], orderStatusIds: string[]) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_orders`;

        const body = {
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                organization_id: orgId,
                            },
                        },
                        {
                            terms: {
                                terminal_id: terminalIds,
                            },
                        },
                        {
                            terms: {
                                status_id: orderStatusIds,
                            },
                        },
                        {
                            range: {
                                created_at: {
                                    gte: 'now-14d/d',
                                    lt: 'now+2d/d',
                                },
                            },
                        },
                    ],
                    must_not: [
                        {
                            exists: {
                                field: 'courier_id',
                            },
                        },
                    ],
                },
            },
            sort: [{ created_at: 'asc' }],
            from: 0,
            size: 200,
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => hit._source);
    }

    async searchTerminalsOrders(terminalIds: string[], orderStatusIds: string[]) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_orders`;

        const body = {
            query: {
                bool: {
                    must: [
                        {
                            terms: {
                                terminal_id: terminalIds,
                            },
                        },
                        {
                            terms: {
                                status_id: orderStatusIds,
                            },
                        },
                        {
                            range: {
                                created_at: {
                                    gte: 'now-14d/d',
                                    lt: 'now+2d/d',
                                },
                            },
                        },
                    ],
                    must_not: [
                        {
                            exists: {
                                field: 'courier_id',
                            },
                        },
                    ],
                },
            },
            sort: [{ created_at: 'asc' }],
            from: 0,
            size: 200,
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => hit._source);
    }

    async searchNewOrdersForLastHour() {
        const minutes = getSetting(this.redis, 'late_order_time');
        const terminals = await this.cacheControl.getTerminals();
        const activeTerminals = terminals.filter((t) => t.active);
        const terminalIds = activeTerminals.map((t) => t.id);
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_orders`;

        const body = {
            query: {
                bool: {
                    must: [
                        {
                            range: {
                                created_at: {
                                    gte: 'now-2h/h',
                                    lte: `now-${+minutes}m/m`,
                                },
                            },
                        },
                        {
                            terms: {
                                terminal_id: terminalIds,
                            },
                        },
                    ],
                    must_not: [
                        {
                            exists: {
                                field: 'courier_id',
                            },
                        },
                    ],
                },
            },
            sort: [{ created_at: 'asc' }],
            from: 0,
            size: 2000,
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => hit._source);
    }

    async logMissedOrders(ordersParam: InferSelectModel<typeof orders>[], system_minutes_config: number) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_missed_orders`;
        for (const order of ordersParam) {
            // check if order exists in missed_orders index
            const body = {
                query: {
                    bool: {
                        must: [
                            {
                                term: {
                                    order_id: order.id,
                                },
                            },
                        ],
                    },
                },
            };

            const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const result = await resultJson.json();

            if (result.hits.total.value == 0) {
                // insert into missed_orders index
                const missedOrder = {
                    organization_id: order.organization_id,
                    terminal_id: order.terminal_id,
                    order_id: order.id,
                    order_number: order.order_number,
                    system_minutes_config,
                    created_at: new Date(),
                    order_created_at: order.created_at,
                    status: 'new',
                    payment_type: order.payment_type,
                };

                const missedOrderJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_doc`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(missedOrder),
                });

                const missedOrderResult = await missedOrderJson.json();
            }
        }
    }

    async updateMissedOrder(id: string, status: string, user: InferSelectModel<typeof users>) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_missed_orders`;

        const body = {
            doc: {
                status,
                updated_at: new Date(),
                updated_by: {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                }
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_update/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();
        return result;
    }

    async myNotifications(user: InferSelectModel<typeof users>) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_notifications`;
        const body = {
            query: {
                bool: {
                    must: [
                        {
                            terms: {
                                receiver_user_ids: [user.id],
                            },
                        },
                        {
                            range: {
                                send_at: {
                                    lte: 'now',
                                },
                            },
                        },
                    ],
                },
            },
            sort: [{ send_at: 'desc' }],
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => ({
            ...hit._source,
            id: hit._id,
            is_read: hit._source.read_user_ids ? hit._source.read_user_ids.includes(user.id) : false,
        }));
    }

    async myUnreadNotifications(user: InferSelectModel<typeof users>) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_notifications`;
        const body = {
            query: {
                bool: {
                    must: [
                        {
                            terms: {
                                receiver_user_ids: [user.id],
                            },
                        },
                        {
                            range: {
                                send_at: {
                                    lte: 'now',
                                },
                            },
                        },
                        {
                            bool: {
                                must_not: {
                                    terms: {
                                        read_user_ids: [user.id],
                                    },
                                },
                            },
                        },
                    ],
                },
            },
            sort: [{ send_at: 'desc' }],
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();
        return result.hits.total.value;
    }

    async markAsRead(id: string, user: InferSelectModel<typeof users>) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_notifications`;

        const body = {
            script: {
                source:
                    'if (ctx._source.read_user_ids == null) { ctx._source.read_user_ids = [params.user_id] } else { ctx._source.read_user_ids.add(params.user_id) }',
                lang: 'painless',
                params: {
                    user_id: user.id,
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_update/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();
        return result;
    }

    async deleteNotification(id: string) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_notifications`;

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_doc/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const result = await resultJson.json();
        return result;
    }

    async getMyLastOrder(userId: string) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_orders`;

        const orderStatuses = await this.cacheControl.getOrderStatuses();
        const organizationsOrderStatuses = orderStatuses.filter((s) => !s.finish && !s.cancel);

        const body = {
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                courier_id: userId,
                            },
                        },
                        {
                            terms: {
                                order_status_id: organizationsOrderStatuses.map((orderStatus) => orderStatus.id),
                            },
                        },
                        {
                            range: {
                                created_at: {
                                    lte: 'now',
                                    gte: 'now-1d/d',
                                },
                            },
                        },
                    ],
                },
            },
            sort: [{ created_at: 'desc' }],
            size: 1,
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();
        return result.hits.hits[0]?._source;
    }

    async indexYandexDeliveryOrder(id: string, yandexResponse: any = {}, pricingData: any = {}, user: InferSelectModel<typeof users>) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_yandex_delivery_orders`;
        const body = {
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                order_id: id,
                            },
                        },
                    ],
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        if (result.hits.hits.length > 0) {
            if (yandexResponse && Object.keys(yandexResponse).length > 0) {
                const body = {
                    script: {
                        source: 'ctx._source.order_data = params.order_data',
                        lang: 'painless',
                        params: {
                            order_data: yandexResponse,
                        },
                    },
                };

                const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_update/${result.hits.hits[0]._id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });
            } else if (pricingData && Object.keys(pricingData).length > 0) {
                const body = {
                    script: {
                        source: 'ctx._source.pricing_data = params.pricing_data',
                        lang: 'painless',
                        params: {
                            pricing_data: pricingData,
                        },
                    },
                };

                const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_update/${result.hits.hits[0]._id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

            }
        } else {
            if (yandexResponse && Object.keys(yandexResponse).length > 0) {
                const body = {
                    created_at: new Date(),
                    order_id: id,
                    order_data: yandexResponse,
                    pricing_data: {},
                    user_id: user.id,
                };

                const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_doc`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });
            } else if (pricingData && Object.keys(pricingData).length > 0) {
                const body = {
                    created_at: new Date(),
                    order_id: id,
                    order_data: {},
                    pricing_data: pricingData,
                    user_id: user.id,
                };

                const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_doc`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });
            }
        }
    }

    async deleteYandexDeliveryOrder(id: string) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_yandex_delivery_orders`;
        const body = {
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                order_id: id,
                            },
                        },
                    ],
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        const result = await resultJson.json();

        if (result.hits.hits.length > 0) {
            const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_doc/${result.hits.hits[0]._id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }
    }

    async getYandexDeliveryData(orderIds: string[]) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_yandex_delivery_orders`;
        const body = {
            size: 200,
            query: {
                bool: {
                    must: [
                        {
                            terms: {
                                order_id: orderIds,
                            },
                        },
                    ],
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => ({ id: hit._id, ...hit._source }));
    }

    async getYandexDeliveryOrders(yesterday: Date, today: Date) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_yandex_delivery_orders`;
        const body = {
            size: 5000,
            query: {
                bool: {
                    must: [
                        {
                            range: {
                                created_at: {
                                    gte: yesterday,
                                    lte: today,
                                },
                            },
                        },
                    ],
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => ({ id: hit._id, ...hit._source }));
    }

    async getYandexDeliveryByOrderId(orderId: string) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_yandex_delivery_orders`;
        const body = {
            size: 1,
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                order_id: orderId,
                            },
                        },
                    ],
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => ({ id: hit._id, ...hit._source }))[0];
    }

    async removeAcceptedYandexDeliveryByOrderId(orderId: string) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_yandex_delivery_orders`;
        try {
            const body = {
                size: 1,
                query: {
                    term: {
                        order_id: orderId,
                    },
                },
            };

            // get this added document by getting id from response

            const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
                },
                body: JSON.stringify(body),
            });

            const res = await resultJson.json();

            if (res.hits.hits.length > 0) {
                const order: any = res.hits.hits.map((hit: any) => ({ id: hit._id, ...hit._source }))[0];
                if (order.order_data && order.order_data.id) {
                    const yandexUrl = `https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/claims/cancel?claim_id=${order.order_data.id}`;
                    await fetch(yandexUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${process.env.YANDEX_DELIVERY_TOKEN}`,
                        },
                    });

                    // delete from elasticsearch
                    const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_doc/${order.id}`, {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
                        },
                    });
                }
            }
            return true;
        } catch (e) {
            return false;
        }

    }

    async updateYandexDeliveryOrders(
        yandexOrdersForUpdate: {
            order_id: string;
            order_data: any;
        }[],
    ) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_yandex_delivery_orders`;
        // bulk update

        const body = yandexOrdersForUpdate.flatMap((order) => [
            { update: { _id: order.order_id, _index: indexName } },
            {
                script: {
                    source: 'ctx._source.order_data = params.order_data',
                    lang: 'painless',
                    params: {
                        order_data: order.order_data,
                    },
                },
            },
        ]).map((search) => JSON.stringify(search)).join('\n') + '\n';

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_bulk`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body,
        });
    }

    async getSentReportByCodeAndDate(courierWithdraws: string, startDate: string, endDate: string) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_sent_reports`;
        const body = {
            size: 1,
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                report_code: courierWithdraws,
                            },
                        },
                        {
                            range: {
                                created_at: {
                                    gte: startDate,
                                    lte: endDate,
                                },
                            },
                        },
                    ],
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => ({ id: hit._id, ...hit._source }));
    }

    async saveSentReport(param: { created_at: Date; report_code: string }) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_sent_reports`;
        const body = {
            created_at: param.created_at,
            report_code: param.report_code,
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_doc`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(body),
        });
    }

    async getDocumentsByQuery(indexName: string, param2: any) {
        const body = {
            size: 10000,
            ...param2,
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return result.hits.hits.map((hit: any) => ({ id: hit._id, ...hit._source }));
    }

    async getOrderLocationLastIncrement(indexName: string) {
        const body = {
            size: 1,
            query: {
                match_all: {},
            },
            sort: [
                {
                    increment: {
                        order: 'desc',
                    },
                },
            ],
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/order_locations/_search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(body),
        });

        const result = await resultJson.json();

        return result.hits.hits[0]._source.increment;
    }

    async bulkUpdate(bulkUpdateBody: any[]) {
        const body = bulkUpdateBody.map((search) => JSON.stringify(search)).join('\n') + '\n';

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/_bulk`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body,
        });
    }

    async notificationStatistic(id: string, user: InferSelectModel<typeof users>) {
        // get notification by id
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_notifications`;
        const body = {
            size: 1,
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                _id: id,
                            },
                        },
                    ],
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(body),
        });

        return await resultJson.json();
    }

    async getLastOrderLocationByOrderId(orderId: string, limit: number) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_order_locations`;
        const body = {
            size: limit,
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                order_id: orderId,
                            },
                        },
                    ],
                },
            },
            sort: [
                {
                    created_at: {
                        order: 'desc',
                    },
                },
            ],
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(body),
        });

        const res = await resultJson.json();

        if (res.hits.hits.length > 0) {
            const result = res.hits.hits.map((hit: any) => hit._source);
            if (limit == 1) {
                return result[0];
            }
            // @ts-ignore
            return result;
        } else {
            return null;
        }
    }

    async index(indexName: string, body: any) {
        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_doc`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(body),
        });

        return await resultJson.json();
    }

    async getUsersByIds(userIds: string[]) {
        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_user_current_location`;
        const body = {
            size: 10000,
            query: {
                bool: {
                    must: [
                        {
                            terms: {
                                _id: userIds,
                            },
                        },
                    ],
                },
            },
        };

        const resultJson = await fetch(`${process.env.ELASTICSEARCH_HOST}/${indexName}/_search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ELASTIC_AUTH!)}`,
            },
            body: JSON.stringify(body),
        });

        const res = await resultJson.json();
        if (res.hits.hits.length > 0) {
            // @ts-ignore
            return res.hits.hits.map((hit) => ({ ...hit._source, id: hit._id }));
        } else {
            return [];
        }
    }
}