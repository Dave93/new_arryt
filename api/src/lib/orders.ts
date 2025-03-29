import { order_status } from "../../drizzle/schema";
import { InferSelectModel } from "drizzle-orm";
import { CacheControlService } from "../modules/cache/service";

export const prepareOrdersNextButton = async (ordersList: any[], cacheControl: CacheControlService) => {
    const orderStatuses = await cacheControl.getOrderStatuses();
    // sort order statuses by sort field
    const sortedOrderStatuses = orderStatuses.sort((a, b) => a.sort - b.sort);
    // order statuses by organization
    const orderStatusesByOrganization = {} as {
        [key in string]: InferSelectModel<typeof order_status>[];
    };
    sortedOrderStatuses.forEach((orderStatus) => {
        if (!orderStatusesByOrganization[orderStatus.organization_id]) {
            orderStatusesByOrganization[orderStatus.organization_id] = [];
        }
        orderStatusesByOrganization[orderStatus.organization_id].push(orderStatus);
    });
    ordersList.forEach((order) => {
        // get index of order status in organization order statuses
        const orderStatusIndex = orderStatusesByOrganization[order.organization_id].findIndex(
            (orderStatus) => orderStatus.id === order.orders_order_status.id,
        );
        // get next order status
        let nextOrderStatus = orderStatusesByOrganization[order.organization_id][orderStatusIndex + 1];
        if (!nextOrderStatus) {
            // get last order status
            nextOrderStatus = orderStatusesByOrganization[order.organization_id][orderStatusIndex];
        }
        const nextButtons = [];
        if (!nextOrderStatus.finish) {
            nextButtons.push(nextOrderStatus);
        } else {
            const cancelOrderStatus = orderStatusesByOrganization[order.organization_id].find(
                (orderStatus) => orderStatus.cancel,
            );
            nextButtons.push(cancelOrderStatus);
            nextButtons.push(nextOrderStatus);
        }
        order.next_buttons = nextButtons;
    });
    return ordersList;
}