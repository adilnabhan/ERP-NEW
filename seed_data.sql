DO $$ 
DECLARE
  doc1 UUID := gen_random_uuid();
  doc2 UUID := gen_random_uuid();
  doc3 UUID := gen_random_uuid();
  doc4 UUID := gen_random_uuid();
  
  rm1 UUID := gen_random_uuid();
  rm2 UUID := gen_random_uuid();
  rm3 UUID := gen_random_uuid();
  rm4 UUID := gen_random_uuid();

  pat1 UUID := gen_random_uuid();
  pat2 UUID := gen_random_uuid();
  pat3 UUID := gen_random_uuid();
  pat4 UUID := gen_random_uuid();

  trt1 UUID := gen_random_uuid();
  trt2 UUID := gen_random_uuid();
  trt3 UUID := gen_random_uuid();
  trt4 UUID := gen_random_uuid();
BEGIN

  -- Doctors
  INSERT INTO public.doctors(id, name, specialization, status) VALUES 
  (doc1, 'Dr. Smith', 'Cardiology', 'Available'),
  (doc2, 'Dr. Patel', 'Neurology', 'Available'),
  (doc3, 'Dr. Sharma', 'Pediatrics', 'Available'),
  (doc4, 'Dr. Lee', 'Orthopedics', 'Busy');

  -- Rooms (from their specific data)
  INSERT INTO public.rooms(id, room_number, type, ac_type, bed_type, status) VALUES 
  (rm1, '101', 'River View Suit-1', 'AC', 'Double', 'Available'),
  (rm2, '102', 'River View Suit-2', 'AC', 'Double', 'Available'),
  (rm3, '103', 'The Nest', 'Non-AC', 'Single', 'Occupied'),
  (rm4, '104', 'Private Petal', 'AC', 'Single', 'Occupied');

  -- Patients
  INSERT INTO public.patients(id, name, contact, age, aadhar, blood_group, doctor_id, room_id, status) VALUES 
  (pat1, 'John Doe', '9876543210', '45', '123456789012', 'O+', doc1, rm3, 'Admitted'),
  (pat2, 'Jane Smith', '9876543211', '30', '123456789013', 'A+', doc2, rm4, 'Admitted'),
  (pat3, 'Robert Frost', '9876543212', '55', '123456789014', 'B-', doc3, NULL, 'Discharged'),
  (pat4, 'Emily Chen', '9876543213', '28', '123456789015', 'AB+', doc4, NULL, 'Discharged');

  -- Treatment Catalog
  INSERT INTO public.treatment_catalog(id, name, price) VALUES 
  (trt1, 'General Consultation', 500),
  (trt2, 'X-Ray', 1500),
  (trt3, 'Blood Test', 800),
  (trt4, 'MRI Scan', 6500);

  -- Patient Treatments
  INSERT INTO public.patient_treatments(patient_id, treatment_id, total_cost) VALUES 
  (pat1, trt1, 500),
  (pat1, trt3, 800),
  (pat2, trt2, 1500),
  (pat3, trt4, 6500);

  -- Leads
  INSERT INTO public.leads(name, contact, enquiry_details, expected_payment, status) VALUES 
  ('Michael Brown', '9998887770', 'Needs knee surgery details', 50000, 'Pending'),
  ('Sarah Connor', '9998887771', 'Maternity package enquiry', 60000, 'Pending'),
  ('David Miller', '9998887772', 'Dental checkup', 2000, 'Converted'),
  ('Emma Watson', '9998887773', 'Physiotherapy', 15000, 'Cancelled');

  -- Employees
  INSERT INTO public.employees(name, role, contact) VALUES 
  ('Alice Johnson', 'Nurse', '8887776660'),
  ('Bob Williams', 'Receptionist', '8887776661'),
  ('Charlie Davis', 'Pharmacist', '8887776662'),
  ('Diana King', 'Admin', '8887776663');

  -- Billing
  INSERT INTO public.billing(patient_id, total_paid) VALUES 
  (pat1, 1300),
  (pat2, 1000),
  (pat3, 6500),
  (pat4, 0);

  -- Payments
  INSERT INTO public.payments(patient_id, amount, payment_type, method) VALUES 
  (pat1, 1300, 'Full Settlement', 'Online'),
  (pat2, 1000, 'Advance', 'Cash'),
  (pat3, 6500, 'Full Settlement', 'Online'),
  (pat4, 500, 'Advance', 'Cash');

END $$;
