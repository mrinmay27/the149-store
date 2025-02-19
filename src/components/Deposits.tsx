import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Camera, Upload } from "lucide-react";
import DashboardHeader from "./DashboardHeader";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import PageNavigation from './ui/PageNavigation';
import { optimizeImage } from "@/lib/imageOptimizer";
import { toast } from "./ui/use-toast";

interface User {
  id: string;
  name: string;
  designation: string;
}

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  payment_mode: string;
  slip_image?: string;
  timestamp: string;
  creator: {
    name: string;
    designation: string;
  };
}

interface DepositResponse {
  id: string;
  user_id: string;
  amount: number;
  payment_mode: string;
  slip_image?: string;
  timestamp: string;
  creator: {
    name: string;
    designation: string;
  };
}

interface UserProfile {
  id: string;
  designation: string;
}

const Deposits = () => {
  const navigate = useNavigate();
  const { userProfile, balances, fetchBalances } = useStore();
  const [amount, setAmount] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [paymentSlipImage, setPaymentSlipImage] = useState<string | null>(null);
  const [optimizedSlipImage, setOptimizedSlipImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Define memoized fetch functions
  const fetchUsers = React.useCallback(async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, designation')
        .order('name');

      if (usersError) throw usersError;

      if (!usersData) {
        setUsers([]);
        return;
      }

      const processedUsers: User[] = usersData.map(user => ({
        id: String(user.id),
        name: String(user.name),
        designation: String(user.designation)
      }));

      const filteredUsers = processedUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users. Please try again.');
    }
  }, [searchQuery]);

  const fetchDeposits = React.useCallback(async () => {
    try {
      const { data: depositsData, error: depositsError } = await supabase
        .from('deposits')
        .select('*, depositor:profiles!deposits_deposited_by_fkey(name, designation), receiver:profiles!deposits_received_by_fkey(name, designation)')
        .order('timestamp', { ascending: false });

      if (depositsError) throw depositsError;

      if (!depositsData) {
        setDeposits([]);
        return;
      }

      const processedDeposits: Deposit[] = depositsData.map(deposit => {
        const depositor = deposit.depositor && typeof deposit.depositor === 'object' 
          ? deposit.depositor as { name: string; designation: string }
          : null;
        const receiver = deposit.receiver && typeof deposit.receiver === 'object'
          ? deposit.receiver as { name: string; designation: string }
          : null;

        return {
          id: String(deposit.id),
          user_id: String(deposit.deposited_by),
          amount: Number(deposit.amount),
          payment_mode: String(deposit.payment_mode || 'manual'),
          slip_image: deposit.slip_image ? String(deposit.slip_image) : undefined,
          timestamp: String(deposit.timestamp),
          creator: depositor ? {
            name: String(depositor.name),
            designation: String(depositor.designation)
          } : {
            name: 'Unknown',
            designation: 'Unknown'
          }
        };
      });

      setDeposits(processedDeposits);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      throw new Error('Failed to fetch deposits. Please try again.');
    }
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/auth');
          return;
        }

        // Sequential fetching to ensure proper data loading
        await fetchBalances();
        await fetchUsers();
        await fetchDeposits();
        
      } catch (error) {
        console.error('Error initializing data:', error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Failed to load initial data. Please check your connection and try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/auth');
      } else if (event === 'SIGNED_IN') {
        // Reload data when signed in
        initializeData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, fetchBalances, fetchUsers, fetchDeposits]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardHeader />
        <main className="flex-1 container mx-auto px-3 md:px-6 py-4 md:py-6 pb-24 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardHeader />
        <main className="flex-1 container mx-auto px-3 md:px-6 py-4 md:py-6 pb-24 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </main>
      </div>
    );
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const fileData = e.target?.result as string;
          // Set immediate preview
          setPaymentSlipImage(fileData);
          
          // Optimize image in background
          try {
            const optimized = await optimizeImage(fileData);
            setOptimizedSlipImage(optimized);
          } catch (error) {
            console.error('Error optimizing image:', error);
            setError('Failed to process image. Please try again.');
            setPaymentSlipImage(null);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error reading file:', error);
        setError('Failed to read image file. Please try again.');
      }
    }
    // Clear input
    if (event.target) {
      event.target.value = '';
    }
  };

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setStream(mediaStream);
      setShowCamera(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Could not access camera. Please make sure you have granted camera permissions.");
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement("canvas");
        const video = videoRef.current;
        
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Draw the video frame to canvas
          ctx.drawImage(video, 0, 0);
          
          // Get the initial image data and set preview
          const initialImageData = canvas.toDataURL("image/jpeg", 1.0);
          setPaymentSlipImage(initialImageData);
          
          // Optimize the image in background
          try {
            const optimizedImageData = await optimizeImage(initialImageData);
            setOptimizedSlipImage(optimizedImageData);
          } catch (error) {
            console.error('Error optimizing image:', error);
            setError('Failed to process image. Please try again.');
            setPaymentSlipImage(null);
          }
          
          stopCamera();
        }
      } catch (error) {
        console.error("Error capturing photo:", error);
        setError("Failed to capture photo. Please try again.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const handleSubmit = async () => {
    const submitLoading = isLoading;
    try {
      setError(null);
      setIsLoading(true);

      const depositAmount = parseInt(amount);
      if (isNaN(depositAmount) || depositAmount <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      // Validate against available balance
      if (depositAmount > balances.shopBalance) {
        setError(`Deposit amount cannot exceed available balance of ₹${balances.shopBalance}`);
        return;
      }

      if (!selectedUser) {
        setError('Please select a user');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to create a deposit');
        return;
      }

      let slipImageUrl = null;
      if (optimizedSlipImage) {
        try {
          // Generate unique filename
          const fileName = `deposit-${user.id}-${Date.now()}.jpg`;
          const filePath = `deposits/${fileName}`;
          
          // Convert base64 to blob
          const base64Data = optimizedSlipImage.split(',')[1];
          const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(res => res.blob());

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, blob, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

          slipImageUrl = publicUrl;
        } catch (error) {
          console.error('Error uploading image:', error);
          setError('Failed to upload image. Please try again.');
          return;
        }
      }

      // Create deposit record
      const { error: depositError } = await supabase
        .from('deposits')
        .insert([{
          amount: depositAmount,
          deposited_by: selectedUser,
          received_by: user.id,
          description: 'Manual deposit',
          slip_image: slipImageUrl
        }]);

      if (depositError) {
        console.error('Error creating deposit:', depositError);
        throw new Error('Failed to create deposit. Please try again.');
      }

      // Reset form
      setAmount("");
      setSelectedUser("");
      setPaymentSlipImage(null);
      setOptimizedSlipImage(null);
      
      // Refresh data
      await Promise.all([
        fetchDeposits(),
        fetchBalances()
      ]);

      // Show success message
      toast({
        title: "Success",
        description: "Deposit created successfully",
        variant: "default"
      });

    } catch (error) {
      console.error('Error creating deposit:', error);
      setError(error instanceof Error ? error.message : 'Failed to create deposit. Please try again.');
    } finally {
      setIsLoading(submitLoading);
    }
  };

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      <main className="flex-1 container mx-auto px-3 md:px-6 py-4 md:py-6 pb-24 flex flex-col">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-foreground">Deposits</h2>
        </div>

        <div className="flex-1 bg-card rounded-lg shadow-sm overflow-hidden">
          <Tabs defaultValue="create">
            <div className="grid grid-cols-1 gap-4 p-4">
              <Card className="bg-card">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Shop Balance</div>
                      <div className="text-3xl font-bold text-green-600">₹{balances.shopBalance}</div>
                    </div>
                    
                    {userProfile?.designation === 'Owner' && (
                      <div className="pt-4 border-t border-border">
                        <div className="text-sm text-muted-foreground">Bank Balance</div>
                        <div className="text-3xl font-bold text-blue-600">₹{balances.bankBalance}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <TabsList className="w-full max-w-[400px] grid grid-cols-2">
              <TabsTrigger value="create">Create Deposit</TabsTrigger>
              <TabsTrigger value="history">Deposit History</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="p-4 md:p-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          setError(null);
                        }}
                        placeholder="Enter deposit amount"
                      />
                      {parseInt(amount) > balances.shopBalance && (
                        <div className="text-sm text-red-500">
                          Amount exceeds available balance
                        </div>
                      )}
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label>Deposited By</Label>
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.designation})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Slip</Label>
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Slip
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={startCamera}
                            className="flex-1"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Take Photo
                          </Button>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                        />
                        {showCamera && (
                          <div className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              className="absolute inset-0 w-full h-full object-contain"
                            />
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                              <Button onClick={capturePhoto} variant="secondary">
                                Capture
                              </Button>
                              <Button onClick={stopCamera} variant="destructive">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                        {paymentSlipImage && !showCamera && (
                          <div className="relative w-full bg-muted rounded-lg border border-border overflow-hidden">
                            <div className="relative w-full" style={{ paddingTop: "75%" }}>
                              <img
                                src={paymentSlipImage}
                                alt="Payment Slip"
                                className="absolute inset-0 w-full h-full object-contain p-2"
                              />
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => setPaymentSlipImage(null)}
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleSubmit}
                      disabled={isLoading || !amount || !selectedUser}
                    >
                      {isLoading ? "Creating..." : "Create Deposit"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="p-4 md:p-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {deposits.map((deposit) => (
                      <div
                        key={deposit.id}
                        className="flex flex-col justify-between p-3 hover:bg-muted rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 border border-border mb-3"
                        onClick={() => {
                          if (deposit.slip_image) {
                            setSelectedImage(deposit.slip_image);
                            setShowImageDialog(true);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-green-600">₹{deposit.amount}</span>
                            {deposit.slip_image && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                                Has Slip
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm mt-1.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">From:</span>
                              <span className="font-medium text-foreground">{deposit.creator.name}</span>
                              <span className="text-xs text-muted-foreground">({deposit.creator.designation})</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(deposit.timestamp)} {formatTime(deposit.timestamp)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">To:</span>
                              <span className="font-medium text-foreground">{deposit.creator.name}</span>
                              <span className="text-xs text-muted-foreground">({deposit.creator.designation})</span>
                            </div>
                            {deposit.slip_image && (
                              <span className="text-xs text-blue-500 hover:underline">
                                View Slip
                              </span>
                            )}
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

        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
            <DialogHeader>
              <DialogTitle className="p-4">Payment Slip</DialogTitle>
            </DialogHeader>
            {selectedImage && (
              <div className="relative w-full h-full flex items-center justify-center bg-muted">
                <img
                  src={selectedImage}
                  alt="Payment Slip Full View"
                  className="max-w-full max-h-[85vh] object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <PageNavigation />
      </main>
    </div>
  );
};

export default Deposits; 