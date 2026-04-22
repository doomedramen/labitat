const chain = {
  primaryKey() {
    return this;
  },
  notNull() {
    return this;
  },
  unique() {
    return this;
  },
  default(_sql: any) {
    return this;
  },
  references() {
    return this;
  },
};

export const sqliteTable = (name: string, config: any) => config;

export const text = (_col: string) => {
  const obj = { ...chain };
  return obj;
};

export const integer = (_col: string) => {
  const obj = { ...chain };
  return obj;
};

export const index = (cols: string[]) => cols;
export const sql = (template: any) => template;
export const relations = (table: any, relationFn: any) => relationFn;
