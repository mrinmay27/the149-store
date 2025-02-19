import { create } from "zustand";
import { supabase, adminClient } from "./supabase";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

interface Category {
  id?: string;
  price: number;
  stock: number;
  user_id?: string;
}

interface Creator {
  id: string;
  name: string;
  designation: string;
}

interface PaymentData {
  cash: number;
  online: number;
  slipImage?: string;
}

interface CreatorData {
  name: string;
  designation: string;
}

interface Sale {
  id: string;
  user_id: string;
  created_by: string;
  timestamp: string;
  items: {
    category: {
      id: string;
      price: number;
      stock: number;
    };
    quantity: number;
  }[];
  total: number;
  payment: PaymentData;
  creator: CreatorData;
}

interface UserProfile {
  id: string;
  name: string;
  designation: string;
  phone: string;
  is_admin: boolean;
  is_approved: boolean;
  avatar_url?: string;
}

interface Balances {
  shopBalance: number;
  bankBalance: number;
}

interface Store {
  categories: Category[];
  sales: Sale[];
  initialized: boolean;
  userProfile: UserProfile | null;
  balances: Balances;
  setUserProfile: (profile: UserProfile | null) => void;
  addCategory: (price: number) => Promise<void>;
  updateStock: (index: number, stock: number) => Promise<void>;
  updatePrice: (index: number, newPrice: number) => Promise<void>;
  deleteCategory: (index: number) => Promise<void>;
  completeSale: (sale: Sale) => Promise<void>;
  initializeStore: () => Promise<(() => void) | void>;
  fetchUserProfile: () => Promise<UserProfile | null>;
  fetchBalances: () => Promise<void>;
  fetchAllData: () => Promise<void>;
  addExpense: (expense: { cash_amount: number; online_amount: number; description: string }) => Promise<void>;
  addDeposit: (deposit: { amount: number; description: string }) => Promise<void>;
  optimisticUpdateCategories: (categories: Category[]) => void;
  optimisticUpdateBalances: (balances: Balances) => void;
}

const processCreator = (creator: any): CreatorData => {
  return {
    name: creator?.name || 'Unknown',
    designation: creator?.designation || 'Unknown'
  };
};

