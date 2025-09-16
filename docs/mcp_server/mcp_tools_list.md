# MCP Server Tools для платформы Arryt

## Введение

Данный документ описывает набор инструментов (tools) для MCP сервера платформы доставки еды Arryt. Инструменты разработаны с учетом ключевых принципов создания эффективных tools для AI-агентов и специфики бизнес-процессов платформы.

## Принципы разработки

Следуя рекомендациям из `key_principles.md` и статьи Anthropic, мы применяем следующие принципы:

1. **Консолидация workflow** - объединяем связанные операции в единый инструмент
2. **Понятное именование** - используем префиксы для группировки (`arryt_order_`, `arryt_courier_`, `arryt_terminal_`)
3. **Возврат осмысленного контекста** - возвращаем читаемые имена и статусы вместо UUID
4. **Эффективность токенов** - пагинация и фильтрация для больших списков
5. **Информативные ошибки** - детальные сообщения с примерами правильного использования
6. **Явные форматы** - указываем форматы дат, координат и других параметров

## Структура инструментов

### 1. Управление заказами

#### `arryt_order_manage`
**Описание**: Комплексный инструмент для управления жизненным циклом заказа

**Параметры**:
- `action` (enum: "create" | "update_status" | "assign_courier" | "search" | "get_details")
- `order_id` (string, optional) - UUID заказа для операций update/get
- `filters` (object, optional) - фильтры для поиска
  - `status` (string) - статус заказа
  - `date_from` (string, format: "YYYY-MM-DD")
  - `date_to` (string, format: "YYYY-MM-DD")
  - `terminal_id` (string) - UUID терминала
  - `courier_id` (string) - UUID курьера
  - `organization_id` (string) - UUID организации
  - `limit` (number, default: 20)
  - `offset` (number, default: 0)
- `order_data` (object, optional) - данные для создания/обновления
  - `customer_phone` (string, format: "+998XXXXXXXXX")
  - `customer_name` (string)
  - `delivery_address` (string)
  - `items` (array) - список товаров
  - `terminal_id` (string) - UUID терминала
  - `payment_type` (enum: "cash" | "card" | "client")
- `status_update` (object, optional)
  - `new_status` (string) - код нового статуса
  - `comment` (string, optional) - комментарий к изменению

**Возвращает**:
```json
{
  "success": true,
  "action": "search",
  "data": {
    "orders": [
      {
        "id": "uuid",
        "number": "2024-001234",
        "customer": "Иван Петров (+998901234567)",
        "terminal": "Ресторан на Чиланзаре",
        "courier": "Алишер Каримов",
        "status": "В пути",
        "total_amount": 125000,
        "created_at": "2024-01-15 12:30",
        "delivery_time": "45 мин"
      }
    ],
    "total_count": 150,
    "summary": {
      "total_sum": 18750000,
      "average_delivery_time": "38 мин"
    }
  }
}
```

#### `arryt_order_analytics`
**Описание**: Аналитика по заказам с возможностью группировки и агрегации

**Параметры**:
- `metric` (enum: "revenue" | "count" | "average_check" | "delivery_time" | "completion_rate")
- `group_by` (enum: "day" | "week" | "month" | "terminal" | "courier" | "status")
- `date_from` (string, format: "YYYY-MM-DD", required)
- `date_to` (string, format: "YYYY-MM-DD", required)
- `filters` (object, optional)
  - `terminal_ids` (array[string])
  - `organization_id` (string)
  - `payment_type` (string)

**Возвращает**: Агрегированные данные с визуализацией трендов

### 2. Управление курьерами

#### `arryt_courier_manage`
**Описание**: Управление курьерами, их статусами и расписанием

**Параметры**:
- `action` (enum: "list_online" | "get_location" | "set_schedule" | "check_balance" | "assign_order")
- `courier_id` (string, optional)
- `filters` (object, optional)
  - `terminal_id` (string) - фильтр по терминалу
  - `status` (enum: "online" | "offline" | "busy")
  - `has_transport` (boolean)
  - `radius_km` (number) - радиус от точки
  - `center_lat` (number)
  - `center_lon` (number)
- `schedule_data` (object, optional)
  - `date` (string, format: "YYYY-MM-DD")
  - `start_time` (string, format: "HH:MM")
  - `end_time` (string, format: "HH:MM")
  - `terminal_id` (string)

**Возвращает**:
```json
{
  "success": true,
  "action": "list_online",
  "data": {
    "couriers": [
      {
        "id": "uuid",
        "name": "Алишер Каримов",
        "phone": "+998901234567",
        "status": "online",
        "current_location": {
          "lat": 41.311081,
          "lon": 69.240562,
          "updated": "2 мин назад"
        },
        "active_orders": 1,
        "today_stats": {
          "completed_orders": 12,
          "earned": 180000,
          "distance_km": 45.3
        },
        "transport": "car"
      }
    ],
    "total_online": 25
  }
}
```

