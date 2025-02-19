import React, { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import DashboardHeader from "./DashboardHeader";
import { useNavigate } from "react-router-dom";
import PageNavigation from './ui/PageNavigation';
import { haptics } from "@/lib/haptics";
import { Skeleton } from "./ui/skeleton";

interface Category {
  price: number;
  stock: number;
  isEditing?: boolean;
}

const Inventory = () => {
  const { categories, addCategory, updateStock, updatePrice, deleteCategory, fetchAllData, initialized } =
    useStore();
  const navigate = useNavigate();

  const [newPrice, setNewPrice] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isUpdatingStock, setIsUpdatingStock] = useState<number | null>(null);
  const [localStocks, setLocalStocks] = useState<Record<number, number>>({});
  const [isUpdatingPrice, setIsUpdatingPrice] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      if (!categories.length) {
        await fetchAllData();
      }
      setIsLoading(false);
    };
    
    initData();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      const stocks = categories.reduce((acc, cat) => {
        acc[cat.price] = cat.stock;
        return acc;
      }, {} as Record<number, number>);
      setLocalStocks(stocks);
      setIsLoading(false);
    }
  }, [categories]);

  const handleAddCategory = async () => {
    const price = parseInt(newPrice);
    if (price > 0 && !categories.some((cat) => cat.price === price)) {
      try {
        setIsAddingCategory(true);
        await haptics.medium();
        await addCategory(price);
        setNewPrice("");
      } catch (error) {
        console.error('Error adding category:', error);
        await haptics.error();
      } finally {
        setIsAddingCategory(false);
      }
    }
  };

  const handleUpdateStock = async (index: number, newStock: number) => {
    const category = categories[index];
    if (!category) return;

    let timeoutId: NodeJS.Timeout;

    try {
      // Update local state immediately for a responsive UI
      const validStock = Math.max(0, Math.min(newStock, 999999)); // Add reasonable limit
      setLocalStocks(prev => ({
        ...prev,
        [category.price]: validStock
      }));

      // Debounce the actual update to prevent too many API calls
      timeoutId = setTimeout(async () => {
        try {
          await updateStock(index, validStock);
        } catch (error) {
          console.error('Error updating stock:', error);
          await haptics.error();
          // Revert local state on error
          setLocalStocks(prev => ({
            ...prev,
            [category.price]: category.stock
          }));
        }
      }, 500); // 500ms debounce

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    } catch (error) {
      console.error('Error updating stock:', error);
      await haptics.error();
      // Revert local state on error
      setLocalStocks(prev => ({
        ...prev,
        [category.price]: category.stock
      }));
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const handleUpdatePrice = async (index: number) => {
    try {
      const newPrice = prompt(
        "Enter new price:",
        categories[index].price.toString(),
      );
      if (newPrice && !isNaN(Number(newPrice))) {
        setIsUpdatingPrice(index);
        await haptics.medium();
        await updatePrice(index, Number(newPrice));
      }
    } catch (error) {
      console.error('Error updating price:', error);
      await haptics.error();
    } finally {
      setIsUpdatingPrice(null);
    }
  };

  const handleDeleteCategory = async (index: number) => {
    try {
      if (confirm("Are you sure you want to delete this price category?")) {
        setIsDeleting(index);
        await haptics.heavy();
        await deleteCategory(index);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      await haptics.error();
    } finally {
      setIsDeleting(null);
    }
  };

  const totalItems = categories.reduce(
    (sum, category) => sum + category.stock,
    0,
  );

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-2 w-full p-2 rounded-lg border bg-white shadow-sm">
          <Skeleton className="h-6 w-24" />
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1">
              <Skeleton className="h-7 w-7" />
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-7 w-7" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-7 w-7" />
              <Skeleton className="h-7 w-7" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      <main className="flex-1 container mx-auto px-3 md:px-6 py-4 md:py-6 pb-24 flex flex-col">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-foreground">Inventory</h2>
        </div>

        <div className="flex-1 bg-card rounded-lg shadow-sm overflow-hidden">
          <div className="w-full min-h-[600px] bg-muted p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card">
                <CardContent className="p-6">
                  <div className="flex gap-2 mb-6">
                    <Input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="Enter new price"
                      className="w-40"
                      disabled={isAddingCategory}
                    />
                    <Button
                      onClick={handleAddCategory}
                      disabled={!newPrice || parseInt(newPrice) <= 0 || isAddingCategory}
                      className="active:animate-button-press"
                      variant="default"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Price
                    </Button>
                  </div>
                  {isLoading ? (
                    <LoadingSkeleton />
                  ) : (
                    <div className="space-y-4">
                      {categories.map((category, index) => (
                        <div
                          key={category.price}
                          className="flex items-center gap-2 w-full p-2 rounded-lg border border-border bg-card shadow-sm"
                        >
                          <div className="flex-none min-w-[100px]">
                            <h3 className="text-base font-medium">
                              ₹{category.price}'s Item
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateStock(index, localStocks[category.price] - 1)}
                                disabled={isUpdatingStock === index}
                                className="h-7 w-7 p-0"
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                value={localStocks[category.price] || 0}
                                onChange={(e) =>
                                  handleUpdateStock(index, parseInt(e.target.value) || 0)
                                }
                                className="w-14 text-center h-7 px-1"
                                min="0"
                                disabled={isUpdatingStock === index}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateStock(index, localStocks[category.price] + 1)}
                                disabled={isUpdatingStock === index}
                                className="h-7 w-7 p-0"
                              >
                                +
                              </Button>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdatePrice(index)}
                                disabled={isUpdatingPrice === index}
                                className="h-7 w-7 p-0"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCategory(index)}
                                disabled={isDeleting === index}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="h-fit bg-card">
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold mb-6 text-foreground">Inventory Summary</h3>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex justify-between mb-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                      <div className="border-t mt-4 pt-4">
                        <div className="flex justify-between">
                          <Skeleton className="h-6 w-24" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {categories.map(
                        (category) =>
                          category.stock > 0 && (
                            <div
                              key={category.price}
                              className="flex justify-between mb-2"
                            >
                              <span className="whitespace-nowrap">
                                ₹{category.price}'s Item
                              </span>
                              <span>{category.stock} in stock</span>
                            </div>
                          ),
                      )}
                      <div className="border-t mt-4 pt-4">
                        <div className="flex justify-between text-xl font-bold">
                          <span>Total Items</span>
                          <span>{totalItems}</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <PageNavigation />
      </main>
    </div>
  );
};

export default Inventory;
