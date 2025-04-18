CREATE EXTENSION IF NOT EXISTS timescaledb;

SELECT create_hypertable(
  'orders',
  'created_at',
  chunk_time_interval => INTERVAL '1 month'
);

SELECT create_hypertable(
  'order_items',
  'order_created_at',
  chunk_time_interval => INTERVAL '1 month'
);

SELECT create_hypertable(
  'order_transactions',
  'created_at',
  chunk_time_interval => INTERVAL '1 month'
);



SELECT create_hypertable(
  'manager_withdraw',
  'created_at',
  chunk_time_interval => INTERVAL '1 month'
);

SELECT create_hypertable(
  'manager_withdraw_transactions',
  'transaction_created_at',
  chunk_time_interval => INTERVAL '1 month'
);

SELECT create_hypertable(
   'missed_orders',
   'order_created_at',
   chunk_time_interval => INTERVAL '1 month'
);

SELECT create_hypertable(
       'order_actions',
       'order_created_at',
       chunk_time_interval => INTERVAL '1 month'
);

ALTER TABLE order_actions SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'order_id'
    );

SELECT add_compression_policy('order_actions', INTERVAL '1 month');


SELECT create_hypertable('order_locations', by_range('order_created_at'));

ALTER TABLE order_locations SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'order_id',
    timescaledb.compress_orderby = 'order_created_at'
    );

SELECT add_compression_policy('order_locations', INTERVAL '7 days');

