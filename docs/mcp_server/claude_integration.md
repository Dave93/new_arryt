# Подключение MCP сервера Arryt к Claude

## Настройка MCP сервера в Claude Desktop

### 1. Найдите конфигурационный файл Claude Desktop

**Для macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Для Windows:**
```bash
%APPDATA%/Claude/claude_desktop_config.json
```

### 2. Создайте или отредактируйте конфигурационный файл

Добавьте следующую конфигурацию в файл `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "arryt": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "http://api.arryt.uz/mcp"
      ]
    }
  }
}
```

### 3. Альтернативный вариант для локальной разработки

Если вы работаете с локальным сервером:

```json
{
  "mcpServers": {
    "arryt-local": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "http://localhost:3000/mcp"
      ]
    }
  }
}
```

### 4. Пошаговая инструкция по настройке

1. **Откройте терминал/командную строку**

2. **Найдите файл конфигурации:**
   ```bash
   # macOS
   open ~/Library/Application\ Support/Claude/

   # Windows
   explorer %APPDATA%\Claude\
   ```

3. **Создайте файл `claude_desktop_config.json`** если его нет, или отредактируйте существующий

4. **Добавьте конфигурацию MCP сервера** (выберите один из вариантов выше)

5. **Сохраните файл и перезапустите Claude Desktop**

### 5. Альтернативный способ - через собственный скрипт

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

## Проверка подключения

После перезапуска Claude Desktop:

1. **Откройте новый чат в Claude Desktop**
2. **Проверьте доступность инструментов** - напишите что-то вроде: "Какие инструменты у тебя есть для работы с Arryt?"
3. **Если всё настроено правильно**, Claude ответит что у него есть доступ к `arryt_terminal_operations`

## Использование в Claude Desktop

После успешной настройки в Claude Desktop будут доступны следующие инструменты:

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
curl http://localhost:3000/mcp
# или для продакшена:
curl http://api.arryt.uz/mcp
```

3. **В Claude Desktop** можете спросить: "Какие MCP серверы у тебя подключены?" или "Покажи доступные инструменты"

## Отладка

Если подключение не работает:

1. **Проверьте логи сервера** - в консоли должно появиться сообщение: "✅ Arryt MCP tools registered successfully"

2. **Проверьте порт** - убедитесь что API сервер запущен на порту 3000

3. **Проверьте эндпоинт** - откройте в браузере `http://localhost:3000/sse`

4. **Проверьте конфиг Claude** - убедитесь что JSON валидный и пути правильные

5. **Перезапустите Claude Code** после изменения конфигурации

## Важные заметки

- Эндпоинт изменился с `/sse` на `/mcp` (стандартный для elysia-mcp)
- Сессии управляются автоматически через заголовок `Mcp-Session-Id`
- В продакшене используйте `http://api.arryt.uz/mcp` вместо localhost

## Примеры запросов через Claude

После подключения вы сможете задавать Claude такие вопросы:

- "Покажи мне все активные терминалы"
- "Какие заказы сегодня были у терминала на Чиланзаре?"
- "Сколько курьеров сейчас онлайн?"
- "Отключи терминал с ID abc-123"
- "Покажи статистику по всем терминалам организации XYZ"

Claude будет использовать инструмент `arryt_terminal_operations` для получения актуальной информации из вашей базы данных.