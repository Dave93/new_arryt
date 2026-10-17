#!/usr/bin/env bash
# Заливает в локальный Postgres схему прода и справочники — без заказов,
# клиентов, OTP и токенов. Пересоздаёт локальную базу arryt с нуля.
#
#   bash dev/pull-db.sh
#
# Нужно: запущенный dev/docker-compose.yml и SSH-ключ к серверу.
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/chopar_server}"
SERVER="${SERVER:-root@165.22.74.219}"
REMOTE_API="/home/davr/arryt/new_arryt/api"
DIR="$(cd "$(dirname "$0")" && pwd)"
DUMP="$DIR/data/arryt_reference.dump"
COMPOSE=(docker compose -f "$DIR/docker-compose.yml")

# Данные этих таблиц не копируем: персональные данные клиентов, заказы,
# одноразовые коды, токены и большая история смен. Схема копируется вся.
EXCLUDE_DATA=(
  customers customers_comments otp api_tokens outside_requests
  orders order_items order_transactions order_actions order_locations order_votes
  missed_orders manager_withdraw manager_withdraw_transactions
  work_schedule_entries timesheet daily_garant_tasks courier_performances
  courier_terminal_balance
)

# Гипертаблицы Timescale на проде: таблица, колонка времени, размер чанка.
HYPERTABLES=(
  "orders created_at 30"
  "order_items order_created_at 30"
  "order_transactions created_at 30"
  "manager_withdraw created_at 30"
  "manager_withdraw_transactions transaction_created_at 30"
  "missed_orders order_created_at 30"
  "order_actions order_created_at 30"
  "order_locations order_created_at 7"
)

mkdir -p "$DIR/data"
excludes=""
for t in "${EXCLUDE_DATA[@]}"; do excludes+=" --exclude-table-data=public.$t"; done

echo "→ Дамп с прода (схема public + справочники)…"
ssh -i "$SSH_KEY" -o BatchMode=yes "$SERVER" \
  "cd $REMOTE_API && export \$(grep -E '^DATABASE_URL=' .env | xargs) && pg_dump \"\$DATABASE_URL\" -Fc --no-owner --no-acl -n public $excludes" > "$DUMP"
echo "  $(du -h "$DUMP" | cut -f1)"

echo "→ Пересоздаю локальную базу…"
"${COMPOSE[@]}" up -d --wait postgres >/dev/null
psql_local() { "${COMPOSE[@]}" exec -T postgres psql -U arryt -v ON_ERROR_STOP=1 "$@"; }
psql_local -d postgres -q -c "DROP DATABASE IF EXISTS arryt WITH (FORCE)" -c "CREATE DATABASE arryt"
psql_local -d arryt -q -c "CREATE EXTENSION IF NOT EXISTS timescaledb"

echo "→ Восстанавливаю…"
# public уже есть в новой базе — ошибку "schema public already exists" пропускаем
"${COMPOSE[@]}" exec -T postgres pg_restore -U arryt -d arryt --no-owner --no-acl < "$DUMP" 2>&1 \
  | grep -v 'schema "public" already exists' | grep -E "error|ERROR" && echo "  (ошибки выше — проверь)" || true

echo "→ Гипертаблицы и чистка секретов…"
for h in "${HYPERTABLES[@]}"; do
  read -r table column days <<<"$h"
  psql_local -d arryt -q -c "SELECT create_hypertable('public.$table', by_range('$column', INTERVAL '$days days'), if_not_exists => true)" >/dev/null
done
# Смены и табель за последние SHIFT_DAYS дней — чтобы перекличка и дневной
# гарант показывали живые цифры. Персональных данных клиентов в них нет.
SHIFT_DAYS="${SHIFT_DAYS:-7}"
if [ "$SHIFT_DAYS" -gt 0 ]; then
  echo "→ Смены и табель за $SHIFT_DAYS дн…"
  copy_recent() { # таблица, колонка даты
    ssh -i "$SSH_KEY" -o BatchMode=yes "$SERVER"       "cd $REMOTE_API && export \$(grep -E '^DATABASE_URL=' .env | xargs) && psql \"\$DATABASE_URL\" -c \"\copy (select * from $1 where $2 >= now() - interval '$SHIFT_DAYS days') to stdout\""       | psql_local -d arryt -q -c "\copy $1 from stdin"
  }
  copy_recent work_schedule_entries date_start
  copy_recent timesheet date
  psql_local -d arryt -At -c "SELECT '  смен: ' || count(*) FROM work_schedule_entries" -c "SELECT '  табель: ' || count(*) FROM timesheet"
fi

# Токены прода локально не нужны: пуши и интеграции не должны уходить с ноутбука.
psql_local -d arryt -q -c "UPDATE users SET fcm_token = NULL, api_token = NULL"

psql_local -d arryt -At -c "SELECT 'users: ' || count(*) FROM users" -c "SELECT 'terminals: ' || count(*) FROM terminals" -c "SELECT 'daily_garant: ' || count(*) FROM daily_garant"
# Локальный админ и кэш API: база пересоздана, Redis держит старые данные.
echo "→ Локальный админ и кэш…"
(cd "$DIR/../api" && bun ../dev/create-local-admin.ts && bun ../dev/warm-cache.ts)
echo "✓ Готово"
