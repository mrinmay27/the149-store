import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Camera, Upload } from "lucide-react";
import DashboardHeader from "./DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import PageNavigation from './ui/PageNavigation';
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import { optimizeImage } from "@/lib/imageOptimizer";
import { useNavigate } from "react-router-dom";
import { toast } from "./ui/use-toast";

interface Expense {
  id: string;
  purpose: string;
  amount: number;
  cash_amount: number;
  online_amount: number;
  receipt_image?: string;
  timestamp: string;
  created_by: string;
  creator?: {
    id: string;
    name: string;
    designation: string;
  };
}

interface UserProfile {
  id: string;
  designation: string;
}

interface Creator {
  id: string;
  name: string;
  designation: string;
}

interface ExpenseData {
  id: string | null;
  purpose: string | null;
  amount: number | null;
  cash_amount: number | null;
  online_amount: number | null;
  receipt_image: string | null;
  timestamp: string | null;
  created_by: string | null;
  creator: Creator | null;
}

const EXPENSES_PER_PAGE = 20;

const Expenses = () => {
  const navigate = useNavigate();
  const { userProfile, balances, fetchBalances } = useStore();
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [optimizedReceiptImage, setOptimizedReceiptImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Define memoized fetch functions
  const fetchExpenses = React.useCallback(async (loadMore = false) => {
    try {
      const currentPage = loadMore ? page + 1 : 0;
      setIsLoadingMore(loadMore);

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*, creator:profiles!expenses_created_by_fkey(id, name, designation)')
        .order('timestamp', { ascending: false })
        .range(currentPage * EXPENSES_PER_PAGE, (currentPage + 1) * EXPENSES_PER_PAGE - 1);

      if (expensesError) throw expensesError;

      if (!expensesData) {
        setExpenses([]);
        return;
      }

      const processedExpenses: Expense[] = expensesData.map(expense => ({
        id: String(expense.id),
        purpose: String(expense.purpose),
        amount: Number(expense.amount),
        cash_amount: Number(expense.cash_amount),
        online_amount: Number(expense.online_amount),
        receipt_image: expense.receipt_image ? String(expense.receipt_image) : undefined,
        timestamp: String(expense.timestamp),
        created_by: String(expense.created_by),
        creator: expense.creator && typeof expense.creator === 'object' ? {
          id: String((expense.creator as any).id),
          name: String((expense.creator as any).name),
          designation: String((expense.creator as any).designation)
        } : undefined
      }));

      setExpenses(prev => loadMore ? [...prev, ...processedExpenses] : processedExpenses);
      setPage(currentPage);
      setHasMore(expensesData.length === EXPENSES_PER_PAGE);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw new Error('Failed to fetch expenses. Please try again.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [page]);

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
        await fetchExpenses();
        
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
  }, [navigate, fetchBalances, fetchExpenses]);

  useEffect(() => {
    // Cleanup function for camera stream
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const fileData = e.target?.result as string;
          // Set immediate preview
          setReceiptImage(fileData);
          
          // Optimize image in background
          try {
            const optimized = await optimizeImage(fileData);
            setOptimizedReceiptImage(optimized);
          } catch (error) {
            console.error('Error optimizing image:', error);
            setError('Failed to process image. Please try again.');
            setReceiptImage(null);
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

  const capturePhoto = async () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement("canvas");
        const video = videoRef.current;
        
        // Wait for video to be ready
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          // Set canvas size to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Flip horizontally if using front camera (mirror effect)
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            
            // Draw the video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Reset transform
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            // Get the initial image data and set preview
            const initialImageData = canvas.toDataURL("image/jpeg", 1.0);
            setReceiptImage(initialImageData);
            
            // Optimize the image in background
            try {
              const optimizedImageData = await optimizeImage(initialImageData);
              setOptimizedReceiptImage(optimizedImageData);
            } catch (error) {
              console.error('Error optimizing image:', error);
              setError('Failed to process image. Please try again.');
              setReceiptImage(null);
            }
            
            stopCamera();
          }
        } else {
          // If video is not ready, wait a bit and try again
          setTimeout(capturePhoto, 100);
        }
      } catch (error) {
        console.error("Error capturing photo:", error);
        setError("Failed to capture photo. Please try again.");
      }
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Could not access camera. Please check permissions.");
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
    if (!purpose || !amount || !userProfile) return;

    setIsLoading(true);
    setError(null);

    try {
      const parsedAmount = parseInt(amount);
      const parsedCashAmount = parseInt(cashAmount || "0");
      const parsedOnlineAmount = parseInt(onlineAmount || "0");

      if (parsedCashAmount + parsedOnlineAmount !== parsedAmount) {
        throw new Error("Cash amount + Online amount must equal total amount");
      }

      let receiptImageUrl = null;
      if (optimizedReceiptImage) {
        try {
          // Generate unique filename
          const fileName = `expense-${userProfile.id}-${Date.now()}.jpg`;
          const filePath = `expenses/${fileName}`;
          
          // Convert base64 to blob
          const base64Data = optimizedReceiptImage.split(',')[1];
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

          receiptImageUrl = publicUrl;
        } catch (error) {
          console.error('Error uploading image:', error);
          setError('Failed to upload image. Please try again.');
          return;
        }
      }

      const { error: expenseError } = await supabase.from("expenses").insert({
        purpose,
        amount: parsedAmount,
        cash_amount: parsedCashAmount,
        online_amount: parsedOnlineAmount,
        receipt_image: receiptImageUrl,
        created_by: userProfile.id,
      });

      if (expenseError) throw expenseError;

      // Reset form
      setPurpose("");
      setAmount("");
      setCashAmount("");
      setOnlineAmount("");
      setReceiptImage(null);
      setOptimizedReceiptImage(null);
      
      // Refresh only the first page of expenses
      await fetchExpenses();
      await fetchBalances();
    } catch (error: any) {
      console.error("Error submitting expense:", error);
      setError(error.message || "Failed to submit expense");
    } finally {
      setIsLoading(false);
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

  const isOwner = userProfile?.designation === 'Owner';

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
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
      <div className="min-h-screen bg-gray-100 flex flex-col">
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      <main className="flex-1 container mx-auto px-3 md:px-6 py-4 md:py-6 pb-24 flex flex-col">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-foreground">Expenses</h2>
        </div>

        <div className="flex-1 bg-card rounded-lg shadow-sm overflow-hidden">
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="w-full max-w-[400px] grid grid-cols-2 bg-muted">
              <TabsTrigger value="create" className="data-[state=active]:bg-background">Create Expense</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-background">Expense History</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="p-4 md:p-6">
              <Card className="bg-card">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-foreground">Purpose</Label>
                      <Textarea
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="Enter expense purpose"
                        className="min-h-[100px] bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-foreground">Total Amount</Label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter total amount"
                        className="bg-background"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-foreground">From Shop</Label>
                          <span className="text-sm text-muted-foreground">Balance: ₹{balances.shopBalance}</span>
                        </div>
                        <Input
                          type="number"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          placeholder="Enter amount from shop"
                          className="bg-background"
                        />
                      </div>

                      {isOwner && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-foreground">From Bank A/c</Label>
                            <span className="text-sm text-muted-foreground">Balance: ₹{balances.bankBalance}</span>
                          </div>
                          <Input
                            type="number"
                            value={onlineAmount}
                            onChange={(e) => setOnlineAmount(e.target.value)}
                            placeholder="Enter amount from bank"
                            className="bg-background"
                          />
                        </div>
                      )}
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label className="text-foreground">Receipt</Label>
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Receipt
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
                        {receiptImage && !showCamera && (
                          <div className="relative w-full bg-gray-50 rounded-lg border overflow-hidden">
                            <div className="relative w-full" style={{ paddingTop: "75%" }}>
                              <img
                                src={receiptImage}
                                alt="Receipt"
                                className="absolute inset-0 w-full h-full object-contain p-2"
                              />
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => setReceiptImage(null)}
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
                      disabled={isLoading || !purpose || !amount || 
                        (parseInt(cashAmount || '0') + parseInt(onlineAmount || '0')) !== parseInt(amount) ||
                        (Number(cashAmount) > balances.shopBalance) ||
                        (isOwner && Number(onlineAmount) > balances.bankBalance)}
                    >
                      {isLoading ? "Creating..." : "Create Expense"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="p-4 md:p-6">
              <Card className="bg-card">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex flex-col justify-between p-3 hover:bg-muted rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 border border-border mb-3"
                        onClick={() => {
                          if (expense.receipt_image) {
                            setSelectedImage(expense.receipt_image);
                            setShowImageDialog(true);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-red-600">₹{expense.amount}</span>
                            {expense.receipt_image && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                                Has Receipt
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(expense.timestamp)} {formatTime(expense.timestamp)}
                          </div>
                        </div>
                        <div className="text-sm mt-1.5 space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Purpose:</span>
                            <span className="font-medium">{expense.purpose}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">From Shop:</span>
                              <span className="font-medium">₹{expense.cash_amount}</span>
                            </div>
                            {isOwner && expense.online_amount > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">From Bank:</span>
                                <span className="font-medium">₹{expense.online_amount}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Created by:</span>
                              <span className="font-medium">{expense.creator?.name}</span>
                              <span className="text-xs text-muted-foreground">({expense.creator?.designation})</span>
                            </div>
                            {expense.receipt_image && (
                              <span className="text-xs text-blue-500 hover:underline">
                                View Receipt
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
              <DialogTitle className="p-4">Receipt</DialogTitle>
            </DialogHeader>
            {selectedImage && (
              <div className="relative w-full h-full flex items-center justify-center bg-gray-50">
                <img
                  src={selectedImage}
                  alt="Receipt Full View"
                  className="max-w-full max-h-[85vh] object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <PageNavigation />

        {/* Add infinite scroll */}
        {hasMore && !isLoadingMore && (
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => fetchExpenses(true)}
          >
            Load More
          </Button>
        )}
        
        {isLoadingMore && (
          <div className="w-full text-center mt-4">
            Loading more expenses...
          </div>
        )}
      </main>
    </div>
  );
};

export default Expenses; 