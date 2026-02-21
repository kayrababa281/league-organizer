import { z } from 'zod';
import { insertTeamSchema, insertPlayerSchema, insertMatchSchema, insertMessageSchema, teams, players, matches, messages, bannedUsers } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.object({ success: z.boolean(), isAdmin: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    check: {
      method: 'GET' as const,
      path: '/api/auth/check',
      responses: {
        200: z.object({ isAdmin: z.boolean(), identifier: z.string(), userId: z.number().optional() }),
      },
    },
  },
  teams: {
    list: {
      method: 'GET' as const,
      path: '/api/teams',
      responses: {
        200: z.array(z.custom<typeof teams.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/teams',
      input: insertTeamSchema,
      responses: {
        201: z.custom<typeof teams.$inferSelect>(),
        403: errorSchemas.forbidden,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/teams/:id',
      responses: {
        204: z.void(),
        403: errorSchemas.forbidden,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/teams/:id',
      input: insertTeamSchema.partial(),
      responses: {
        200: z.custom<typeof teams.$inferSelect>(),
        403: errorSchemas.forbidden,
      },
    },
  },
  players: {
    list: {
      method: 'GET' as const,
      path: '/api/players',
      responses: {
        200: z.array(z.custom<typeof players.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/players',
      input: insertPlayerSchema,
      responses: {
        201: z.custom<typeof players.$inferSelect>(),
        403: errorSchemas.forbidden,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/players/:id',
      input: insertPlayerSchema.partial(),
      responses: {
        200: z.custom<typeof players.$inferSelect>(),
        403: errorSchemas.forbidden,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/players/:id',
      responses: {
        204: z.void(),
        403: errorSchemas.forbidden,
      },
    },
  },
  matches: {
    list: {
      method: 'GET' as const,
      path: '/api/matches',
      responses: {
        200: z.array(z.custom<typeof matches.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/matches',
      input: insertMatchSchema,
      responses: {
        201: z.custom<typeof matches.$inferSelect>(),
        403: errorSchemas.forbidden,
      },
    },
    updateScore: {
      method: 'PATCH' as const,
      path: '/api/matches/:id/score',
      input: z.object({
        homeScore: z.number(),
        awayScore: z.number(),
        videoUrl: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof matches.$inferSelect>(),
        403: errorSchemas.forbidden,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/matches/:id',
      responses: {
        204: z.void(),
        403: errorSchemas.forbidden,
      },
    },
  },
  chat: {
    list: {
      method: 'GET' as const,
      path: '/api/messages',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    },
    send: {
      method: 'POST' as const,
      path: '/api/messages',
      input: z.object({ content: z.string() }),
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
        403: errorSchemas.forbidden, // If banned
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/messages/:id',
      responses: {
        204: z.void(),
        403: errorSchemas.forbidden,
      },
    },
    ban: {
      method: 'POST' as const,
      path: '/api/chat/ban',
      input: z.object({ identifier: z.string() }), // Ban by identifier (IP/Session)
      responses: {
        201: z.void(),
        403: errorSchemas.forbidden,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
