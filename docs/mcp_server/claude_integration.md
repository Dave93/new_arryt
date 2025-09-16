# Подключение MCP сервера Arryt к Claude

## Настройка MCP сервера в Claude Code

### 1. Конфигурация клиента

В конфигурационном файле Claude Code добавьте MCP сервер:

**Для macOS:**
Отредактируйте файл `~/Library/Application Support/Claude/claude_desktop_config.json`

**Для Windows:**
Отредактируйте файл `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "arryt-mcp-server": {
      "command": "node",
      "args": [
        "-e",
        "const { createMcpClient } = require('@modelcontextprotocol/sdk/client/sse'); const client = new createMcpClient('http://localhost:3000/sse'); client.connect();"
      ],
      "env": {
        "ARRYT_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

### 2. Альтернативный способ - через HTTP клиент

```json
{
  "mcpServers": {
    "arryt": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-http-client",
        "http://localhost:3000/sse"
      ]
    }
  }
}
```

### 3. Настройка через собственный скрипт

Создайте файл `mcp-client.js`:

```javascript
#!/usr/bin/env node

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

async function main() {
  const transport = new SSEClientTransport(
    new URL('http://localhost:3000/sse')
  );

  const client = new Client(
    {
      name: 'arryt-client',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  );

  await client.connect(transport);
  console.log('Connected to Arryt MCP server');
}

main().catch(console.error);
```

Затем в конфиге Claude:

```json
{
  "mcpServers": {
    "arryt": {
      "command": "node",
      "args": ["./path/to/mcp-client.js"]
    }
  }
}
```

## Использование в Claude

После настройки в Claude будут доступны следующие инструменты:

### arryt_terminal_operations

```
Получить список всех активных терминалов:
{
  "action": "list",
  "filters": {
    "is_active": true
  }
}

Получить детали конкретного терминала:
{
  "action": "get_details",
  "terminal_id": "uuid-терминала"
}

Изменить статус терминала:
{
  "action": "update_status",
  "terminal_id": "uuid-терминала"
}

Получить статистику:
{
  "action": "get_statistics",
  "filters": {
    "organization_id": "uuid-организации"
  }
}
```

## Проверка подключения

1. Запустите сервер Arryt:
```bash
cd api
bun run dev
```

2. Проверьте доступность MCP эндпоинта:
```bash
curl http://localhost:3000/sse
```

3. В Claude Code выполните команду для проверки MCP серверов:
```
/mcp list-servers
```

## Отладка

Если подключение не работает:

1. **Проверьте логи сервера** - в консоли должно появиться сообщение: "✅ Arryt MCP tools registered successfully"

2. **Проверьте порт** - убедитесь что API сервер запущен на порту 3000

3. **Проверьте эндпоинт** - откройте в браузере `http://localhost:3000/sse`

4. **Проверьте конфиг Claude** - убедитесь что JSON валидный и пути правильные

5. **Перезапустите Claude Code** после изменения конфигурации

## Примеры запросов через Claude

После подключения вы сможете задавать Claude такие вопросы:

- "Покажи мне все активные терминалы"
- "Какие заказы сегодня были у терминала на Чиланзаре?"
- "Сколько курьеров сейчас онлайн?"
- "Отключи терминал с ID abc-123"
- "Покажи статистику по всем терминалам организации XYZ"

Claude будет использовать инструмент `arryt_terminal_operations` для получения актуальной информации из вашей базы данных.