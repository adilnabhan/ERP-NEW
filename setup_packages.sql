-- This migration script creates the packages and room pricing tables based on your requirements.
-- Run this directly in your Supabase Dashboard -> SQL Editor and hit 'Run'.

-- 1. Create table for Packages
CREATE TABLE IF NOT EXISTS public.packages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    duration TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert package data
INSERT INTO public.packages (duration, name) VALUES
('7 Days', 'Sutika Care'),
('14 Days', 'Purna Shakti'),
('21 Days', 'Suvarna 21'),
('28 Days', 'Sampurna Raksha');

-- 2. Create table for Room Prices across the 4 packages
CREATE TABLE IF NOT EXISTS public.room_package_prices (
    id SERIAL PRIMARY KEY,
    room_number TEXT NOT NULL UNIQUE,
    room_name TEXT NOT NULL,
    sutika_care_price NUMERIC,
    purna_shakti_price NUMERIC,
    suvarna_21_price NUMERIC,
    sampurna_raksha_price NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert room pricing matrix
INSERT INTO public.room_package_prices 
(room_number, room_name, sutika_care_price, purna_shakti_price, suvarna_21_price, sampurna_raksha_price) 
VALUES
('101', 'River View Suit-1', 22000, 40000, 53000, 66000),
('102', 'River View Suit-2', 22000, 40000, 53000, 66000),
('103', 'The Nest', 19000, 35000, 49000, 62000),
('104', 'Private Petal', 19000, 35000, 49000, 62000),
('201', 'River View Suit-3', 22000, 40000, 53000, 66000),
('202', 'Vista Cradle-1', 20000, 37000, 50000, 63000),
('203', 'Vista Cradle-2', 20000, 37000, 50000, 63000),
('204', 'Confluence Suite', 22000, 40000, 53000, 66000),
('205', 'River View Studio', 21000, 38000, 51000, 64000);

-- Enable RLS (Optional best practice - you can modify policies later if accessed from frontend)
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_package_prices ENABLE ROW LEVEL SECURITY;

-- Assuming standard public read access is desired for prices (uncomment to apply):
-- CREATE POLICY "Allow public read-only access." ON public.packages FOR SELECT USING (true);
-- CREATE POLICY "Allow public read-only access." ON public.room_package_prices FOR SELECT USING (true);
