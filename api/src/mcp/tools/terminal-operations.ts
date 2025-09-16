// @ts-ignore - elysia-mcp типы не полностью совместимы
import type { McpServer } from 'elysia-mcp';
import { z } from 'zod';
import { db } from '../../lib/db.js';
import { terminals, organization, orders, users } from '../../../drizzle/schema.js';
import { eq, and, sql, asc, count } from 'drizzle-orm';

// Схемы валидации для параметров
const TerminalOperationsArgsSchema = z.object({
  action: z.enum(['list', 'get_details', 'update_status', 'get_statistics']),
  terminal_id: z.string().optional(),
  filters: z.object({
    organization_id: z.string().optional(),
    is_active: z.boolean().optional(),
    city: z.string().optional(),
    has_couriers_online: z.boolean().optional()
  }).optional()
});

interface TerminalStats {
  orders_today: number;
  couriers_online: number;
  average_cooking_time: string;
}

interface TerminalWithStats {
  id: string;
  name: string;
  organization: string;
  address: string | null;
  location: {
    lat: number;
    lon: number;
  };
  is_active: boolean;
  working_hours: string;
  current_stats: TerminalStats;
}

export async function registerTerminalOperationsTool(server: McpServer) {
  server.tool(
    'arryt_terminal_operations',
    {
      action: z.enum(['list', 'get_details', 'update_status', 'get_statistics'])
        .describe('Действие для выполнения с терминалами'),
      terminal_id: z.string().optional()
        .describe('UUID терминала (требуется для get_details, update_status)'),
      filters: z.object({
        organization_id: z.string().optional()
          .describe('UUID организации для фильтрации'),
        is_active: z.boolean().optional()
          .describe('Фильтр по активности терминала'),
        city: z.string().optional()
          .describe('Название города для фильтрации'),
        has_couriers_online: z.boolean().optional()
          .describe('Фильтр по наличию онлайн курьеров')
      }).optional().describe('Фильтры для поиска терминалов')
    },
    async (args: any) => {
      try {
        // Валидация входящих параметров
        const validatedArgs = TerminalOperationsArgsSchema.parse(args);

        switch (validatedArgs.action) {
          case 'list':
            return await handleListTerminals(validatedArgs.filters);

          case 'get_details':
            if (!validatedArgs.terminal_id) {
              throw new Error('terminal_id is required for get_details action. Example: { "action": "get_details", "terminal_id": "abc-123-def" }');
            }
            return await handleGetTerminalDetails(validatedArgs.terminal_id);

          case 'update_status':
            if (!validatedArgs.terminal_id) {
              throw new Error('terminal_id is required for update_status action. Example: { "action": "update_status", "terminal_id": "abc-123-def" }');
            }
            return await handleUpdateTerminalStatus(validatedArgs.terminal_id);

          case 'get_statistics':
            return await handleGetTerminalStatistics(validatedArgs.terminal_id, validatedArgs.filters);

          default:
            throw new Error(`Unknown action: ${validatedArgs.action}. Supported actions: list, get_details, update_status, get_statistics`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: {
                  message: errorMessage,
                  code: 'TERMINAL_OPERATION_ERROR'
                }
              }, null, 2)
            }
          ]
        };
      }
    }
  );
}

