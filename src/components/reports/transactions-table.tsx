"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { TransactionRow } from "@/app/actions/reports";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Info } from "lucide-react";

interface TransactionsTableProps {
  data: TransactionRow[];
}

export function TransactionsTable({ data }: TransactionsTableProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val);

  const formatPercent = (val: number) => `${val.toFixed(1)}%`;

  // Totals for Footer
  const totals = data.reduce(
    (acc, row) => ({
      gross: acc.gross + row.grossAmount,
      cogs: acc.cogs + row.cogs,
      comm: acc.comm + row.commission,
      ship: acc.ship + row.shipping,
      taxes: acc.taxes + row.taxes + row.gmf + row.ica,
      net: acc.net + row.netProfit,
    }),
    { gross: 0, cogs: 0, comm: 0, ship: 0, taxes: 0, net: 0 },
  );

  const totalMargin = totals.gross > 0 ? (totals.net / totals.gross) * 100 : 0;

  return (
    <div className="rounded-md border bg-white dark:bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Método</TableHead>
            <TableHead className="text-right">Venta Total</TableHead>
            <TableHead className="text-right">Costo (COGS)</TableHead>
            <TableHead className="text-right">Comisión</TableHead>
            <TableHead className="text-right">Envío</TableHead>
            <TableHead className="text-right">Impuestos*</TableHead>
            <TableHead className="text-right font-bold text-green-600 dark:text-green-400">
              <span className="inline-flex items-center gap-1">
                Margen Contribución
                <span
                  title="Venta - COGS - Comisión - Envío - Impuestos Directos (sin incluir Gastos Operativos fijos como Ads/Admin)"
                  className="cursor-help"
                >
                  <Info className="h-3 w-3 text-muted-foreground" />
                </span>
              </span>
            </TableHead>
            <TableHead className="text-right">% Margen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center h-24">
                No hay transacciones para este periodo.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs max-w-[80px]">
                  {format(new Date(row.date), "dd/MM/yyyy", { locale: es })}
                </TableCell>
                <TableCell
                  className="text-xs text-muted-foreground w-[100px] truncate"
                  title={row.invoiceNumber || "N/A"}
                >
                  {row.invoiceNumber || "N/A"}
                </TableCell>
                <TableCell
                  className="text-xs font-medium max-w-[150px] truncate"
                  title={row.clientName}
                >
                  {row.clientName}
                </TableCell>
                <TableCell className="text-xs">{row.channel}</TableCell>
                <TableCell className="text-xs">{row.paymentMethod}</TableCell>
                <TableCell className="text-right text-xs">
                  {formatCurrency(row.grossAmount)}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {formatCurrency(row.cogs)}
                </TableCell>
                <TableCell className="text-right text-xs text-red-500">
                  {row.commission > 0
                    ? `-${formatCurrency(row.commission)}`
                    : "-"}
                </TableCell>
                <TableCell className="text-right text-xs text-red-500">
                  {row.shipping > 0 ? `-${formatCurrency(row.shipping)}` : "-"}
                </TableCell>
                <TableCell
                  className="text-right text-xs text-red-500"
                  title={`Ret: ${row.taxes} | GMF: ${row.gmf} | ICA: ${row.ica}`}
                >
                  {row.taxes + row.gmf + row.ica > 0
                    ? `-${formatCurrency(row.taxes + row.gmf + row.ica)}`
                    : "-"}
                </TableCell>
                <TableCell className="text-right font-bold text-xs text-green-600 dark:text-green-400">
                  {formatCurrency(row.netProfit)}
                </TableCell>
                <TableCell
                  className={`text-right text-xs font-bold ${row.margin < 15 ? "text-red-500" : "text-blue-500"}`}
                >
                  {formatPercent(row.margin)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {data.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5} className="font-bold">
                TOTALES
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(totals.gross)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(totals.cogs)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(totals.comm)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(totals.ship)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(totals.taxes)}
              </TableCell>
              <TableCell className="text-right font-bold text-lg text-green-600">
                {formatCurrency(totals.net)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatPercent(totalMargin)}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
      <div className="p-2 text-xs text-muted-foreground bg-muted/20 border-t space-y-1">
        <p>
          * <strong>Margen de Contribución</strong> = Venta − COGS − Comisión −
          Envío − Impuestos directos (Ret. + GMF + ICA proporcional).{" "}
          <em>No incluye Gastos Operativos fijos.</em>
        </p>
        <p>
          * <strong>Ganancia Neta del Período</strong> (en el resumen): el total
          de margen de contribución menos los Gastos Operativos (Ads, Admin,
          etc.) del período completo — alineado con el Dashboard.
        </p>
      </div>
    </div>
  );
}
