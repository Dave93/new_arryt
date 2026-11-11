/**
 * What yandex_callback does with a cancelled claim. Arryt's own cancels (cancel_yandex, recreate_yandex, external
 * cancel) carry the `yandex_operator_cancel` flag and are handled before this.
 *
 * - `cancelled` is a free cancel by the client, i.e. by us outside Arryt: operators cancel in the Yandex cabinet to
 *   change the tariff or the carrier and dispatch by hand. The order is left as it is; sending it back to «Новый»
 *   only made operators put the Yandex courier back by hand and invited a second dispatch.
 * - `cancelled_by_taxi` / `estimating_failed`: Yandex itself gave up before pickup and nobody carries the order, so it
 *   goes back to missed.
 * Anything else (incl. cancelled_with_items_on_hands / failed / returned_finish, where the courier may hold the food)
 * goes through the normal status mapping.
 */
export type YandexCancelAction = "leave" | "return_to_missed" | null;

const RETURN_TO_MISSED_STATUSES = new Set(["cancelled_by_taxi", "estimating_failed"]);

export function yandexCancelAction(status: string | null | undefined): YandexCancelAction {
    if (status === "cancelled") return "leave";
    if (status && RETURN_TO_MISSED_STATUSES.has(status)) return "return_to_missed";
    return null;
}
