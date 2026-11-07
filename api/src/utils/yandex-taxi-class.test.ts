import { describe, expect, test } from "bun:test";
import { resolveYandexTaxiClass } from "./yandex-taxi-class";

const CHOPAR = "59d38207-2b57-4682-ba8e-9292401ecea5";
const LES = "7718e8e5-a23e-4d98-b9a6-5b85115c4fa5";
const EXPRESS_TERMINAL = "419b466b-a575-4e2f-b771-7206342bc242";

describe("resolveYandexTaxiClass", () => {
    test("chopar is always express, whatever was requested", () => {
        expect(resolveYandexTaxiClass({ organizationId: CHOPAR, terminalId: "t1" })).toBe("express");
        expect(resolveYandexTaxiClass({ organizationId: CHOPAR, terminalId: "t1", requested: "courier" })).toBe("express");
        expect(resolveYandexTaxiClass({ organizationId: CHOPAR, terminalId: "t1", requested: "cargo" })).toBe("express");
    });
    test("other organizations keep the requested class", () => {
        expect(resolveYandexTaxiClass({ organizationId: LES, terminalId: "t1", requested: "cargo" })).toBe("cargo");
    });
    test("other organizations: default courier, express for the express terminal", () => {
        expect(resolveYandexTaxiClass({ organizationId: LES, terminalId: "t1" })).toBe("courier");
        expect(resolveYandexTaxiClass({ organizationId: LES, terminalId: EXPRESS_TERMINAL })).toBe("express");
    });
});
