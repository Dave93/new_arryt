// Chopar Pizza calls Yandex Delivery only with the `express` tariff (owner's request 07.11.2026), even when an
// operator picks another one in «recreate Yandex».
const CHOPAR_ORGANIZATION_ID = "59d38207-2b57-4682-ba8e-9292401ecea5";
const EXPRESS_TERMINAL_IDS = ["419b466b-a575-4e2f-b771-7206342bc242"];

export function resolveYandexTaxiClass(opts: { organizationId: string; terminalId: string; requested?: string }): string {
    if (opts.organizationId === CHOPAR_ORGANIZATION_ID) return "express";
    return opts.requested || (EXPRESS_TERMINAL_IDS.includes(opts.terminalId) ? "express" : "courier");
}
