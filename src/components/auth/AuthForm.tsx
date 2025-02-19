import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { supabase } from '@/lib/supabase';
import { signUpWithPhone, signInWithPhone } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuthFormProps {
  onAuthSuccess: () => void;
}

const AuthForm = ({ onAuthSuccess }: AuthFormProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [designation, setDesignation] = useState('Store Manager');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState('Store Manager');

  // Force Store Manager designation for non-admin users
  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone === '9999999999') {
      setSelectedDesignation('Owner');
    }
  }, [phone]);

  const validatePhone = (number: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;  // Indian mobile number format
    return phoneRegex.test(number);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length <= 10) {
      setPhone(value);
      // Set designation to Owner if admin phone
      if (value === '9999999999') {
        setSelectedDesignation('Owner');
      }
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>, isConfirm = false) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length <= 6) {
      if (isConfirm) {
        setConfirmPin(value);
      } else {
        setPin(value);
      }
    }
  };

  const validatePin = (pinValue: string) => {
    if (!/^\d+$/.test(pinValue)) {
      return 'PIN must contain only numbers';
    }
    if (pinValue.length !== 6) {
      return 'PIN must be exactly 6 digits';
    }
    return null;
  };

  const isPinValid = (pinValue: string) => {
    return pinValue.length === 6 && /^\d+$/.test(pinValue);
  };

  const isFormValid = () => {
    const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '');
    if (isSignUp) {
      return (
        validatePhone(cleanPhone) &&
        isPinValid(pin) &&
        pin === confirmPin &&
        name.trim().length > 0
      );
    }
    return validatePhone(cleanPhone) && isPinValid(pin);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      
      if (!validatePhone(cleanPhone)) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      const pinValidationError = validatePin(pin);
      if (pinValidationError) {
        throw new Error(pinValidationError);
      }

      if (isSignUp) {
        // Handle Sign Up
        if (pin !== confirmPin) {
          setError('PINs do not match');
          return;
        }
        if (!name.trim()) {
          setError('Please enter your name');
          return;
        }

        try {
          const cleanedPhone = phone.replace(/\D/g, '');
          // Set designation based on phone number
          const designation = cleanedPhone === '9999999999' ? 'Owner' : selectedDesignation;

          const { data, error } = await signUpWithPhone(cleanedPhone, pin, name, designation);

          if (error) {
            throw new Error(error);
          }

          if (!data) {
            throw new Error('No data returned from sign up');
          }

          // Reset form fields after successful signup
          setPhone('');
          setPin('');
          setConfirmPin('');
          setName('');
          setSelectedDesignation(designation);

          // Set pending approval state for non-admin phone numbers
          if (cleanedPhone !== '9999999999') {
            setPendingApproval(true);
          } else {
            // If admin phone, proceed to dashboard
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for state to settle
            onAuthSuccess();
          }
        } catch (error: any) {
          console.error('Auth error:', error);
          setError(error.message);
        }
      } else {
        // Handle Sign In
        const { data, error } = await signInWithPhone(cleanPhone, pin);

        if (error) {
          throw new Error(error);
        }

        if (!data?.session || !data?.profile) {
          throw new Error('Sign in failed. Please try again.');
        }

        if (!data.profile.is_admin && !data.profile.is_approved) {
          setPendingApproval(true);
          return;
        }

        // Prefetch data immediately after successful authentication
        await Promise.all([
          useStore.getState().fetchAllData(),
          useStore.getState().fetchUserProfile()
        ]);

        // Reset form and trigger success immediately
        setPhone('');
        setPin('');
        setError(null);
        onAuthSuccess();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred. Please try again.');
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  if (pendingApproval) {
    return (
      <Card className="w-[350px] bg-card">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-foreground">
            Approval Pending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="text-foreground">
              Your account is pending approval from the administrator. Please check back later.
            </AlertDescription>
          </Alert>
          <Button
            type="button"
            variant="link"
            className="w-full mt-4"
            onClick={() => {
              setPendingApproval(false);
              setIsSignUp(false);
            }}
          >
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-[350px] bg-card">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-foreground">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {isSignUp && (
              <Input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-background text-foreground"
              />
            )}
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                +91
              </div>
              <Input
                type="tel"
                placeholder="Enter phone number"
                value={phone}
                onChange={handlePhoneChange}
                required
                className="w-full pl-12 bg-background text-foreground"
              />
            </div>
            {isSignUp && (
              <Select
                value={selectedDesignation}
                onValueChange={setSelectedDesignation}
                disabled={phone === '9999999999'}
              >
                <SelectTrigger className="w-full bg-background text-foreground">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Store Manager">Store Manager</SelectItem>
                  <SelectItem value="Owner" disabled={phone !== '9999999999'}>
                    Owner
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input
              type="password"
              placeholder="Enter 6-digit PIN"
              value={pin}
              onChange={(e) => handlePinChange(e)}
              required
              maxLength={6}
              className="w-full bg-background text-foreground"
            />
            {isSignUp && (
              <Input
                type="password"
                placeholder="Confirm 6-digit PIN"
                value={confirmPin}
                onChange={(e) => handlePinChange(e, true)}
                required
                maxLength={6}
                className="w-full bg-background text-foreground"
              />
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!isFormValid() || loading}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              isSignUp ? 'Sign Up' : 'Sign In'
            )}
          </Button>

          <Button
            type="button"
            variant="link"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AuthForm; 