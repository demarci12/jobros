"use client";

import { cn } from "@/lib/utils";

// DataView: desktop-on táblázat, mobil-on kártya — minden lista entitás ezt használja.
// Használat: <DataView columns={cols} data={rows} renderCard={(row) => <.../>} />

export interface DataViewColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataViewProps<T> {
  columns: DataViewColumn<T>[];
  data: T[];
  renderCard: (row: T, index: number) => React.ReactNode;
  keyExtractor: (row: T) => string;
  className?: string;
  stickyHeader?: boolean;
}

export function DataView<T>({
  columns,
  data,
  renderCard,
  keyExtractor,
  className,
  stickyHeader,
}: DataViewProps<T>) {
  return (
    <>
      {/* Desktop: táblázat */}
      <div className={cn("hidden md:block overflow-x-auto rounded-lg border", className)}>
        <table className="w-full text-sm">
          <thead>
            <tr className={cn("border-b bg-muted/50", stickyHeader && "sticky top-0 z-10")}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left font-medium text-muted-foreground",
                    col.hideOnMobile && "hidden lg:table-cell",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row) => (
              <tr key={keyExtractor(row)} className="hover:bg-muted/30 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 align-middle",
                      col.hideOnMobile && "hidden lg:table-cell",
                      col.className
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobil: kártyák */}
      <div className={cn("flex flex-col gap-2 md:hidden", className)}>
        {data.map((row, index) => (
          <div key={keyExtractor(row)}>{renderCard(row, index)}</div>
        ))}
      </div>
    </>
  );
}
