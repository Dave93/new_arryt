import {CacheControlService} from "@api/src/modules/cache/service";
import {SearchService} from "@api/src/services/search/service";

export class MissedOrderService {
    constructor(
        private readonly cacheControl: CacheControlService,
        private readonly searchService: SearchService
    ) {
    }

    async checkMissedOrdersIndex() {
        const mapping = {
            properties: {
                order_id: {
                    type: 'keyword',
                },
                order_created_at: {
                    type: 'date',
                },
                system_minutes_config: {
                    type: 'integer',
                },
                created_at: {
                    type: 'date',
                },
                order_number: {
                    type: 'keyword',
                },
                terminal_id: {
                    type: 'keyword',
                },
                organization_id: {
                    type: 'keyword',
                },
                status: {
                    type: 'keyword',
                },
                payment_type: {
                    type: 'keyword',
                },
                updated_at: {
                    type: 'date',
                },
                updated_by: {
                    properties: {
                        id: {
                            type: 'keyword',
                        },
                        first_name: {
                            type: 'keyword',
                        },
                        last_name: {
                            type: 'keyword',
                        },
                    },
                },
            },
        };

        const indexName = `${process.env.PROJECT_SEARCH_PREFIX}_missed_orders`;
        return await this.searchService.ensureIndexExists(indexName, mapping);
    }
}