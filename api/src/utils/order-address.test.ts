import { describe, expect, test } from "bun:test";
import { deliveryAddressOf, NO_ADDRESS_TEXT, orderAddressColumns } from "./order-address";

describe("deliveryAddressOf", () => {
    test("trims the text", () => {
        expect(deliveryAddressOf("  Chilonzor 5, dom: 12  ")).toBe("Chilonzor 5, dom: 12");
    });
    test("a missing, null or blank text is the pin-only order, as on create", () => {
        expect(deliveryAddressOf(undefined)).toBe(NO_ADDRESS_TEXT);
        expect(deliveryAddressOf(null)).toBe(NO_ADDRESS_TEXT);
        expect(deliveryAddressOf("   ")).toBe(NO_ADDRESS_TEXT);
    });
});

describe("orderAddressColumns", () => {
    test("maps every field to its column", () => {
        expect(orderAddressColumns({
            address: "Yunusobod 4, dom: 7, kv: 12",
            house: "7",
            flat: "12",
            entrance: "2",
            comment: "Domofon 12",
            additionalPhone: "+998901234567",
        })).toEqual({
            delivery_address: "Yunusobod 4, dom: 7, kv: 12",
            house: "7",
            flat: "12",
            entrance: "2",
            delivery_comment: "Domofon 12",
            additional_phone: "+998901234567",
        });
    });

    test("a field left out leaves its column alone", () => {
        expect(orderAddressColumns({ flat: "3" })).toEqual({ flat: "3" });
        expect(orderAddressColumns({})).toEqual({});
    });

    test("null empties a column, and the address falls back to the pin-only text", () => {
        expect(orderAddressColumns({ address: null, house: null, flat: null, entrance: null, comment: null, additionalPhone: null })).toEqual({
            delivery_address: NO_ADDRESS_TEXT,
            house: null,
            flat: null,
            entrance: null,
            delivery_comment: null,
            additional_phone: null,
        });
    });

    test("an empty text is kept as sent (the create stores it so too), except the address", () => {
        expect(orderAddressColumns({ address: "", house: "", comment: "" })).toEqual({
            delivery_address: NO_ADDRESS_TEXT,
            house: "",
            delivery_comment: "",
        });
    });
});
