import React, { useState, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "./ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Label } from "./ui/label";
import { Camera, Upload, QrCode } from "lucide-react";
import DashboardHeader from "./DashboardHeader";
import { useNavigate } from "react-router-dom";
import PageNavigation from './ui/PageNavigation';
import { optimizeImage } from "@/lib/imageOptimizer";
import { supabase } from "@/lib/supabase";

interface Category {
  id: string;
  price: number;
  stock: number;
}

interface SaleItem {
  category: Category;
  quantity: number;
}

interface Sale {
  id: string;
  user_id: string;
  created_by: string;
  timestamp: string;
  items: SaleItem[];
  total: number;
  payment: {
    cash: number;
    online: number;
    slipImage?: string;
  };
  creator: {
    name: string;
    designation: string;
  };
}

const SalesMode = () => {
  const { categories, completeSale } = useStore();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [localQuantities, setLocalQuantities] = useState<Record<number, number>>({});
  const [updatingPrice, setUpdatingPrice] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [paymentSlipImage, setPaymentSlipImage] = useState<string | null>(null);
  const [optimizedSlipImage, setOptimizedSlipImage] = useState<string | null>(null);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const navigate = useNavigate();
  const [showQRDialog, setShowQRDialog] = useState(false);

  // Initialize local quantities
  useEffect(() => {
    setLocalQuantities(quantities);
  }, [quantities]);

  const updateQuantity = (price: number, quantity: number) => {
    if (updatingPrice === price) return;
    
    try {
      const maxStock = categories.find((c) => c.price === price)?.stock || 0;
      const newQuantity = Math.max(0, Math.min(quantity, maxStock));
      
      // Update both states simultaneously to prevent desync
      setLocalQuantities(prev => {
        const updated = { ...prev, [price]: newQuantity };
        // Schedule main state update
        Promise.resolve().then(() => {
          setQuantities(updated);
          setUpdatingPrice(null);
        });
        return updated;
      });
    } catch (error) {
      console.error('Error updating quantity:', error);
      // Revert both states on error
      setLocalQuantities(prev => {
        const original = { ...prev, [price]: quantities[price] || 0 };
        setQuantities(original);
        return original;
      });
    }
  };

  // Keep states in sync with categories
  useEffect(() => {
    if (categories.length > 0) {
      setQuantities(prev => {
        const updated = { ...prev };
        // Remove quantities for non-existent categories
        Object.keys(updated).forEach(price => {
          if (!categories.find(c => c.price === Number(price))) {
            delete updated[Number(price)];
          }
        });
        return updated;
      });
    }
  }, [categories]);

  useEffect(() => {
    const newTotal = categories.reduce((sum, category) => {
      return sum + (localQuantities[category.price] || 0) * category.price;
    }, 0);
    setTotal(newTotal);
  }, [categories, localQuantities]);

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
            alert('Failed to process image. Please try again.');
            setPaymentSlipImage(null);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error reading file:', error);
        alert('Failed to read image file. Please try again.');
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
          facingMode: 'environment',
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
        
        // Wait for video to be ready
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
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
              alert('Failed to process image. Please try again.');
              setPaymentSlipImage(null);
            }
            
            stopCamera();
          }
        } else {
          // If video is not ready, wait a bit and try again
          setTimeout(capturePhoto, 100);
        }
      } catch (error) {
        console.error("Error capturing photo:", error);
        alert("Failed to capture photo. Please try again.");
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

  const handleCompleteSale = async () => {
    if (isProcessingSale) return;

    try {
      // Validate payment amount matches total
      const totalPayment = Number(cashAmount || 0) + Number(onlineAmount || 0);
      if (totalPayment !== total) {
        throw new Error('Payment amount must match the total amount');
      }

      setIsProcessingSale(true);

      let slipImageUrl = null;
      if (optimizedSlipImage) {
        try {
          // Generate unique filename
          const fileName = `sale-${Date.now()}.jpg`;
          const filePath = `sales/${fileName}`;
          
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
          alert('Failed to upload image. Please try again.');
          return;
        }
      }

      const saleItems = categories
        .filter(category => localQuantities[category.price] > 0)
        .map(category => ({
          category: {
            id: category.id || '',
            price: category.price,
            stock: category.stock
          },
          quantity: localQuantities[category.price]
        }));

      // Optimistically update local state
      const updatedCategories = categories.map(category => {
        const saleQuantity = localQuantities[category.price] || 0;
        return {
          ...category,
          stock: category.stock - saleQuantity
        };
      });

      // Update UI immediately
      useStore.getState().optimisticUpdateCategories(updatedCategories);

      const sale: Sale = {
        id: '', // Will be set by the server
        user_id: '', // Will be set by the server
        created_by: '', // Will be set by the server
        timestamp: new Date().toISOString(),
        items: saleItems.map(item => ({
          category: {
            id: item.category.id,
            price: item.category.price,
            stock: item.category.stock
          },
          quantity: item.quantity
        })),
        total,
        payment: {
          cash: Number(cashAmount || 0),
          online: Number(onlineAmount || 0),
          slipImage: slipImageUrl
        },
        creator: {
          name: '', // Will be set by the server
          designation: '' // Will be set by the server
        }
      };

      await completeSale(sale);
      
      // Reset all state after successful sale
      setQuantities({});
      setLocalQuantities({});
      setTotal(0);
      setShowPaymentDialog(false);
      setCashAmount("");
      setOnlineAmount("");
      setPaymentSlipImage(null);
      setOptimizedSlipImage(null);
    } catch (error) {
      console.error('Error completing sale:', error);
      alert(error instanceof Error ? error.message : 'Error completing sale');
      
      // Revert optimistic update on error
      useStore.getState().optimisticUpdateCategories(categories);
    } finally {
      setIsProcessingSale(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      <main className="flex-1 container mx-auto px-3 md:px-6 py-4 md:py-6 pb-24 flex flex-col">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-foreground">Sales Mode</h2>
        </div>

        <div className="flex-1 bg-card rounded-lg shadow-sm overflow-hidden">
          <div className="w-full min-h-[600px] bg-muted p-3 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {categories.map((category) => (
                      <div
                        key={category.price}
                        className="flex items-center justify-between gap-4 w-full"
                      >
                        <div>
                          <h3 className="text-lg font-semibold whitespace-nowrap">
                            ₹{category.price}'s Item
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {category.stock} in stock
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuantity(
                                category.price,
                                (localQuantities[category.price] || 0) - 1,
                              )
                            }
                            disabled={!category.stock || updatingPrice === category.price}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            value={localQuantities[category.price] || 0}
                            onChange={(e) =>
                              updateQuantity(
                                category.price,
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="w-16 text-center"
                            min="0"
                            max={category.stock}
                            disabled={updatingPrice === category.price}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuantity(
                                category.price,
                                (localQuantities[category.price] || 0) + 1,
                              )
                            }
                            disabled={localQuantities[category.price] >= category.stock || updatingPrice === category.price}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="h-fit bg-card">
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold mb-6">Order Summary</h3>
                  {categories.map(
                    (category) =>
                      localQuantities[category.price] > 0 && (
                        <div
                          key={category.price}
                          className="flex justify-between"
                        >
                          <span className="whitespace-nowrap">
                            ₹{category.price}'s Item x {localQuantities[category.price]}
                          </span>
                          <span>
                            ₹{category.price * localQuantities[category.price]}
                          </span>
                        </div>
                      ),
                  )}
                  <div className="border-t mt-4 pt-4">
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total</span>
                      <span>₹{total}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-6"
                    size="lg"
                    variant="default"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={total === 0}
                  >
                    Complete Sale
                  </Button>
                </CardContent>
              </Card>

              <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Order</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {categories.map(
                      (category) =>
                        localQuantities[category.price] > 0 && (
                          <div key={category.price} className="flex justify-between">
                            <span className="whitespace-nowrap">
                              ₹{category.price}'s Item x {localQuantities[category.price]}
                            </span>
                            <span>
                              ₹{category.price * localQuantities[category.price]}
                            </span>
                          </div>
                        ),
                    )}
                    <div className="border-t pt-4">
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>₹{total}</span>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirmDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => {
                        setShowConfirmDialog(false);
                        setShowPaymentDialog(true);
                      }}
                    >
                      Proceed to Payment
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent className="max-w-md z-50">
                  <DialogHeader>
                    <DialogTitle>Payment Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Cash Amount</Label>
                      <Input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="Enter cash amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Online Payment</Label>
                      <Input
                        type="number"
                        value={onlineAmount}
                        onChange={(e) => setOnlineAmount(e.target.value)}
                        placeholder="Enter online payment amount"
                      />
                    </div>

                    {Number(onlineAmount) > 0 && (
                      <div className="space-y-2">
                        <Label>Payment Slip</Label>
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between gap-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-10"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Slip
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowQRDialog(true)}
                                className="h-10 w-10 p-0"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={startCamera}
                                className="h-10"
                              >
                                <Camera className="h-4 w-4 mr-2" />
                                Take Photo
                              </Button>
                            </div>
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
                            <div className="relative w-full bg-gray-50 rounded-lg border overflow-hidden">
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
                    )}

                    <div className="flex justify-between font-bold">
                      <span>Total Amount</span>
                      <span>₹{total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Paid Amount</span>
                      <span>
                        ₹{Number(cashAmount || 0) + Number(onlineAmount || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Due Amount</span>
                      <span
                        className={`${total - (Number(cashAmount || 0) + Number(onlineAmount || 0)) > 0 ? "text-red-500" : "text-green-500"}`}
                      >
                        ₹
                        {total -
                          (Number(cashAmount || 0) + Number(onlineAmount || 0))}
                      </span>
                    </div>
                  </div>
                  <DialogFooter className="gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPaymentDialog(false);
                        setCashAmount("");
                        setOnlineAmount("");
                        setPaymentSlipImage(null);
                        setOptimizedSlipImage(null);
                        stopCamera();
                      }}
                    >
                      Cancel
                    </Button>
                    {total <= Number(cashAmount || 0) + Number(onlineAmount || 0) && (
                      <Button
                        onClick={handleCompleteSale}
                        disabled={Number(onlineAmount) > 0 && !paymentSlipImage}
                      >
                        Complete Sale
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <PageNavigation />
      </main>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className="fixed left-[50%] top-[50%] z-[50] grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
          >
            <DialogHeader>
              <DialogTitle>Scan QR Code</DialogTitle>
            </DialogHeader>
            <div className="relative w-full bg-white rounded-lg overflow-hidden">
              <div className="relative w-full" style={{ paddingTop: "100%" }}>
                <img
                  src="/qr-code.png"
                  alt="Payment QR Code"
                  className="absolute inset-0 w-full h-full object-contain p-4"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => setShowQRDialog(false)} 
                className="w-[90%] mx-auto text-lg h-[110%]"
                variant="default"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
};

export default SalesMode;
