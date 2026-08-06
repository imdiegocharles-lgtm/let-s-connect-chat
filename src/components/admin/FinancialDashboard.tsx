import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFinancialStats } from "@/lib/financial.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, 
  CreditCard, Download, RefreshCcw 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["#E11D48", "#FB7185", "#FDA4AF", "#FEE2E2", "#9F1239"];

export function FinancialDashboard() {
  const [period, setPeriod] = useState<"today" | "yesterday" | "last7days" | "thisMonth" | "lastMonth" | "thisYear" | "custom">("today");
  const getStats = useServerFn(getFinancialStats);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["financial-stats", period],
    queryFn: () => getStats({ data: { period } }),
  });

  const stats = data;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
          <p className="text-muted-foreground">Visão geral do desempenho do seu negócio.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="last7days">Últimos 7 dias</SelectItem>
              <SelectItem value="thisMonth">Este mês</SelectItem>
              <SelectItem value="lastMonth">Mês anterior</SelectItem>
              <SelectItem value="thisYear">Este ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="hidden sm:flex">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Faturamento" 
          value={formatCurrency(stats?.overview.revenue || 0)} 
          subValue={`${calculateChange(stats?.overview.revenue || 0, stats?.overview.prevRevenue || 0).toFixed(1)}% vs anterior`}
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          trend={calculateChange(stats?.overview.revenue || 0, stats?.overview.prevRevenue || 0) >= 0 ? 'up' : 'down'}
        />
        <StatCard 
          title="Pedidos" 
          value={stats?.overview.orders || 0} 
          subValue={`${calculateChange(stats?.overview.orders || 0, stats?.overview.prevOrders || 0).toFixed(1)}% vs anterior`}
          icon={<ShoppingCart className="h-4 w-4 text-primary" />}
          trend={calculateChange(stats?.overview.orders || 0, stats?.overview.prevOrders || 0) >= 0 ? 'up' : 'down'}
        />
        <StatCard 
          title="Ticket Médio" 
          value={formatCurrency(stats?.overview.ticketMedia || 0)} 
          subValue={`${calculateChange(stats?.overview.ticketMedia || 0, stats?.overview.prevTicketMedia || 0).toFixed(1)}% vs anterior`}
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          trend={calculateChange(stats?.overview.ticketMedia || 0, stats?.overview.prevTicketMedia || 0) >= 0 ? 'up' : 'down'}
        />
        <StatCard 
          title="Pagamento Principal" 
          value={stats?.overview.mainPayment || "N/A"} 
          subValue="Forma mais usada"
          icon={<CreditCard className="h-4 w-4 text-primary" />}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Evolução do Faturamento</CardTitle>
            <CardDescription>Receita diária no período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.charts.revenueTimeline}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E11D48" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E11D48" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => format(new Date(val), "dd/MM", { locale: ptBR })}
                  stroke="#888"
                />
                <YAxis stroke="#888" tickFormatter={(val) => `R$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                  labelFormatter={(val: any) => val ? format(new Date(val), "dd 'de' MMMM", { locale: ptBR }) : ""}
                  formatter={(val: any) => [formatCurrency(Number(val)), "Faturamento"]}
                />
                <Area type="monotone" dataKey="total" stroke="#E11D48" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Faturamento por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.charts.categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats?.charts.categories.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                  formatter={(val: any) => formatCurrency(Number(val))}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos por Hora</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.charts.hourly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                <XAxis dataKey="hour" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                  formatter={(val: any) => [val, "Pedidos"]}
                />
                <Bar dataKey="count" fill="#E11D48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Itens Mais Vendidos</CardTitle>
          <CardDescription>Produtos que mais geraram receita no período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Item</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Qtd</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Receita</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">% Part.</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {stats?.topItems.map((item: any) => (
                  <tr key={item.name} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">{item.name}</td>
                    <td className="p-4 align-middle text-right">{item.qty}</td>
                    <td className="p-4 align-middle text-right">{formatCurrency(item.revenue)}</td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">{item.percent.toFixed(1)}%</span>
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, subValue, icon, trend }: { title: string, value: string | number, subValue: string, icon: React.ReactNode, trend?: 'up' | 'down' }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="flex items-center text-xs text-muted-foreground">
          {trend === 'up' && <TrendingUp className="mr-1 h-3 w-3 text-green-500" />}
          {trend === 'down' && <TrendingDown className="mr-1 h-3 w-3 text-red-500" />}
          {subValue}
        </p>
      </CardContent>
    </Card>
  );
}
