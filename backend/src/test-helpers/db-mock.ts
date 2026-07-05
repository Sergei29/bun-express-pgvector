export const dbMock = {
  insertData: [] as any[],
  selectData: [] as any[],
  updateData: [] as any[],
  deleteData: [] as any[],
  dbError: null as Error | null,
};

export function createDbMockModule() {
  return {
    db: {
      insert: (_table: any) => ({
        values: (_vals: any) => ({
          returning: () =>
            dbMock.dbError
              ? Promise.reject(dbMock.dbError)
              : Promise.resolve(dbMock.insertData),
        }),
      }),
      select: (_cols?: any) => ({
        from: (_table: any) => ({
          limit: (_n: number) => ({
            offset: (_n: number) =>
              dbMock.dbError
                ? Promise.reject(dbMock.dbError)
                : Promise.resolve(dbMock.selectData),
          }),
          where: (_cond: any) => ({
            limit: (_n: number) =>
              dbMock.dbError
                ? Promise.reject(dbMock.dbError)
                : Promise.resolve(dbMock.selectData),
          }),
          orderBy: (_expr: any) => ({
            limit: (_n: number) =>
              dbMock.dbError
                ? Promise.reject(dbMock.dbError)
                : Promise.resolve(dbMock.selectData),
          }),
        }),
      }),
      update: (_table: any) => ({
        set: (_vals: any) => ({
          where: (_cond: any) => ({
            returning: () =>
              dbMock.dbError
                ? Promise.reject(dbMock.dbError)
                : Promise.resolve(dbMock.updateData),
          }),
        }),
      }),
      delete: (_table: any) => ({
        where: (_cond: any) => ({
          returning: () =>
            dbMock.dbError
              ? Promise.reject(dbMock.dbError)
              : Promise.resolve(dbMock.deleteData),
        }),
      }),
    },
  };
}
