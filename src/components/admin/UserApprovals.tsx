import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '../ui/alert';
import { Check, Crown, X } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useNavigate } from 'react-router-dom';
import PageNavigation from '../ui/PageNavigation';
import DashboardHeader from '../DashboardHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { toast } from "../ui/use-toast";

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  designation: string;
  pin: string;
  is_approved: boolean;
  is_admin: boolean;
  created_at: string;
}

interface ApproveUserResponse {
  success: boolean;
  error?: string;
}

const UserApprovals = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingUsers, setApprovingUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return { canView: false, isAdmin: false };
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin, designation')
        .eq('id', session.user.id)
        .single();

      if (error) {
        navigate('/');
        return { canView: false, isAdmin: false };
      }

      const canView = profile?.designation === 'Owner';
      const isAdmin = profile?.is_admin || false;

      if (!canView) {
        navigate('/');
      }

      return { canView, isAdmin };
    } catch (err) {
      navigate('/');
      return { canView: false, isAdmin: false };
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      if (!usersData) {
        setUsers([]);
        return;
      }

      const processedUsers: UserProfile[] = usersData.map(user => ({
        id: String(user.id),
        name: String(user.name),
        phone: String(user.phone),
        designation: String(user.designation),
        pin: String(user.pin),
        is_approved: Boolean(user.is_approved),
        created_at: String(user.created_at),
        is_admin: Boolean(user.is_admin)
      }));

      setUsers(processedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleApproval = async (userId: string, approve: boolean) => {
    try {
      setApprovingUsers(prev => new Set(prev).add(userId));
      setError(null);
      
      const { canView, isAdmin } = await checkAdminStatus();
      if (!canView) {
        throw new Error('You must be an admin to perform this action');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authenticated session');
      }

      console.log('Updating profile:', { userId, approve });

      const { data, error: rpcError } = await supabase
        .rpc('approve_user_profile', {
          target_user_id: userId,
          should_approve: approve
        });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw rpcError;
      }

      const result = data as ApproveUserResponse;
      if (!result.success) {
        throw new Error(result.error || 'Failed to update approval status');
      }

      console.log('Profile updated successfully');

      setUsers(currentUsers => 
        currentUsers.map(user => 
          user.id === userId 
            ? { ...user, is_approved: approve }
            : user
        )
      );

      const { data: updatedUsers, error: fetchError } = await supabase
        .from('profiles')
        .select('id, name, phone, designation, created_at, is_approved, is_admin, pin')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Fetch error:', fetchError);
      } else if (updatedUsers) {
        const processedUsers: UserProfile[] = updatedUsers.map(user => ({
          id: String(user.id),
          name: String(user.name),
          phone: String(user.phone),
          designation: String(user.designation),
          pin: String(user.pin),
          is_approved: Boolean(user.is_approved),
          created_at: String(user.created_at),
          is_admin: Boolean(user.is_admin)
        }));
        setUsers(processedUsers);
      }

    } catch (err: any) {
      console.error('Approval error:', err);
      setError(err.message);
      fetchUsers();
    } finally {
      setApprovingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const refreshUsers = async () => {
    try {
      setLoading(true);
      const { canView, isAdmin: adminStatus } = await checkAdminStatus();
      if (!canView) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authenticated session');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const processedUsers: UserProfile[] = data.map(user => ({
          id: String(user.id),
          name: String(user.name),
          phone: String(user.phone),
          designation: String(user.designation),
          pin: String(user.pin),
          is_approved: Boolean(user.is_approved),
          created_at: String(user.created_at),
          is_admin: Boolean(user.is_admin)
        }));
        setUsers(processedUsers);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { canView, isAdmin: adminStatus } = await checkAdminStatus();
      if (!canView) return;
      setIsAdmin(Boolean(adminStatus));
      fetchUsers();
    };
    
    init();
    const intervalId = setInterval(fetchUsers, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Only show loading on initial load
  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      <main className="flex-1 container mx-auto px-3 md:px-6 py-4 md:py-6 pb-24 flex flex-col">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl text-foreground">User Management</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchUsers}
              disabled={loading}
            >
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="relative flex flex-col p-4 border rounded-lg bg-card shadow-sm"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-lg text-foreground">{user.name}</p>
                        <div className="text-sm text-muted-foreground -mt-1">
                          <span>{user.phone}</span>
                          <span className="mx-2">•</span>
                          <span>{user.designation}</span>
                        </div>
                      </div>
                      {user.is_admin && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-muted-foreground">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                      {!user.is_admin && user.is_approved && (
                        <Badge 
                          variant="default"
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1"
                        >
                          Approved
                        </Badge>
                      )}
                    </div>
                  </div>

                  {!user.is_admin && (
                    <>
                      {!user.is_approved ? (
                        <div className="flex justify-center mt-4">
                          <Button
                            size="sm"
                            onClick={() => handleApproval(user.id, true)}
                            className="bg-green-500 hover:bg-green-600 w-1/2"
                            disabled={approvingUsers.has(user.id)}
                          >
                            {approvingUsers.has(user.id) ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                              <Check className="w-4 h-4 mr-2" />
                            )}
                            Approve
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowConfirmDialog(true);
                          }}
                          disabled={approvingUsers.has(user.id)}
                          className="absolute top-2 right-2 h-6 w-6 text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ))}

              {users.length === 0 && (
                <p className="text-center text-muted-foreground">
                  No users found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Revoke User Approval</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to revoke approval for {selectedUser?.name}? 
                This will prevent them from accessing the system until re-approved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-4">
              <AlertDialogCancel className="mt-2">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 mt-2"
                onClick={() => {
                  if (selectedUser) {
                    handleApproval(selectedUser.id, false);
                  }
                  setShowConfirmDialog(false);
                }}
              >
                Revoke Approval
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PageNavigation />
      </main>
    </div>
  );
};

export default UserApprovals; 