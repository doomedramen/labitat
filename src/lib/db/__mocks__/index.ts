const mockDb = {
  query: {
    groups: {
      findMany: () => [],
    },
  },
} as any;

export const db = mockDb;

export const drizzle = () => mockDb;
