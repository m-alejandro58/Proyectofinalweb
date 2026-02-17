import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface MetricCardProps {
    title: string
    value: string | number
    subValue?: string
    icon: LucideIcon
    className?: string
    valueClassName?: string
}

export function MetricCard({ title, value, subValue, icon: Icon, className, valueClassName }: MetricCardProps) {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueClassName}`}>{value}</div>
                {subValue && (
                    <p className="text-xs text-muted-foreground">
                        {subValue}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
