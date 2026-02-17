"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts"

interface ReportsChartsProps {
    salesOverTime: { date: string; sales: number; profit: number }[]
    salesByPlatform: { name: string; value: number }[]
    salesByPaymentMethod: { name: string; value: number }[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function ReportsCharts({ salesOverTime, salesByPlatform, salesByPaymentMethod }: ReportsChartsProps) {

    // Custom Tooltip for Bar Chart
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-md rounded text-sm">
                    <p className="font-semibold mb-1">{label}</p>
                    <p className="text-blue-600">Ventas: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(payload[0].value)}</p>
                    <p className="text-green-600">Ganancia: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(payload[1].value)}</p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* SALES & PROFIT OVER TIME */}
            <Card className="col-span-1 lg:col-span-2">
                <CardHeader>
                    <CardTitle>Ventas y Ganancias en el Tiempo</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesOverTime} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value / 1000}k`}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                            <Bar dataKey="sales" name="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="profit" name="Ganancia Neta" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* SALES BY PLATFORM */}
            <Card>
                <CardHeader>
                    <CardTitle>Ventas por Plataforma</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={salesByPlatform}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }: any) => (percent || 0) > 0.05 ? `${name} ${((percent || 0) * 100).toFixed(0)}%` : ''}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {salesByPlatform.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value)} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* SALES BY PAYMENT METHOD */}
            <Card>
                <CardHeader>
                    <CardTitle>Métodos de Pago Utilizados</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={salesByPaymentMethod}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }: any) => (percent || 0) > 0.05 ? `${name} ${((percent || 0) * 100).toFixed(0)}%` : ''}
                                innerRadius={60}
                                outerRadius={100}
                                fill="#8884d8"
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {salesByPaymentMethod.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value)} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

        </div>
    )
}
