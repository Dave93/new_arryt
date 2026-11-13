/** The address of an order whose create carried no text: the customer put a pin on the map and typed nothing. */
export const NO_ADDRESS_TEXT = "Адрес не указан — точка на карте";

/** `delivery_address` is NOT NULL: a blank or missing text reads as the pin-only order, the way the create stores it. */
export const deliveryAddressOf = (address: string | null | undefined): string => address?.trim() || NO_ADDRESS_TEXT;

/** The text of an order's address as a caller sends it, named the way `/api/orders/external` names it on create. */
export interface OrderAddressText {
    address?: string | null;
    house?: string | null;
    flat?: string | null;
    entrance?: string | null;
    comment?: string | null;
    additionalPhone?: string | null;
}

export interface OrderAddressColumns {
    delivery_address?: string;
    house?: string | null;
    flat?: string | null;
    entrance?: string | null;
    delivery_comment?: string | null;
    additional_phone?: string | null;
}

/**
 * The `orders` columns that `/api/external/change-address` writes. A field the caller left out is not in the result, so
 * its column keeps what it holds; a field sent as null empties its column (the address, which cannot be empty, becomes
 * the pin-only text). Each column is stored as the create stores it: the address trimmed, the rest as given.
 */
export function orderAddressColumns(text: OrderAddressText): OrderAddressColumns {
    const columns: OrderAddressColumns = {};
    if (text.address !== undefined) columns.delivery_address = deliveryAddressOf(text.address);
    if (text.house !== undefined) columns.house = text.house;
    if (text.flat !== undefined) columns.flat = text.flat;
    if (text.entrance !== undefined) columns.entrance = text.entrance;
    if (text.comment !== undefined) columns.delivery_comment = text.comment;
    if (text.additionalPhone !== undefined) columns.additional_phone = text.additionalPhone;
    return columns;
}
