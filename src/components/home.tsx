import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, BarChart3, Receipt } from "lucide-react";
import { useStore } from "@/lib/store";
import QuickActions from "./QuickActions";

interface HomeProps {
  storeName?: string;
  userAvatar?: string;
  userName?: string;
}

const Home = ({
  storeName,
  userAvatar,
  userName,
}: HomeProps) => {
  const navigate = useNavigate();
  const { sales, balances, fetchAllData } = useStore();
  const [todaySales, setTodaySales] = useState(0);
  const [itemsSold, setItemsSold] = useState(0);
  const [activeCustomers, setActiveCustomers] = useState(0);

  useEffect(() => {
    const calculateMetrics = () => {
      // Get today's date at midnight for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter sales for today
      const todaysSales = sales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= today;
      });

      // Calculate total sales amount for today
      const totalSalesAmount = todaysSales.reduce((sum, sale) => sum + sale.total, 0);
      setTodaySales(totalSalesAmount);

      // Calculate total items sold today
      const totalItemsSold = todaysSales.reduce((sum, sale) => 
        sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
      setItemsSold(totalItemsSold);

      // Count unique customers (using user_id)
      const uniqueCustomers = new Set(todaysSales.map(sale => sale.user_id));
      setActiveCustomers(uniqueCustomers.size);
    };

    calculateMetrics();
  }, [sales]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-3 md:px-6 py-4 md:py-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Today's Sales</p>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-foreground">₹{todaySales}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Items Sold</p>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-foreground">{itemsSold}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Shop Balance</p>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-foreground">₹{balances?.shopBalance || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Customers</p>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-foreground">{activeCustomers}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <QuickActions 
            onSalesClick={() => navigate("/sales")}
            onInventoryClick={() => navigate("/inventory")}
            onReportsClick={() => navigate("/reports")}
            onDepositsClick={() => navigate("/deposits")}
            onExpensesClick={() => navigate("/expenses")}
          />
        </div>
      </main>
    </div>
  );
};

export default Home;