#### `arryt_courier_performance`
**Описание**: Анализ производительности и KPI курьеров

**Параметры**:
- `courier_id` (string, optional) - если не указан, возвращает топ курьеров
- `date_from` (string, format: "YYYY-MM-DD")
- `date_to` (string, format: "YYYY-MM-DD")
- `metrics` (array[string]) - ["orders", "revenue", "speed", "rating", "bonus"]
- `top_count` (number, default: 10) - количество топ курьеров

**Возвращает**: Детальную статистику с рейтингами и сравнением

### 3. Управление терминалами

#### `arryt_terminal_operations`
**Описание**: Операции с терминалами (ресторанами)

**Параметры**:
- `action` (enum: "list" | "get_details" | "update_status" | "get_statistics")
- `terminal_id` (string, optional)
- `filters` (object, optional)
  - `organization_id` (string)
  - `is_active` (boolean)
  - `city` (string)
  - `has_couriers_online` (boolean)

**Возвращает**:
```json
{
  "success": true,
  "data": {
    "terminals": [
      {
        "id": "uuid",
        "name": "Ресторан на Чиланзаре",
        "organization": "Fast Food Corp",
        "address": "ул. Катартал, 28",
        "location": {
          "lat": 41.285524,
          "lon": 69.204428
        },
        "is_active": true,
        "working_hours": "09:00-23:00",
        "current_stats": {
          "orders_today": 45,
          "couriers_online": 3,
          "average_cooking_time": "15 мин"
        }
      }
    ]
  }
}
```

### 4. Управление ценообразованием

#### `arryt_pricing_calculate`
**Описание**: Расчет стоимости доставки с учетом всех правил

**Параметры**:
- `terminal_id` (string, required)
- `delivery_address` (string, required) - адрес доставки
- `payment_type` (enum: "cash" | "card" | "client")
- `order_time` (string, format: "YYYY-MM-DD HH:MM", optional) - время заказа для расчета
- `courier_id` (string, optional) - для расчета бонусов курьера
- `distance_km` (number, optional) - если известна дистанция

**Возвращает**:
```json
{
  "success": true,
  "pricing": {
    "customer_price": 15000,
    "courier_payment": 12000,
    "courier_bonus": 3000,
    "distance_km": 5.2,
    "duration_minutes": 18,
    "pricing_rule": "Стандартный тариф - день",
    "breakdown": {
      "base_price": 10000,
      "distance_surcharge": 5000,
      "time_coefficient": 1.0
    }
  }
}
```

### 5. Финансовые операции

#### `arryt_finance_manage`
**Описание**: Управление финансовыми транзакциями и балансами

**Параметры**:
- `action` (enum: "get_balance" | "create_transaction" | "withdraw" | "get_transactions")
- `entity_type` (enum: "courier" | "terminal" | "organization")
- `entity_id` (string, required)
- `transaction_data` (object, optional)
  - `amount` (number)
  - `type` (enum: "payment" | "bonus" | "penalty" | "withdraw")
  - `description` (string)
- `filters` (object, optional)
  - `date_from` (string)
  - `date_to` (string)
  - `type` (string)
  - `limit` (number, default: 50)

**Возвращает**: Баланс, историю транзакций или результат операции

### 6. Управление расписанием

#### `arryt_schedule_manage`
**Описание**: Управление графиками работы курьеров

**Параметры**:
- `action` (enum: "get_schedule" | "set_schedule" | "get_availability" | "mark_attendance")
- `date_from` (string, format: "YYYY-MM-DD")
- `date_to` (string, format: "YYYY-MM-DD")
- `courier_ids` (array[string], optional)
- `terminal_id` (string, optional)
- `schedule_entries` (array, optional)
  - `courier_id` (string)
  - `date` (string)
  - `start_time` (string, format: "HH:MM")
  - `end_time` (string, format: "HH:MM")
  - `terminal_id` (string)

**Возвращает**: Расписание с учетом доступности и загруженности

### 7. Система уведомлений

#### `arryt_notify_send`
**Описание**: Отправка уведомлений различным участникам системы

**Параметры**:
- `recipient_type` (enum: "courier" | "customer" | "manager" | "terminal")
- `recipient_ids` (array[string]) - список получателей
- `channel` (enum: "push" | "sms" | "in_app")
- `message_type` (enum: "order_status" | "new_order" | "payment" | "custom")
- `template_data` (object) - данные для шаблона
  - `order_id` (string, optional)
  - `status` (string, optional)
  - `amount` (number, optional)
  - `custom_message` (string, optional)