export const useStore = create<Store>((set, get) => ({
  categories: [],
  sales: [],
  initialized: false,
  userProfile: null,
  balances: {
    shopBalance: 0,
    bankBalance: 0
  },

  setUserProfile: (profile) => {
    set({ userProfile: profile });
    
    // Prefetch data when profile is set
    if (profile) {
      // Start loading immediately
      const cachedCategories = localStorage.getItem('cached_categories');
      const cachedBalances = localStorage.getItem('cached_balances');
      
      if (cachedCategories) {
        try {
          const parsed = JSON.parse(cachedCategories);
          set({ categories: parsed });
        } catch (e) {
          console.error('Error parsing cached categories:', e);
        }
      }
      
      if (cachedBalances) {
        try {
          const parsed = JSON.parse(cachedBalances);
          set({ balances: parsed });
        } catch (e) {
          console.error('Error parsing cached balances:', e);
        }
      }

      // Fetch fresh data with proper error handling
      let channel: RealtimeChannel | null = null;
      
      Promise.all([
        get().fetchAllData().catch(error => {
          console.error('Error fetching data:', error);
          return null;
        }),
        get().fetchUserProfile().catch(error => {
          console.error('Error fetching user profile:', error);
          return null;
        })
      ]).then(() => {
        // Set up real-time subscriptions only after successful data fetch
        channel = supabase.channel('store-changes')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public',
            table: 'sales'
          }, () => get().fetchAllData().catch(console.error))
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public',
            table: 'categories'
          }, () => get().fetchAllData().catch(console.error))
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public',
            table: 'balances'
          }, () => get().fetchAllData().catch(console.error))
          .subscribe();
      }).catch(console.error);

      return () => {
        if (channel) {
          channel.unsubscribe();
        }
      };
    }
  },

  fetchUserProfile: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ userProfile: null, initialized: true });
        return null;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, designation, phone, is_admin, is_approved, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        set({ userProfile: null, initialized: true });
        await supabase.auth.signOut();
        return null;
      }

      if (!profile) {
        console.error('No profile found for user:', user.id);
        set({ userProfile: null, initialized: true });
        await supabase.auth.signOut();
        return null;
      }

      // Special handling for admin user
      if (profile.phone === '9999999999') {
        profile.designation = 'Owner';
      }

      const userProfile: UserProfile = {
        id: String(profile.id),
        name: String(profile.name),
        designation: String(profile.designation),
        phone: String(profile.phone),
        is_admin: Boolean(profile.is_admin),
        is_approved: Boolean(profile.is_approved),
        avatar_url: profile.avatar_url ? String(profile.avatar_url) : undefined
      };

      set({ userProfile, initialized: true });
      return userProfile;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      set({ userProfile: null, initialized: true });
      await supabase.auth.signOut();
      return null;
    }
  },

  fetchAllData: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found in fetchAllData');
        return;
      }

      console.log('Fetching all data for user:', user.id);

      // Use Promise.all for parallel fetching
      const [categoriesResponse, salesResponse, balancesResponse] = await Promise.all([
        adminClient
          .from('categories')
          .select('id, price, stock')
          .order('price', { ascending: true }),
        
        adminClient
          .from('sales')
          .select('*, creator:profiles!sales_created_by_fkey(name, designation)')
          .order('timestamp', { ascending: false })
          .limit(50),

        adminClient
          .from('balances')
          .select('shop_balance, bank_balance')
          .single()
      ]);

      if (categoriesResponse.error) {
        console.error('Error fetching categories:', categoriesResponse.error);
        throw categoriesResponse.error;
      }

      if (salesResponse.error) {
        console.error('Error fetching sales:', salesResponse.error);
        throw salesResponse.error;
      }

      if (balancesResponse.error) {
        console.error('Error fetching balances:', balancesResponse.error);
        throw balancesResponse.error;
      }

      // Process responses in parallel
      const [categories, sales, balances] = await Promise.all([
        Promise.resolve(categoriesResponse.data?.map(cat => ({
          id: String(cat.id),
          price: Number(cat.price),
          stock: Number(cat.stock)
        })) || []),

        Promise.resolve(salesResponse.data?.map(sale => ({
          id: String(sale.id || ''),
          user_id: String(sale.user_id || ''),
          created_by: String(sale.created_by || ''),
          timestamp: String(sale.timestamp || new Date().toISOString()),
          items: Array.isArray(sale.items) ? sale.items.map(item => ({
            category: {
              id: String(item.category.id),
              price: Number(item.category.price),
              stock: Number(item.category.stock)
            },
            quantity: Number(item.quantity)
          })) : [],
          total: Number(sale.total || 0),
          payment: {
            cash: Number((sale.payment as PaymentData)?.cash || 0),
            online: Number((sale.payment as PaymentData)?.online || 0),
            slipImage: String((sale.payment as PaymentData)?.slipImage || '')
          },
          creator: processCreator(sale.creator)
        })) || []),

        Promise.resolve({
          shopBalance: Number(balancesResponse.data?.shop_balance || 0),
          bankBalance: Number(balancesResponse.data?.bank_balance || 0)
        })
      ]);

      console.log('Fetched categories:', categories);
      console.log('Fetched sales:', sales);
      console.log('Fetched balances:', balances);

      // Cache the data
      localStorage.setItem('cached_categories', JSON.stringify(categories));
      localStorage.setItem('cached_balances', JSON.stringify(balances));

      // Update state
      set({
        categories,
        sales,
        balances,
        initialized: true
      });

    } catch (error) {
      console.error('Error in fetchAllData:', error);
      // Don't set initialized to true on error to allow retry
      throw error;
    }
  },

  initializeStore: async () => {
    try {
      set({ initialized: false });
      
      // First check if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ initialized: true });
        return;
      }

      console.log('Initializing store for session:', session.user.id);

      // Fetch all data immediately
      await get().fetchAllData();

      // Set up real-time subscriptions for live updates
      const channel = supabase.channel('store-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public',
          table: 'sales'
        }, () => get().fetchAllData())
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public',
          table: 'categories'
        }, () => get().fetchAllData())
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public',
          table: 'balances'
        }, () => get().fetchAllData())
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    } catch (error) {
      console.error('Error in initializeStore:', error);
      set({ initialized: true });
      throw error;
    }
  },

  fetchBalances: async () => {
    await get().fetchAllData();
  },

  optimisticUpdateCategories: (categories: Category[]) => {
    set({ categories });
  },

  optimisticUpdateBalances: (balances: Balances) => {
    set({ balances });
  },

  addCategory: async (price) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Optimistically update the UI
      const newCategory = { 
        id: crypto.randomUUID(),
        price, 
        stock: 0, 
        user_id: user.id 
      };
      
      const updatedCategories = [...get().categories, newCategory].sort((a, b) => a.price - b.price);
      get().optimisticUpdateCategories(updatedCategories);

      // Make the API call
      const { data, error } = await adminClient
        .from('categories')
        .insert([{ 
          price, 
          stock: 0, 
          user_id: user.id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        // Revert optimistic update on error
        get().optimisticUpdateCategories(get().categories.filter(c => c.id !== newCategory.id));
        throw error;
      }

      // Update with actual data from server
      await get().fetchAllData();
    } catch (error) {
      console.error('Error in addCategory:', error);
      throw error;
    }
  },

  updateStock: async (index: number, stock: number) => {
    const { categories } = get();
    const category = categories[index];
    if (!category?.id) return;

    // Optimistically update the UI
    const updatedCategories = [...categories];
    updatedCategories[index] = { ...category, stock: Math.max(0, stock) };
    get().optimisticUpdateCategories(updatedCategories);

    try {
      const { error } = await supabase
        .from('categories')
        .update({ stock: Math.max(0, stock) })
        .eq('id', category.id);

      if (error) {
        // Revert optimistic update on error
        get().optimisticUpdateCategories(categories);
        throw error;
      }
    } catch (error) {
      // Revert optimistic update on error
      get().optimisticUpdateCategories(categories);
      throw error;
    }
  },

  updatePrice: async (index: number, newPrice: number) => {
    const { categories } = get();
    const category = categories[index];
    if (!category?.id) return;

    // Optimistically update the UI
    const updatedCategories = [...categories];
    updatedCategories[index] = { ...category, price: newPrice };
    get().optimisticUpdateCategories(updatedCategories);

    try {
      const { error } = await supabase
        .from('categories')
        .update({ price: newPrice })
        .eq('id', category.id);

      if (error) {
        // Revert optimistic update on error
        get().optimisticUpdateCategories(categories);
        throw error;
      }
    } catch (error) {
      // Revert optimistic update on error
      get().optimisticUpdateCategories(categories);
      throw error;
    }
  },

  deleteCategory: async (index: number) => {
    const { categories } = get();
    const category = categories[index];
    if (!category?.id) return;

    // Optimistically update the UI
    const updatedCategories = categories.filter((_, i) => i !== index);
    get().optimisticUpdateCategories(updatedCategories);

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) {
        // Revert optimistic update on error
        get().optimisticUpdateCategories(categories);
        throw error;
      }
    } catch (error) {
      // Revert optimistic update on error
      get().optimisticUpdateCategories(categories);
      throw error;
    }
  },

  addExpense: async (expense) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Start a transaction using a stored procedure
      const { data, error } = await supabase.rpc('handle_expense', {
        p_user_id: user.id,
        p_purpose: expense.description,
        p_cash_amount: expense.cash_amount,
        p_online_amount: expense.online_amount
      });

      if (error) throw error;

      // Fetch updated data
      await get().fetchAllData();
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  },

  addDeposit: async (deposit) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Start a transaction using a stored procedure
      const { error } = await supabase.rpc('handle_deposit', {
        p_user_id: user.id,
        p_amount: deposit.amount,
        p_description: deposit.description
      });

      if (error) throw error;

      // Fetch updated data
      await get().fetchAllData();
    } catch (error) {
      console.error('Error adding deposit:', error);
      throw error;
    }
  },

  completeSale: async (sale: Sale) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Use a stored procedure for atomic transaction
      const { error: saleError } = await adminClient.rpc('handle_sale', {
        p_user_id: user.id,
        p_items: sale.items,
        p_total: sale.total,
        p_payment: sale.payment,
        p_timestamp: new Date().toISOString()
      });

      if (saleError) throw saleError;

      // Fetch updated data after transaction completes
      await get().fetchAllData();
    } catch (error) {
      console.error('Error completing sale:', error);
      throw error;
    }
  },
}));
