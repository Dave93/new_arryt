
type Location = {
    lat: number;

    lon: number;
}

export type OrdersLocationEntity = {
    order_id: string;

    order_status_id: string;

    terminal_id: string;

    courier_id: string;

    created_at: string;

    location: Location;

    status_color: string;

    status_name: string;
}

export type OrderMobilePeriodStat = {
    successCount: number;

    failedCount: number;

    orderPrice: number;

    bonusPrice: number;

    totalPrice: number;

    labelCode: string;

    fuelPrice: number;

    dailyGarantPrice?: number;
}