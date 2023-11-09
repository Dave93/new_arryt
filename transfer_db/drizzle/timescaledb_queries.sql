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