- `priority` (enum: "high" | "normal" | "low")

**Возвращает**: Статус отправки и ID уведомлений

### 8. Интеграции с внешними системами

#### `arryt_external_sync`
**Описание**: Синхронизация с внешними системами (iiko, R-Keeper, Jowi, Yandex)

**Параметры**:
- `system` (enum: "iiko" | "rkeeper" | "jowi" | "yandex_delivery")
- `action` (enum: "import_orders" | "update_status" | "sync_menu" | "get_courier")
- `external_id` (string, optional) - ID во внешней системе
- `data` (object, optional) - данные для синхронизации

**Возвращает**: Результат синхронизации с маппингом ID

### 9. Отчеты и экспорт

#### `arryt_reports_generate`
**Описание**: Генерация различных отчетов

**Параметры**:
- `report_type` (enum: "daily_summary" | "courier_payments" | "terminal_revenue" | "order_analytics" | "financial")
- `date_from` (string, format: "YYYY-MM-DD")
- `date_to` (string, format: "YYYY-MM-DD")
- `entity_ids` (array[string], optional) - фильтр по конкретным сущностям
- `format` (enum: "json" | "csv" | "pdf")
- `include_details` (boolean, default: false)
- `group_by` (array[string], optional) - ["date", "terminal", "courier", "status"]

**Возвращает**: Сгенерированный отчет в указанном формате

### 10. Административные операции

#### `arryt_admin_manage`
**Описание**: Административные функции управления системой

**Параметры**:
- `action` (enum: "create_user" | "update_permissions" | "configure_organization" | "system_health")
- `entity_type` (enum: "user" | "role" | "organization" | "terminal")
- `entity_data` (object, optional)
- `permissions` (array[string], optional)

**Возвращает**: Результат административной операции

## Обработка ошибок

Все инструменты возвращают структурированные ошибки:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Неверный формат номера телефона",
    "field": "customer_phone",
    "example": "+998901234567",
    "documentation": "https://docs.arryt.uz/api/phone-format"
  }
}
```

## Пагинация и лимиты

- Максимальный лимит для списков: 100 записей
- По умолчанию возвращается 20 записей
- Всегда возвращается total_count для пагинации
- При превышении лимитов возвращается сообщение с инструкцией использования offset

## Безопасность

- Все операции требуют аутентификации через JWT токен
- Фильтрация по organization_id происходит автоматически на основе токена
- Чувствительные данные (пароли, токены) никогда не возвращаются в ответах
- Логирование всех операций для аудита

## Оптимизация для AI-агентов

1. **Консолидированные операции**: Например, `arryt_order_manage` объединяет создание, поиск, обновление статуса и назначение курьера
2. **Человекочитаемые ответы**: Вместо UUID возвращаются имена и понятные статусы
3. **Контекстная информация**: Каждый ответ содержит связанную информацию (например, при получении заказа также возвращается информация о курьере и терминале)
4. **Умные значения по умолчанию**: Автоматический выбор ближайшего доступного курьера, расчет оптимального маршрута
5. **Прогрессивная детализация**: Базовая информация по умолчанию, детали по запросу

## Примеры использования

### Создание и обработка заказа
```json
// 1. Создание заказа
{
  "tool": "arryt_order_manage",
  "parameters": {
    "action": "create",
    "order_data": {
      "customer_phone": "+998901234567",
      "customer_name": "Иван Петров",
      "delivery_address": "ул. Амира Темура, 25",
      "terminal_id": "abc-123",
      "items": [{"name": "Плов", "quantity": 2, "price": 35000}],
      "payment_type": "cash"
    }
  }
}

// 2. Автоматическое назначение курьера
{
  "tool": "arryt_order_manage",
  "parameters": {
    "action": "assign_courier",
    "order_id": "order-456",
    "filters": {
      "radius_km": 5,
      "has_transport": true
    }
  }
}
```

### Получение аналитики
```json
{
  "tool": "arryt_order_analytics",
  "parameters": {
    "metric": "revenue",
    "group_by": "terminal",
    "date_from": "2024-01-01",
    "date_to": "2024-01-31",
    "filters": {
      "organization_id": "org-789"
    }
  }
}
```

## Заключение

Данный набор инструментов обеспечивает полное покрытие функциональности платформы Arryt через консолидированные, эффективные и удобные для AI-агентов интерфейсы. Инструменты спроектированы с учетом реальных бизнес-процессов и оптимизированы для минимизации количества вызовов и объема передаваемых токенов.