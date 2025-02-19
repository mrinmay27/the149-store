-- Drop existing objects
drop table if exists notifications cascade;
drop table if exists sales cascade;
drop table if exists categories cascade;
drop table if exists expenses cascade;
drop table if exists deposits cascade;
drop table if exists balances cascade;
drop table if exists profiles cascade;

-- Create profiles table
create table profiles (
    id uuid primary key references auth.users on delete cascade,
    name text not null,
    phone varchar not null unique,
    pin varchar not null,
    designation varchar not null,
    is_admin boolean default false,
    is_approved boolean default false,
    avatar_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

create trigger update_profiles_updated_at
    before update on profiles
    for each row
    execute function update_updated_at_column();

-- Create categories table
create table categories (
    id uuid primary key default uuid_generate_v4(),
    price integer not null,
    stock integer not null default 0,
    user_id uuid references auth.users on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create sales table
create table sales (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade not null,
    created_by uuid references profiles(id) on delete cascade not null,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
    items jsonb not null,
    total integer not null,
    payment jsonb not null
);

-- Create expenses table
create table expenses (
    id uuid primary key default uuid_generate_v4(),
    created_by uuid references profiles(id) on delete cascade not null,
    purpose text not null,
    amount integer not null,
    cash_amount integer not null,
    online_amount integer not null,
    receipt_image text,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create deposits table
create table deposits (
    id uuid primary key default uuid_generate_v4(),
    deposited_by uuid references profiles(id) on delete cascade not null,
    received_by uuid references profiles(id) on delete cascade not null,
    amount integer not null,
    description text,
    slip_image text,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create balances table
create table balances (
    id uuid primary key default uuid_generate_v4(),
    shop_balance integer not null default 0,
    bank_balance integer not null default 0,
    last_updated timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create notifications table
create table notifications (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade not null,
    title text not null,
    description text not null,
    type text not null check (type in ('sale', 'expense', 'deposit', 'approval')),
    is_read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    metadata jsonb
);

-- Insert initial balance if not exists
insert into balances (shop_balance, bank_balance)
select 0, 0
where not exists (select 1 from balances);

-- Create notification functions
create or replace function notify_sale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    creator_name text;
begin
    -- Get creator name
    select name into creator_name from profiles where id = new.created_by;
    
    -- Notify all users except the creator
    insert into notifications (
        user_id,
        title,
        description,
        type,
        metadata
    )
    select 
        id,
        'New Sale',
        format('New sale of ₹%s by %s', new.total, coalesce(creator_name, 'Unknown')),
        'sale',
        jsonb_build_object(
            'sale_id', new.id,
            'amount', new.total,
            'creator_id', new.created_by,
            'creator_name', creator_name
        )
    from auth.users
    where id != new.created_by
    and id in (select id from profiles where is_approved = true);
    
    return new;
end;
$$;

create or replace function notify_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    creator_name text;
    creator_designation text;
begin
    -- Get creator info
    select name, designation into creator_name, creator_designation 
    from profiles where id = new.created_by;
    
    -- If creator is Store Manager, notify everyone except creator
    if creator_designation = 'Store Manager' then
        insert into notifications (
            user_id,
            title,
            description,
            type,
            metadata
        )
        select 
            id,
            'New Expense',
            format('New expense of ₹%s for %s by %s', new.amount, new.purpose, coalesce(creator_name, 'Unknown')),
            'expense',
            jsonb_build_object(
                'expense_id', new.id,
                'amount', new.amount,
                'purpose', new.purpose,
                'creator_id', new.created_by,
                'creator_name', creator_name
            )
        from auth.users
        where id != new.created_by
        and id in (select id from profiles where is_approved = true);
    -- If creator is Owner, notify only other owners
    else
        insert into notifications (
            user_id,
            title,
            description,
            type,
            metadata
        )
        select 
            id,
            'New Expense',
            format('New expense of ₹%s for %s by %s', new.amount, new.purpose, coalesce(creator_name, 'Unknown')),
            'expense',
            jsonb_build_object(
                'expense_id', new.id,
                'amount', new.amount,
                'purpose', new.purpose,
                'creator_id', new.created_by,
                'creator_name', creator_name
            )
        from auth.users
        where id != new.created_by
        and id in (select id from profiles where designation = 'Owner');
    end if;
    
    return new;
end;
$$;

create or replace function notify_deposit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    creator_name text;
begin
    -- Get creator name
    select name into creator_name from profiles where id = new.deposited_by;
    
    -- Notify only owners except the creator
    insert into notifications (
        user_id,
        title,
        description,
        type,
        metadata
    )
    select 
        id,
        'New Deposit',
        format('New deposit of ₹%s by %s', new.amount, coalesce(creator_name, 'Unknown')),
        'deposit',
        jsonb_build_object(
            'deposit_id', new.id,
            'amount', new.amount,
            'creator_id', new.deposited_by,
            'creator_name', creator_name
        )
    from auth.users
    where id != new.deposited_by
    and id in (select id from profiles where designation = 'Owner');
    
    return new;
end;
$$;

create or replace function notify_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Only notify for non-admin users
    if not new.is_admin then
        -- Notify all owners
        insert into notifications (
            user_id,
            title,
            description,
            type,
            metadata
        )
        select 
            id,
            'New User Signup',
            format('New user %s (%s) signed up as %s', new.name, new.phone, new.designation),
            'approval',
            jsonb_build_object(
                'user_id', new.id,
                'name', new.name,
                'phone', new.phone,
                'designation', new.designation
            )
        from auth.users
        where id in (select id from profiles where is_admin = true);
    end if;
    
    return new;
end;
$$;

-- Create balance update functions
create or replace function update_balances_for_sale()
returns trigger
language plpgsql
security definer
as $$
declare
    cash_amount integer;
    online_amount integer;
begin
    -- Extract amounts from the new sale
    cash_amount := (new.payment->>'cash')::integer;
    online_amount := (new.payment->>'online')::integer;

    -- Update balances
    update balances
    set 
        shop_balance = shop_balance + cash_amount,
        bank_balance = bank_balance + online_amount,
        last_updated = timezone('utc'::text, now())
    where id = (select id from balances limit 1);

    return new;
end;
$$;

create or replace function update_balances_for_deposit()
returns trigger
language plpgsql
security definer
as $$
begin
    -- Update balances (deposit moves money from shop to bank)
    update balances
    set 
        shop_balance = shop_balance - new.amount,
        bank_balance = bank_balance + new.amount,
        last_updated = timezone('utc'::text, now())
    where id = (select id from balances limit 1);

    return new;
end;
$$;

create or replace function handle_expense(user_id uuid, expense_purpose text, cash_amt integer, online_amt integer)
returns uuid
language plpgsql
security definer
as $$
declare
    v_expense_id uuid;
    v_balance_id uuid;
    v_shop_balance integer;
    v_bank_balance integer;
begin
    -- Start transaction
    begin
        -- Get current balances with lock
        select id, shop_balance, bank_balance 
        into v_balance_id, v_shop_balance, v_bank_balance
        from balances 
        limit 1 
        for update;

        if not found then
            raise exception 'No balance record found';
        end if;

        -- Validate amounts
        if cash_amt > v_shop_balance then
            raise exception 'Cash amount exceeds available shop balance';
        end if;

        if online_amt > v_bank_balance then
            raise exception 'Online amount exceeds available bank balance';
        end if;

        -- Create expense record first
        insert into expenses (
            created_by,
            purpose,
            amount,
            cash_amount,
            online_amount,
            timestamp
        ) values (
            user_id,
            expense_purpose,
            cash_amt + online_amt,
            cash_amt,
            online_amt,
            timezone('utc'::text, now())
        ) returning id into v_expense_id;

        -- Update balances with explicit WHERE clause
        update balances
        set 
            shop_balance = v_shop_balance - cash_amt,
            bank_balance = v_bank_balance - online_amt,
            last_updated = timezone('utc'::text, now())
        where id = v_balance_id;

        return v_expense_id;
    exception
        when others then
            raise exception 'Error handling expense: %', SQLERRM;
    end;
end;
$$;

-- Create triggers
create trigger on_sale_notify
    after insert on sales
    for each row
    execute function notify_sale();

create trigger on_expense_notify
    after insert on expenses
    for each row
    execute function notify_expense();

create trigger on_deposit_notify
    after insert on deposits
    for each row
    execute function notify_deposit();

create trigger on_new_user_notify
    after insert on profiles
    for each row
    execute function notify_new_user();

create trigger update_balances_after_sale
    after insert on sales
    for each row
    execute function update_balances_for_sale();

create trigger update_balances_after_deposit
    after insert on deposits
    for each row
    execute function update_balances_for_deposit();

-- Set up RLS
alter table profiles enable row level security;
alter table sales disable row level security;
alter table categories disable row level security;
alter table expenses disable row level security;
alter table deposits disable row level security;
alter table balances disable row level security;
alter table notifications enable row level security;

-- Create RLS policies
create policy "profiles_select_policy" on profiles
    for select using (true);

create policy "profiles_insert_policy" on profiles
    for insert with check (true);

create policy "profiles_update_policy" on profiles
    for update using (
        auth.uid() = id
        or exists (
            select 1 from profiles 
            where id = auth.uid() and is_admin = true
        )
    );

create policy "Users can read their own notifications"
    on notifications for select
    using (auth.uid() = user_id);

create policy "Users can update their own notifications"
    on notifications for update
    using (auth.uid() = user_id);

create policy "Anyone can insert notifications"
    on notifications for insert
    with check (true);

-- Drop existing verify_pin function
drop function if exists verify_pin(uuid, varchar);

-- Create verify_pin function
create or replace function verify_pin(user_id uuid, current_pin varchar)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    stored_pin varchar;
begin
    -- Get the stored PIN for the user
    select pin into stored_pin
    from profiles
    where id = user_id;

    if stored_pin is null then
        return jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    end if;

    -- Return result
    if stored_pin = current_pin then
        return jsonb_build_object('success', true);
    else
        return jsonb_build_object(
            'success', false,
            'error', 'Invalid PIN'
        );
    end if;
end;
$$;

-- Grant necessary permissions
grant all privileges on all tables in schema public to postgres, authenticated, service_role;
grant all privileges on all sequences in schema public to postgres, authenticated, service_role;
grant all privileges on all functions in schema public to postgres, authenticated, service_role; 