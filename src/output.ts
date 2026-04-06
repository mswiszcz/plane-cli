import Table from "cli-table3";
import chalk from "chalk";

export interface Column<T> {
  header: string;
  key: keyof T | ((row: T) => string);
  width?: number;
}

export function printTable<T>(rows: T[], columns: Column<T>[]): void {
  const table = new Table({
    head: columns.map((c) => chalk.bold(c.header)),
    wordWrap: true,
    ...(columns.some((c) => c.width) && {
      colWidths: columns.map((c) => c.width ?? null),
    }),
  });

  for (const row of rows) {
    table.push(
      columns.map((col) => {
        if (typeof col.key === "function") return col.key(row);
        const val = row[col.key];
        return val == null ? "" : String(val);
      })
    );
  }

  console.log(table.toString());
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printError(err: string | Error | any): void {
  let message: string;
  if (typeof err === "string") {
    message = err;
  } else if (err?.isAxiosError && err.response?.data) {
    const data = err.response.data;
    const detail = data.detail ?? data.error ?? data.error_message ?? err.message;
    message = `${detail} (HTTP ${err.response.status})`;
  } else {
    message = err?.message ?? String(err);
  }
  console.error(chalk.red(`Error: ${message}`));
  process.exit(1);
}
