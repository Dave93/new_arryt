# Локальный стенд

Postgres (TimescaleDB, как на проде) и Redis в Docker, API и админка — из исходников.
В базе справочники с прода: организации, филиалы, роли и права, статусы,
тарифы, графики, настройки, сотрудники и курьеры, плюс смены и табель за последние дни.
Заказов, клиентов, OTP и токенов нет.

## Первый запуск

```bash
docker compose -f dev/docker-compose.yml up -d   # Postgres :5433, Redis :6379
bash dev/pull-db.sh   # справочники + смены за 7 дней (SHIFT_DAYS=N), локальный админ, кэш
                      # пароль local_admin → dev/data/local-admin.txt
```

`api/.env.local` и `new_admin/.env.local` уже указывают на локальный стенд
(bun и Next читают `.env.local` раньше `.env`). Оба файла в `.gitignore`.

## Каждый день

```bash
docker compose -f dev/docker-compose.yml up -d
cd api && bun run dev           # http://localhost:3000
cd new_admin && bun run dev     # http://localhost:8889 → вход local_admin
```

## Что не работает локально — намеренно

- SMS, пуши, Yandex/Noor/Uzum, Elasticsearch: ключи не заданы, наружу ничего не уходит.
- Очередь и кроны не запущены. Нужна очередь — `cd queue && bun run index.ts`
  (тот же Redis и `TASKS_PREFIX=arryt`).
- Redis в API захардкожен на `127.0.0.1:6379` (`api/src/context/redis.ts`).

Обновить данные с прода — снова `bash dev/pull-db.sh` (локальная база пересоздаётся,
пароль local_admin меняется; после этого войдите в админку заново).
