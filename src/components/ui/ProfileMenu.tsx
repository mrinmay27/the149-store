import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { signOut } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { LogOut, User } from "lucide-react";

interface ProfileMenuProps {
  userAvatar?: string;
  userName?: string;
}

const ProfileMenu = ({
  userAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=store-manager",
}: ProfileMenuProps) => {
  const navigate = useNavigate();
  const { userProfile } = useStore();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-8 w-8 rounded-full">
          <Avatar>
            <AvatarImage src={userProfile?.avatar_url || userAvatar} alt={userProfile?.name || ""} />
            <AvatarFallback>
              {userProfile?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel className="font-normal py-1.5 px-2">
          <div className="flex flex-col">
            <p className="text-sm font-medium leading-none">{userProfile?.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {userProfile?.designation}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0.5" />
        <DropdownMenuItem 
          onClick={() => navigate("/profile")} 
          className="cursor-pointer py-1.5 px-2 text-sm"
        >
          <User className="mr-1.5 h-3.5 w-3.5" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleSignOut} 
          className="cursor-pointer py-1.5 px-2 text-sm text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="mr-1.5 h-3.5 w-3.5" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu; 