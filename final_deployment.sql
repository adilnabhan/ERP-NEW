-- Enable pgcrypto if not already enabled (needed for password hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Delete any existing demo records to ensure totally clean insert
DELETE FROM public.patient_treatments;
DELETE FROM public.billing;
DELETE FROM public.payments;
DELETE FROM public.patients;
DELETE FROM public.rooms;
DELETE FROM public.doctors;
DELETE FROM public.treatment_catalog;
DELETE FROM public.leads;
DELETE FROM public.employees;

-- 1. Insert 4 Doctors
INSERT INTO public.doctors(id, name, specialization, status) VALUES 
('11111111-1111-1111-1111-111111111111', 'Dr. Smith', 'Cardiology', 'Available'),
('22222222-2222-2222-2222-222222222222', 'Dr. Patel', 'Neurology', 'Available'),
('33333333-3333-3333-3333-333333333333', 'Dr. Sharma', 'Pediatrics', 'Available'),
('44444444-4444-4444-4444-444444444444', 'Dr. Lee', 'Orthopedics', 'Busy');

-- 2. Insert 4 Rooms (From your specific tracking image)
INSERT INTO public.rooms(id, room_number, type, ac_type, bed_type, status) VALUES 
('55555555-5555-5555-5555-555555555555', '101', 'River View Suit-1', 'AC', 'Double', 'Available'),
('66666666-6666-6666-6666-666666666666', '102', 'River View Suit-2', 'AC', 'Double', 'Available'),
('77777777-7777-7777-7777-777777777777', '103', 'The Nest', 'Non-AC', 'Single', 'Occupied'),
('88888888-8888-8888-8888-888888888888', '104', 'Private Petal', 'AC', 'Single', 'Occupied');

-- 3. Insert 4 Treatment Catalog Options
INSERT INTO public.treatment_catalog(id, name, price) VALUES 
('99999999-9999-9999-9999-999999999999', 'General Consultation', 500),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'X-Ray', 1500),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Blood Test', 800),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'MRI Scan', 6500);

-- 4. Insert 4 Active/Discharged Patients
INSERT INTO public.patients(id, name, contact, age, aadhar, blood_group, doctor_id, room_id, status) VALUES 
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'John Doe', '9876543210', '45', '123456789012', 'O+', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', 'Admitted'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Jane Smith', '9876543211', '30', '123456789013', 'A+', '22222222-2222-2222-2222-222222222222', '88888888-8888-8888-8888-888888888888', 'Admitted'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Robert Frost', '9876543212', '55', '123456789014', 'B-', '33333333-3333-3333-3333-333333333333', NULL, 'Discharged'),
('00000000-0000-0000-0000-000000000001', 'Emily Chen', '9876543213', '28', '123456789015', 'AB+', '44444444-4444-4444-4444-444444444444', NULL, 'Discharged');

-- 5. Insert their individual Patient Treatments
INSERT INTO public.patient_treatments(patient_id, treatment_id, total_cost) VALUES 
('dddddddd-dddd-dddd-dddd-dddddddddddd', '99999999-9999-9999-9999-999999999999', 500),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 800),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1500),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 6500);

-- 6. Insert Billing Ledgers
INSERT INTO public.billing(patient_id, total_paid) VALUES 
('dddddddd-dddd-dddd-dddd-dddddddddddd', 1300),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1000),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 6500),
('00000000-0000-0000-0000-000000000001', 0);

-- 7. Insert Historical Payments
INSERT INTO public.payments(patient_id, amount, payment_type, method) VALUES 
('dddddddd-dddd-dddd-dddd-dddddddddddd', 1300, 'Full Settlement', 'Online'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1000, 'Advance', 'Cash'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 6500, 'Full Settlement', 'Online'),
('00000000-0000-0000-0000-000000000001', 500, 'Advance', 'Cash');

-- 8. Insert 4 Call Leads
INSERT INTO public.leads(name, contact, enquiry_details, expected_payment, status) VALUES 
('Michael Brown', '9998887770', 'Needs knee surgery details', 50000, 'Pending'),
('Sarah Connor', '9998887771', 'Maternity package enquiry', 60000, 'Pending'),
('David Miller', '9998887772', 'Dental checkup', 2000, 'Converted'),
('Emma Watson', '9998887773', 'Physiotherapy', 15000, 'Cancelled');

-- 9. Insert 4 Employees
INSERT INTO public.employees(name, role, contact) VALUES 
('Alice Johnson', 'Nurse', '8887776660'),
('Bob Williams', 'Receptionist', '8887776661'),
('Charlie Davis', 'Pharmacist', '8887776662'),
('Diana King', 'Admin', '8887776663');

-- 10. SETUP ADMIN LOGIN WITH MALAYALAM PASSWORD & BYPASS EMAIL AUTH
DELETE FROM auth.identities WHERE id = 'f9999999-9999-9999-9999-999999999999';
DELETE FROM auth.users WHERE id = 'f9999999-9999-9999-9999-999999999999';

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('f9999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@clinic.com', crypt('MALAYALAM', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, now(), now(), '', '', '', ''); 

INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
VALUES ('f9999999-9999-9999-9999-999999999999', 'f9999999-9999-9999-9999-999999999999', '{"sub":"f9999999-9999-9999-9999-999999999999","email":"admin@clinic.com"}', 'email', now(), now(), now(), 'f9999999-9999-9999-9999-999999999999');
