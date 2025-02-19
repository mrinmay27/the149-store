import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { BarChart, LineChart, CalendarDays, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { X } from "lucide-react";

import { useStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import DashboardHeader from "./DashboardHeader";
import { useNavigate } from "react-router-dom";
import PageNavigation from './ui/PageNavigation';

interface SaleDetailsProps {
  sale: {
    id?: string;
    user_id?: string;
    created_by?: string;
    timestamp?: string;
    items: { 
      category: { id: string; price: number; stock: number };
      quantity: number;
    }[];
    total: number;
    payment: {
      cash: number;
      online: number;
      slipImage?: string;
    };
    creator?: {
      name: string;
      designation: string;
    };
  };
  onClose: () => void;
  open: boolean;
}

const SaleDetails = ({ sale, onClose, open }: SaleDetailsProps) => {
  const [showFullImage, setShowFullImage] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-background">
          <DialogHeader>
            <DialogTitle className="text-foreground">Sale Details</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Date & Time</p>
                <p className="font-medium text-foreground">{new Date(sale.timestamp || '').toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="font-medium text-foreground">{totalItems}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-medium text-foreground">₹{sale.total}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Items</p>
              <div className="space-y-2">
                {sale.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-muted p-2 rounded">
                    <div>
                      <p className="font-medium text-foreground">₹{item.category.price}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-foreground">₹{item.category.price * item.quantity}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Payment Details</p>
              <div className="space-y-2">
                {sale.payment.cash > 0 && (
                  <div className="flex justify-between items-center bg-muted p-2 rounded">
                    <p className="text-foreground">Cash</p>
                    <p className="font-medium text-foreground">₹{sale.payment.cash}</p>
                  </div>
                )}
                {sale.payment.online > 0 && (
                  <div className="flex justify-between items-center bg-muted p-2 rounded">
                    <p className="text-foreground">Online</p>
                    <p className="font-medium text-foreground">₹{sale.payment.online}</p>
                  </div>
                )}
              </div>
            </div>
            {sale.payment.slipImage && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Payment Slip</p>
                <img
                  src={sale.payment.slipImage}
                  alt="Payment Slip"
                  className="w-full h-auto cursor-pointer"
                  onClick={() => setShowFullImage(true)}
                  onLoad={handleImageLoad}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {sale.payment.slipImage && (
        <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-background">
            <div className="relative w-full h-full flex items-center justify-center bg-muted">
              <img
                src={sale.payment.slipImage}
                alt="Payment Slip Full View"
                className="max-w-full max-h-[85vh] object-contain"
                style={{
                  width: 'auto',
                  height: 'auto'
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="absolute top-4 right-4 rounded-full bg-background shadow-md hover:bg-muted border-border z-10"
                onClick={() => setShowFullImage(false)}
              >
                <X className="h-5 w-5 text-foreground" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

interface DateSalesDialogProps {
  date: string;
  sales: Array<{
    id?: string;
    user_id?: string;
    created_by?: string;
    timestamp?: string;
    items: { 
      category: { id: string; price: number; stock: number };
      quantity: number;
    }[];
    total: number;
    payment: {
      cash: number;
      online: number;
      slipImage?: string;
    };
    creator?: {
      name: string;
      designation: string;
    };
  }>;
  onClose: () => void;
  onSaleClick: (saleId: string) => void;
}

const DateSalesDialog = ({ date, sales, onClose, onSaleClick }: DateSalesDialogProps) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-background">
        <DialogHeader>
          <DialogTitle className="text-foreground">Sales for {new Date(date).toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {sales.map((sale) => (
            <div
              key={sale.id}
              className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer border border-border"
              onClick={() => onSaleClick(sale.id || '')}
            >
              <div className="flex flex-col">
                <span className="font-medium text-foreground">
                  {formatTime(sale.timestamp || '')}
                </span>
                {sale.creator && (
                  <span className="text-xs text-muted-foreground">
                    By: {sale.creator.name} ({sale.creator.designation})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-green-600 font-medium">₹{sale.total}</div>
                  <div className="text-sm text-muted-foreground">
                    {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ReportsProps {}

const Reports = () => {
  const navigate = useNavigate();
  const { sales } = useStore();
  const [selectedSale, setSelectedSale] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const sale = sales.find((s) => s.id === selectedSale);

  // Get today's sales
  const dailySales = sales.filter(
    (s) => new Date(s.timestamp).toDateString() === new Date().toDateString(),
  );

  // Group sales by month
  const monthlySales = sales.reduce((acc, sale) => {
    const date = new Date(sale.timestamp);
    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(sale);
    return acc;
  }, {} as Record<string, typeof sales>);

  // Group all sales by date
  const totalSalesByDate = sales.reduce((acc, sale) => {
    const date = new Date(sale.timestamp).toDateString();
    
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(sale);
    return acc;
  }, {} as Record<string, typeof sales>);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTotalAmount = (salesArray: typeof sales) => {
    return salesArray.reduce((sum, sale) => sum + sale.total, 0);
  };

  const calculateTotalItems = (salesArray: typeof sales) => {
    return salesArray.reduce(
      (sum, sale) =>
        sum +
        sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      <main className="flex-1 container mx-auto px-3 md:px-6 py-4 md:py-6 pb-24 flex flex-col">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-foreground">Reports</h2>
        </div>

        <div className="flex-1 bg-card rounded-lg shadow-sm overflow-hidden p-4 md:p-6">
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full max-w-[400px] grid-cols-3 mb-4 md:mb-6 bg-muted">
              <TabsTrigger value="daily" className="flex items-center gap-2 data-[state=active]:bg-background">
                <BarChart className="h-4 w-4" />
                Today
              </TabsTrigger>
              <TabsTrigger value="monthly" className="flex items-center gap-2 data-[state=active]:bg-background">
                <LineChart className="h-4 w-4" />
                Monthly
              </TabsTrigger>
              <TabsTrigger value="total" className="flex items-center gap-2 data-[state=active]:bg-background">
                <CalendarDays className="h-4 w-4" />
                Total
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              <Card className="bg-card">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 text-foreground">Today's Sales Report</h3>
                  <div className="space-y-4">
                    {dailySales.map((sale) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer"
                        onClick={() => setSelectedSale(sale.id)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {formatTime(sale.timestamp)}
                          </span>
                          {sale.creator && (
                            <span className="text-xs text-muted-foreground">
                              By: {sale.creator.name} ({sale.creator.designation})
                            </span>
                          )}
                        </div>
                        <div className="flex gap-8">
                          <span className="text-green-600">₹{sale.total}</span>
                          <span className="text-muted-foreground">
                            {sale.items.reduce(
                              (sum, item) => sum + item.quantity,
                              0,
                            )}{" "}
                            items
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-border pt-4 mt-4">
                      <div className="flex justify-between font-bold">
                        <span className="text-foreground">Total</span>
                        <div className="flex gap-8">
                          <span className="text-green-600">
                            ₹{calculateTotalAmount(dailySales)}
                          </span>
                          <span className="text-muted-foreground">
                            {calculateTotalItems(dailySales)} items
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monthly">
              <Card className="bg-card">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 text-foreground">Monthly Sales Report</h3>
                  <div className="space-y-6">
                    {Object.entries(monthlySales)
                      .sort((a, b) => new Date(b[1][0].timestamp).getTime() - new Date(a[1][0].timestamp).getTime())
                      .map(([monthYear, monthSales]) => (
                        <div key={monthYear} className="space-y-4">
                          <h4 className="text-lg font-semibold text-foreground">{monthYear}</h4>
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex justify-between mb-2 text-sm font-medium text-muted-foreground">
                              <span>Total Sales</span>
                              <span>₹{calculateTotalAmount(monthSales)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Total Items</span>
                              <span>{calculateTotalItems(monthSales)} items</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="total">
              <Card className="bg-card">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 text-foreground">Total Sales Report</h3>
                  <div className="space-y-4">
                    {Object.entries(totalSalesByDate)
                      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                      .map(([date, dateSales]) => (
                        <div
                          key={date}
                          onClick={() => setSelectedDate(date)}
                          className="p-4 hover:bg-muted rounded-lg cursor-pointer border border-border transition-colors duration-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-lg font-semibold text-foreground">
                              {new Date(date).toLocaleDateString('en-US', { 
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </h4>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex justify-between text-sm">
                            <div className="space-y-1">
                              <div className="text-muted-foreground">Total Sales</div>
                              <div className="text-green-600 font-medium text-lg">
                                ₹{calculateTotalAmount(dateSales)}
                              </div>
                            </div>
                            <div className="space-y-1 text-right">
                              <div className="text-muted-foreground">Total Items</div>
                              <div className="text-foreground font-medium text-lg">
                                {calculateTotalItems(dateSales)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {selectedDate && (
          <DateSalesDialog
            date={selectedDate}
            sales={totalSalesByDate[selectedDate]}
            onClose={() => setSelectedDate(null)}
            onSaleClick={(saleId) => {
              setSelectedSale(saleId);
              setSelectedDate(null);
            }}
          />
        )}

        {sale && (
          <SaleDetails
            sale={sale}
            open={!!selectedSale}
            onClose={() => setSelectedSale(null)}
          />
        )}

        <PageNavigation />
      </main>
    </div>
  );
};

export default Reports;
