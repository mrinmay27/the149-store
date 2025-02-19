import React from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { ShoppingCart, Package, BarChart, Wallet, Receipt } from "lucide-react";
import { useStore } from "@/lib/store";

interface QuickActionProps {
  onSalesClick?: () => void;
  onInventoryClick?: () => void;
  onReportsClick?: () => void;
  onDepositsClick?: () => void;
  onExpensesClick?: () => void;
  activeMode?: "sales" | "inventory" | "reports" | "deposits" | "expenses" | null;
}

const QuickActions = ({
  onSalesClick = () => {},
  onInventoryClick = () => {},
  onReportsClick = () => {},
  onDepositsClick = () => {},
  onExpensesClick = () => {},
  activeMode = null,
}: QuickActionProps) => {
  const { userProfile, fetchUserProfile } = useStore();

  // Fetch user profile when component mounts
  React.useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  console.log("Current user profile:", userProfile);

  // Define all actions
  const actions = [
    {
      title: "Sales Mode",
      description: "Process transactions and manage cart",
      icon: <ShoppingCart className="h-7 w-7" />,
      onClick: onSalesClick,
      bgColor: activeMode === "sales" 
        ? "bg-gradient-to-r from-indigo-700 to-indigo-500 hover:from-indigo-800 hover:to-indigo-600 text-white shadow-[0_20px_35px_-10px_rgba(79,70,229,0.3)]" 
        : "bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-700 hover:to-indigo-500 text-white shadow-[0_20px_35px_-10px_rgba(79,70,229,0.3)]",
      showForStoreManager: true
    },
    {
      title: "Inventory",
      description: "Manage products and stock levels",
      icon: <Package className="h-7 w-7" />,
      onClick: onInventoryClick,
      bgColor: activeMode === "inventory"
        ? "bg-gradient-to-r from-amber-700 to-amber-500 hover:from-amber-800 hover:to-amber-600 text-white shadow-[0_20px_35px_-10px_rgba(245,158,11,0.3)]"
        : "bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-700 hover:to-amber-500 text-white shadow-[0_20px_35px_-10px_rgba(245,158,11,0.3)]",
      showForStoreManager: false
    },
    {
      title: "Reports",
      description: "View sales analytics and metrics",
      icon: <BarChart className="h-7 w-7" />,
      onClick: onReportsClick,
      bgColor: activeMode === "reports"
        ? "bg-gradient-to-r from-emerald-700 to-emerald-500 hover:from-emerald-800 hover:to-emerald-600 text-white shadow-[0_20px_35px_-10px_rgba(16,185,129,0.3)]"
        : "bg-gradient-to-r from-emerald-600 to-emerald-400 hover:from-emerald-700 hover:to-emerald-500 text-white shadow-[0_20px_35px_-10px_rgba(16,185,129,0.3)]",
      showForStoreManager: true
    },
    {
      title: "Deposits",
      description: "Manage and track deposits",
      icon: <Wallet className="h-7 w-7" />,
      onClick: onDepositsClick,
      bgColor: activeMode === "deposits"
        ? "bg-gradient-to-r from-violet-700 to-violet-500 hover:from-violet-800 hover:to-violet-600 text-white shadow-[0_20px_35px_-10px_rgba(139,92,246,0.3)]"
        : "bg-gradient-to-r from-violet-600 to-violet-400 hover:from-violet-700 hover:to-violet-500 text-white shadow-[0_20px_35px_-10px_rgba(139,92,246,0.3)]",
      showForStoreManager: false
    },
    {
      title: "Expenses",
      description: "Track and manage expenses",
      icon: <Receipt className="h-7 w-7" />,
      onClick: onExpensesClick,
      bgColor: activeMode === "expenses"
        ? "bg-gradient-to-r from-rose-700 to-rose-500 hover:from-rose-800 hover:to-rose-600 text-white shadow-[0_20px_35px_-10px_rgba(244,63,94,0.3)]"
        : "bg-gradient-to-r from-rose-600 to-rose-400 hover:from-rose-700 hover:to-rose-500 text-white shadow-[0_20px_35px_-10px_rgba(244,63,94,0.3)]",
      showForStoreManager: true
    }
  ];

  // Filter actions based on user designation and admin status
  const visibleActions = actions.filter(action => {
    if (!userProfile) return false;
    
    // Show all actions for Owner or Admin users
    if (userProfile.designation === 'Owner' || userProfile.is_admin) {
      return true;
    }
    
    // Show only store manager actions for others
    return action.showForStoreManager;
  });

  return (
    <div className="w-full h-full">
      <Card className="h-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 p-6">
          {visibleActions.map((action) => (
            <Button
              key={action.title}
              onClick={action.onClick}
              className={`flex items-center justify-start gap-4 p-4 h-32 rounded-xl ${action.bgColor}`}
              variant="ghost"
            >
              <div className="flex-shrink-0">
                {action.icon}
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg">
                  {action.title}
                </div>
                <div className="mt-1 text-sm opacity-90">
                  {action.description}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default QuickActions;