async function handleListTerminals(filters?: z.infer<typeof TerminalOperationsArgsSchema>['filters']) {
  let whereConditions = [];

  if (filters?.organization_id) {
    whereConditions.push(eq(terminals.organization_id, filters.organization_id));
  }

  if (filters?.is_active !== undefined) {
    whereConditions.push(eq(terminals.active, filters.is_active));
  }

  const terminalsList = await db
    .select({
      id: terminals.id,
      name: terminals.name,
      active: terminals.active,
      address: terminals.address,
      latitude: terminals.latitude,
      longitude: terminals.longitude,
      phone: terminals.phone,
      manager_name: terminals.manager_name,
      external_id: terminals.external_id,
      region: terminals.region,
      organization: {
        id: organization.id,
        name: organization.name,
      },
    })
    .from(terminals)
    .leftJoin(organization, eq(terminals.organization_id, organization.id))
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(asc(terminals.name));

  // Получаем статистику для каждого терминала
  const terminalsWithStats: TerminalWithStats[] = [];

  for (const terminal of terminalsList) {
    const stats = await getTerminalStatsById(terminal.id);

    terminalsWithStats.push({
      id: terminal.id,
      name: terminal.name,
      organization: terminal.organization?.name || "Неизвестная организация",
      address: terminal.address,
      location: {
        lat: terminal.latitude,
        lon: terminal.longitude,
      },
      is_active: terminal.active,
      working_hours: "09:00-23:00", // TODO: добавить реальные часы работы из схемы
      current_stats: stats,
    });
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            terminals: terminalsWithStats,
            total_count: terminalsWithStats.length,
            summary: {
              active_terminals: terminalsWithStats.filter(t => t.is_active).length,
              total_orders_today: terminalsWithStats.reduce((sum, t) => sum + t.current_stats.orders_today, 0),
              total_online_couriers: terminalsWithStats.reduce((sum, t) => sum + t.current_stats.couriers_online, 0),
            }
          }
        }, null, 2)
      }
    ]
  };
}

async function handleGetTerminalDetails(terminalId: string) {
  const terminal = await db
    .select({
      id: terminals.id,
      name: terminals.name,
      active: terminals.active,
      address: terminals.address,
      latitude: terminals.latitude,
      longitude: terminals.longitude,
      phone: terminals.phone,
      manager_name: terminals.manager_name,
      external_id: terminals.external_id,
      region: terminals.region,
      fuel_bonus: terminals.fuel_bonus,
      linked_terminal_id: terminals.linked_terminal_id,
      time_to_yandex: terminals.time_to_yandex,
      allow_yandex: terminals.allow_yandex,
      allow_close_anywhere: terminals.allow_close_anywhere,
      created_at: terminals.created_at,
      updated_at: terminals.updated_at,
      organization: {
        id: organization.id,
        name: organization.name,
      },
    })
    .from(terminals)
    .leftJoin(organization, eq(terminals.organization_id, organization.id))
    .where(eq(terminals.id, terminalId))
    .limit(1);

  if (!terminal || terminal.length === 0) {
    throw new Error(`Terminal with ID ${terminalId} not found`);
  }

  const stats = await getTerminalStatsById(terminalId);
  const terminalData = terminal[0];

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            id: terminalData.id,
            name: terminalData.name,
            organization: terminalData.organization?.name || "Неизвестная организация",
            address: terminalData.address,
            phone: terminalData.phone,
            manager_name: terminalData.manager_name,
            location: {
              lat: terminalData.latitude,
              lon: terminalData.longitude,
            },
            is_active: terminalData.active,
            external_id: terminalData.external_id,
            region: terminalData.region,
            settings: {
              fuel_bonus: terminalData.fuel_bonus,
              linked_terminal_id: terminalData.linked_terminal_id,
              time_to_yandex: terminalData.time_to_yandex,
              allow_yandex: terminalData.allow_yandex,
              allow_close_anywhere: terminalData.allow_close_anywhere,
            },
            timestamps: {
              created_at: terminalData.created_at,
              updated_at: terminalData.updated_at,
            },
            current_stats: stats,
          }
        }, null, 2)
      }
    ]
  };
}

async function handleUpdateTerminalStatus(terminalId: string) {
  // Получаем текущий статус терминала
  const currentTerminal = await db
    .select({ active: terminals.active, name: terminals.name })
    .from(terminals)
    .where(eq(terminals.id, terminalId))
    .limit(1);

  if (!currentTerminal || currentTerminal.length === 0) {
    throw new Error(`Terminal with ID ${terminalId} not found`);
  }

  const newStatus = !currentTerminal[0].active;

  await db
    .update(terminals)
    .set({
      active: newStatus,
      updated_at: new Date().toISOString(),
    })
    .where(eq(terminals.id, terminalId));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            terminal_id: terminalId,
            terminal_name: currentTerminal[0].name,
            old_status: currentTerminal[0].active ? "active" : "inactive",
            new_status: newStatus ? "active" : "inactive",
            message: `Статус терминала "${currentTerminal[0].name}" изменен с "${currentTerminal[0].active ? "активный" : "неактивный"}" на "${newStatus ? "активный" : "неактивный"}"`
          }
        }, null, 2)
      }
    ]
  };
}

