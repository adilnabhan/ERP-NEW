import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function seed() {
  console.log("Seeding doctors...");
  const { data: doctors } = await s.from('doctors').insert([
    { name: 'Dr. Smith', specialization: 'Cardiology', status: 'Available' },
    { name: 'Dr. Patel', specialization: 'Neurology', status: 'Available' },
    { name: 'Dr. Sharma', specialization: 'Pediatrics', status: 'Available' },
    { name: 'Dr. Lee', specialization: 'Orthopedics', status: 'Busy' }
  ]).select();

  console.log("Seeding rooms...");
  const { data: rooms } = await s.from('rooms').insert([
    { room_number: '101', type: 'River View Suit-1', ac_type: 'AC', bed_type: 'Double', status: 'Available' },
    { room_number: '102', type: 'River View Suit-2', ac_type: 'AC', bed_type: 'Double', status: 'Available' },
    { room_number: '103', type: 'The Nest', ac_type: 'Non-AC', bed_type: 'Single', status: 'Occupied' },
    { room_number: '104', type: 'Private Petal', ac_type: 'AC', bed_type: 'Single', status: 'Occupied' }
  ]).select();

  console.log("Seeding treatment_catalog...");
  const { data: treatments } = await s.from('treatment_catalog').insert([
    { name: 'General Consultation', price: 500 },
    { name: 'X-Ray', price: 1500 },
    { name: 'Blood Test', price: 800 },
    { name: 'MRI Scan', price: 6500 }
  ]).select();

  const doc1 = doctors[0].id, doc2 = doctors[1].id, doc3 = doctors[2].id, doc4 = doctors[3].id;
  const rm3 = rooms[2].id, rm4 = rooms[3].id;

  console.log("Seeding patients...");
  const { data: patients } = await s.from('patients').insert([
    { name: 'John Doe', contact: '9876543210', age: '45', aadhar: '123456789012', blood_group: 'O+', doctor_id: doc1, room_id: rm3, status: 'Admitted' },
    { name: 'Jane Smith', contact: '9876543211', age: '30', aadhar: '123456789013', blood_group: 'A+', doctor_id: doc2, room_id: rm4, status: 'Admitted' },
    { name: 'Robert Frost', contact: '9876543212', age: '55', aadhar: '123456789014', blood_group: 'B-', doctor_id: doc3, status: 'Discharged' },
    { name: 'Emily Chen', contact: '9876543213', age: '28', aadhar: '123456789015', blood_group: 'AB+', doctor_id: doc4, status: 'Discharged' }
  ]).select();

  const pat1 = patients[0].id, pat2 = patients[1].id, pat3 = patients[2].id, pat4 = patients[3].id;
  const trt1 = treatments[0].id, trt2 = treatments[1].id, trt3 = treatments[2].id, trt4 = treatments[3].id;

  console.log("Seeding patient_treatments...");
  await s.from('patient_treatments').insert([
    { patient_id: pat1, treatment_id: trt1, total_cost: 500 },
    { patient_id: pat1, treatment_id: trt3, total_cost: 800 },
    { patient_id: pat2, treatment_id: trt2, total_cost: 1500 },
    { patient_id: pat3, treatment_id: trt4, total_cost: 6500 }
  ]);

  console.log("Seeding billing...");
  await s.from('billing').insert([
    { patient_id: pat1, total_paid: 1300 },
    { patient_id: pat2, total_paid: 1000 },
    { patient_id: pat3, total_paid: 6500 },
    { patient_id: pat4, total_paid: 0 }
  ]);

  console.log("Seeding payments...");
  await s.from('payments').insert([
    { patient_id: pat1, amount: 1300, payment_type: 'Full Settlement', method: 'Online' },
    { patient_id: pat2, amount: 1000, payment_type: 'Advance', method: 'Cash' },
    { patient_id: pat3, amount: 6500, payment_type: 'Full Settlement', method: 'Online' },
    { patient_id: pat4, amount: 500, payment_type: 'Advance', method: 'Cash' }
  ]);

  console.log("Seeding leads...");
  await s.from('leads').insert([
    { name: 'Michael Brown', contact: '9998887770', enquiry_details: 'Needs knee surgery details', expected_payment: 50000, status: 'Pending' },
    { name: 'Sarah Connor', contact: '9998887771', enquiry_details: 'Maternity package enquiry', expected_payment: 60000, status: 'Pending' },
    { name: 'David Miller', contact: '9998887772', enquiry_details: 'Dental checkup', expected_payment: 2000, status: 'Converted' },
    { name: 'Emma Watson', contact: '9998887773', enquiry_details: 'Physiotherapy', expected_payment: 15000, status: 'Cancelled' }
  ]);

  console.log("Seeding employees...");
  await s.from('employees').insert([
    { name: 'Alice Johnson', role: 'Nurse', contact: '8887776660' },
    { name: 'Bob Williams', role: 'Receptionist', contact: '8887776661' },
    { name: 'Charlie Davis', role: 'Pharmacist', contact: '8887776662' },
    { name: 'Diana King', role: 'Admin', contact: '8887776663' }
  ]);

  console.log("ALL SEEDING COMPLETED PERFECTLY!");
}

seed().catch(console.error);
