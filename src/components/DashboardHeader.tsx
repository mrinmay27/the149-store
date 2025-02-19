import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Bell, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProfileMenu from "./ui/ProfileMenu";
import { useStore } from "@/lib/store";
import NotificationsDialog from "./ui/NotificationsDialog";
import { supabase } from "@/lib/supabase";
import { Badge } from "./ui/badge";
import { ThemeToggle } from "./ui/theme-toggle";

interface DashboardHeaderProps {
  logoPath?: string;
}

const DashboardHeader = ({
  logoPath = "/logo.jpg", // Default to logo.jpg but can be overridden with logo.png
}: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { userProfile } = useStore();
  const [logoError, setLogoError] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isOwner = userProfile?.designation === 'Owner';

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getSession();
  }, []);

  // Try alternative logo format if primary fails to load
  const handleLogoError = () => {
    if (logoPath === "/logo.jpg" && !logoError) {
      setLogoError(true);
    }
  };

  const getLogoPath = () => {
    if (logoError) {
      return "/logo.png";
    }
    return logoPath;
  };

  return (
    <header className="w-full h-16 md:h-20 bg-background border-b border-border px-4 md:px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-4">
        <div 
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => navigate("/")}
        >
          <img 
            src={getLogoPath()}
            alt="Store Logo" 
            className="h-10 md:h-12 w-auto object-contain"
            onError={handleLogoError}
          />
        </div>
        <span className="text-sm md:text-base text-muted-foreground hidden md:inline">
          {currentDate}
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {isOwner && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/approvals")}
            title="User Approvals"
          >
            <UserCheck className="h-5 w-5" />
          </Button>
        )}
        <ThemeToggle />
        <NotificationsDialog userId={userId} />
        <ProfileMenu />
      </div>
    </header>
  );
};

export default DashboardHeader;
