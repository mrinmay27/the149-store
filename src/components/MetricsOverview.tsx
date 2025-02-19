import React from "react";
import { Card, CardContent } from "./ui/card";
import {
  ArrowDown,
  ArrowUp,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";

const RupeeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 md:h-6 md:w-6 text-primary"
  >
    <path d="M6 3h12" />
    <path d="M6 8h12" />
    <path d="M6 13l8.5 8" />
    <path d="M6 13h3" />
    <path d="M9 13c6.667 0 6.667-10 0-10" />
  </svg>
);

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  onClick?: () => void;
}

const MetricCard = ({
  title,
  value,
  change,
  icon,
  onClick,
}: MetricCardProps) => {
  const isPositive = change >= 0;

  return (
    <Card
      className={`bg-white ${onClick ? "cursor-pointer transition-colors hover:bg-gray-50" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between">
          <div className="p-2 md:p-3 bg-primary/10 rounded-lg">{icon}</div>
          {change !== 0 && (
            <div
              className={`flex items-center ${isPositive ? "text-green-600" : "text-red-600"}`}
            >
              {isPositive ? (
                <ArrowUp className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <ArrowDown className="h-4 w-4 md:h-5 md:w-5" />
              )}
              <span className="ml-1 text-sm md:text-base font-medium">
                {Math.round(Math.abs(change))}%
              </span>
            </div>
          )}
        </div>
        <div className="mt-3 md:mt-4">
          <p className="text-sm md:text-base text-muted-foreground font-medium">{title}</p>
          <h3 className="text-lg md:text-2xl font-bold mt-1 md:mt-2">
            {value}
          </h3>
        </div>
      </CardContent>
    </Card>
  );
};

interface MetricsOverviewProps {
  onTodaySalesClick?: () => void;
}

const MetricsOverview = ({ onTodaySalesClick }: MetricsOverviewProps) => {
  const { sales, balances } = useStore();

  // Get today's date at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get yesterday's date at midnight for comparison
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Filter sales for today and yesterday
  const todaysSales = sales.filter(
    (sale) => new Date(sale.timestamp) >= today
  );
  const yesterdaysSales = sales.filter(
    (sale) => {
      const saleDate = new Date(sale.timestamp);
      return saleDate >= yesterday && saleDate < today;
    }
  );

  // Calculate today's metrics
  const todayTotal = todaysSales.reduce((sum, sale) => sum + sale.total, 0);
  const todayItems = todaysSales.reduce(
    (sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );
  const uniqueCustomers = new Set(todaysSales.map(sale => sale.id)).size;

  // Calculate yesterday's metrics for comparison
  const yesterdayTotal = yesterdaysSales.reduce((sum, sale) => sum + sale.total, 0);
  const yesterdayItems = yesterdaysSales.reduce(
    (sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );
  const yesterdayCustomers = new Set(yesterdaysSales.map(sale => sale.id)).size;

  // Calculate percentage changes
  const calculateChange = (today: number, yesterday: number) => {
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return ((today - yesterday) / yesterday) * 100;
  };

  const salesChange = calculateChange(todayTotal, yesterdayTotal);
  const itemsChange = calculateChange(todayItems, yesterdayItems);
  const customersChange = calculateChange(uniqueCustomers, yesterdayCustomers);

  return (
    <div className="w-full bg-gray-50 p-4 md:p-6 rounded-lg">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Sales"
          value={`₹${todayTotal.toLocaleString("en-IN")}`}
          change={salesChange}
          icon={<RupeeIcon />}
          onClick={onTodaySalesClick}
        />
        <MetricCard
          title="Items Sold"
          value={todayItems.toString()}
          change={itemsChange}
          icon={<ShoppingBag className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
        />
        <MetricCard
          title="Shop Balance"
          value={`₹${balances.shopBalance.toLocaleString("en-IN")}`}
          change={0}
          icon={<Wallet className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
        />
        <MetricCard
          title="Active Customers"
          value={uniqueCustomers.toString()}
          change={customersChange}
          icon={<Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
        />
      </div>
    </div>
  );
};

export default MetricsOverview;
