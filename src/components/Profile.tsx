import React, { useState, useRef, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Pencil, X, Check } from "lucide-react";
import DashboardHeader from "./DashboardHeader";
import { useNavigate } from "react-router-dom";
import PageNavigation from './ui/PageNavigation';
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { supabase } from "@/lib/supabase";
import { optimizeProfilePicture } from "@/lib/imageOptimizer";
import { Alert, AlertDescription } from "./ui/alert";

interface VerifyPinInput {
  user_id: string;
  current_pin: string;
}

interface VerifyPinResponse {
  success: boolean;
  error?: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { userProfile, fetchUserProfile } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile?.name || "");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New state for local image handling
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);
  const [optimizedImage, setOptimizedImage] = useState<string | null>(null);

  // Add cleanup on unmount
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isEditing]);

  // Handle back button
  useEffect(() => {
    const handlePopState = () => {
      if (isEditing) {
        setIsEditing(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isEditing]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    try {
      setError(null);

      // Read file and create local preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = e.target?.result as string;
        setLocalImagePreview(fileData);

        // Optimize image
        try {
          const optimized = await optimizeProfilePicture(fileData);
          setOptimizedImage(optimized);
        } catch (error) {
          console.error('Error optimizing image:', error);
          setError('Failed to process image. Please try again.');
          setLocalImagePreview(null);
        }
      };
      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Error handling file:', error);
      setError('Failed to read image file. Please try again.');
    }

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;
    
    try {
      setUpdating(true);
      setError(null);

      // Handle PIN update if needed
      if (newPin) {
        if (newPin !== confirmPin) {
          setError('New PINs do not match');
          return;
        }

        if (newPin.length !== 6) {
          setError('PIN must be 6 digits');
          return;
        }

        const { data, error: verifyError } = await supabase.rpc(
          'verify_pin',
          {
            user_id: userProfile.id,
            current_pin: currentPin
          }
        );

        const verifyResult = data as VerifyPinResponse;

        if (verifyError || !verifyResult?.success) {
          setError(verifyResult?.error || 'Current PIN is incorrect');
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: `Store149#${newPin}`
        });

        if (passwordError) {
          setError('Failed to update PIN. Please try again.');
          return;
        }
      }

      // Handle image upload if there's an optimized image
      let newAvatarUrl = userProfile.avatar_url;
      if (optimizedImage) {
        // Generate unique filename
        const fileName = `avatar-${userProfile.id}-${Date.now()}.jpg`;
        
        // Convert base64 to blob
        const base64Data = optimizedImage.split(',')[1];
        const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(res => res.blob());

        // Delete old avatar if exists
        if (userProfile.avatar_url) {
          const oldFileName = userProfile.avatar_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('avatars')
              .remove([oldFileName]);
          }
        }

        // Upload new image
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        newAvatarUrl = publicUrl;
      }
      
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          name: editName,
          ...(newPin ? { pin: newPin } : {}),
          ...(newAvatarUrl ? { avatar_url: newAvatarUrl } : {})
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      // Clear states
      setLocalImagePreview(null);
      setOptimizedImage(null);
      
      // Fetch updated profile
      await fetchUserProfile();
      setIsEditing(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      <main className="flex-1 container mx-auto px-4 py-8 pb-24 relative">
        <div className="max-w-2xl mx-auto bg-card rounded-lg shadow-sm overflow-hidden">
          <div className="w-full min-h-[600px] bg-muted p-6">
            <Card className="bg-card max-w-xl mx-auto">
              <CardContent className="p-6">
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col items-center space-y-6">
                  <div className="relative w-full flex justify-center">
                    <Avatar className="h-32 w-32">
                      <AvatarImage src={localImagePreview || userProfile?.avatar_url} />
                      <AvatarFallback className="text-2xl">
                        {userProfile?.name?.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute bottom-0 right-1/2 translate-x-20 rounded-full h-8 w-8 p-0"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="absolute -top-2 right-0 h-9 w-9 p-0 rounded-full"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className="w-full space-y-4">
                    <div className="p-3 rounded-xl border bg-card shadow-sm">
                      <p className="text-sm text-muted-foreground">Name</p>
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Enter your name"
                          className="border-0 p-0 h-6 text-base font-medium focus-visible:ring-0 mt-1"
                        />
                      ) : (
                        <p className="text-base font-medium mt-1 text-foreground">{userProfile?.name}</p>
                      )}
                    </div>

                    <div className="p-3 rounded-xl border bg-card shadow-sm">
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-base font-medium mt-1 text-foreground">{userProfile?.phone}</p>
                    </div>

                    <div className="p-3 rounded-xl border bg-card shadow-sm">
                      <p className="text-sm text-muted-foreground">Designation</p>
                      <p className="text-base font-medium mt-1 text-foreground">{userProfile?.designation}</p>
                    </div>

                    {isEditing && (
                      <div className="space-y-4 pt-4">
                        <p className="text-sm font-medium text-foreground">Change PIN</p>
                        <div className="space-y-3">
                          <Input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Current PIN"
                            value={currentPin}
                            onChange={(e) => setCurrentPin(e.target.value)}
                            maxLength={6}
                            className="bg-background"
                          />
                          <Input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="New PIN"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            maxLength={6}
                            className="bg-background"
                          />
                          <Input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Confirm New PIN"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value)}
                            maxLength={6}
                            className="bg-background"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex justify-end space-x-4 w-full pt-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(userProfile?.name || "");
                          setCurrentPin("");
                          setNewPin("");
                          setConfirmPin("");
                          setError(null);
                          setLocalImagePreview(null);
                          setOptimizedImage(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveProfile}
                        disabled={updating || !editName.trim() || 
                          (newPin && (
                            !currentPin || 
                            !confirmPin || 
                            newPin !== confirmPin || 
                            newPin.length !== 6
                          ))}
                      >
                        {updating ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <PageNavigation />
      </main>
    </div>
  );
};

export default Profile; 