async function handleGetTerminalStatistics(terminalId?: string, filters?: z.infer<typeof TerminalOperationsArgsSchema>['filters']) {
  if (terminalId) {
    // Статистика для конкретного терминала
    const stats = await getTerminalStatsById(terminalId);
    const terminal = await db
      .select({ name: terminals.name })
      .from(terminals)
      .where(eq(terminals.id, terminalId))
      .limit(1);

    if (!terminal || terminal.length === 0) {
      throw new Error(`Terminal with ID ${terminalId} not found`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              terminal: {
                id: terminalId,
                name: terminal[0].name,
              },
              statistics: stats,
              period: "today"
            }
          }, null, 2)
        }
      ]
    };
  } else {
    // Общая статистика по всем терминалам
    let whereConditions = [];

    if (filters?.organization_id) {
      whereConditions.push(eq(terminals.organization_id, filters.organization_id));
    }

    if (filters?.is_active !== undefined) {
      whereConditions.push(eq(terminals.active, filters.is_active));
    }

    const terminalsData = await db
      .select({
        id: terminals.id,
        name: terminals.name,
        active: terminals.active,
      })
      .from(terminals)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    let totalOrders = 0;
    let totalCouriers = 0;
    const terminalStats = [];

    for (const terminal of terminalsData) {
      const stats = await getTerminalStatsById(terminal.id);
      totalOrders += stats.orders_today;
      totalCouriers += stats.couriers_online;

      terminalStats.push({
        terminal_id: terminal.id,
        terminal_name: terminal.name,
        is_active: terminal.active,
        stats: stats,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              summary: {
                total_terminals: terminalsData.length,
                active_terminals: terminalsData.filter(t => t.active).length,
                total_orders_today: totalOrders,
                total_couriers_online: totalCouriers,
                average_orders_per_terminal: terminalsData.length > 0 ? Math.round(totalOrders / terminalsData.length) : 0,
              },
              terminals: terminalStats.slice(0, 20), // Ограничиваем до 20 для экономии токенов
              note: terminalStats.length > 20 ? `Показано 20 из ${terminalStats.length} терминалов. Используйте фильтры для уточнения результатов.` : null
            }
          }, null, 2)
        }
      ]
    };
  }
}

async function getTerminalStatsById(terminalId: string): Promise<TerminalStats> {
  // Подсчет заказов за сегодня
  const today = new Date().toISOString().split('T')[0];

  const todayOrdersResult = await db
    .select({ count: count() })
    .from(orders)
    .where(
      and(
        eq(orders.terminal_id, terminalId),
        sql`DATE(${orders.created_at}) = ${today}`
      )
    );

  const todayOrders = todayOrdersResult[0]?.count || 0;

  // Подсчет онлайн курьеров (упрощенная логика - считаем всех активных курьеров)
  // TODO: Реализовать реальную проверку онлайн статуса через Redis или таблицу сессий
  const onlineCouriersResult = await db
    .select({ count: count() })
    .from(users)
    .where(
      and(
        eq(users.status, 'active'),
        sql`EXISTS (SELECT 1 FROM work_schedules WHERE work_schedules.user_id = ${users.id} AND work_schedules.terminal_id = ${terminalId})`
      )
    );

  const onlineCouriers = onlineCouriersResult[0]?.count || 0;

  return {
    orders_today: todayOrders,
    couriers_online: onlineCouriers,
    average_cooking_time: "15 мин", // TODO: реализовать реальный расчет
  };
}