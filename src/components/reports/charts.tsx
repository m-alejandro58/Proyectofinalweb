"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportsChartsProps {
  salesOverTime: { date: string; sales: number; profit: number }[];
  salesByPlatform: { name: string; value: number }[];
  salesByPaymentMethod: { name: string; value: number }[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function ReportsCharts({
  salesOverTime,
  salesByPlatform,
  salesByPaymentMethod,
}: ReportsChartsProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-6">
      {/* HERO CHART */}
      <Card className="border-border/50 bg-[#111827] overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl">Rendimiento Financiero</CardTitle>
        </CardHeader>

        <CardContent className="h-[430px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={salesOverTime}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>

                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#1f2937"
              />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
              />

              <YAxis
                tickFormatter={(value) => `$${value / 1000}k`}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
              />

              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: 12,
                }}
              />

              <Area
                type="monotone"
                dataKey="sales"
                stroke="#3b82f6"
                fill="url(#salesGradient)"
                strokeWidth={3}
              />

              <Area
                type="monotone"
                dataKey="profit"
                stroke="#10b981"
                fill="url(#profitGradient)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* SECONDARY CHARTS */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* PLATFORM CHART */}
        <Card className="border-border/50 bg-[#111827]">
          <CardHeader>
            <CardTitle>Ventas por Plataforma</CardTitle>
          </CardHeader>

          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salesByPlatform}
                layout="vertical"
                margin={{ left: 60 }}
              >
                <XAxis type="number" hide />

                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#cbd5e1" }}
                />

                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                  }}
                  itemStyle={{
                    color: "#22c55e",
                  }}
                />

                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {salesByPlatform.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* PAYMENT METHODS */}
        <Card className="border-border/50 bg-[#111827]">
          <CardHeader>
            <CardTitle>Métodos de Pago</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {salesByPaymentMethod.map((method, index) => {
              const total = salesByPaymentMethod.reduce(
                (acc, item) => acc + item.value,
                0,
              );

              const percent = (method.value / total) * 100;

              return (
                <div key={method.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-200">
                      {method.name}
                    </span>

                    <span className="text-slate-400">
                      {percent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percent}%`,
                        background: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
