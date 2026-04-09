"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Edit2,
  X,
  Check,
  Search,
  Download,
  FileText,
  User,
  UserPlus,
  CreditCard,
  Activity,
  Calendar,
  Trash2,
  Save,
} from "lucide-react";

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [treatmentsCatalog, setTreatmentsCatalog] = useState<any[]>([]);

  const [searchPhone, setSearchPhone] = useState("");

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [form, setForm] = useState<any>({});

  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientTreatments, setPatientTreatments] = useState<any[]>([]);
  const [patientPayments, setPatientPayments] = useState<any[]>([]);

  const [newTreatmentId, setNewTreatmentId] = useState("");
  const [newAddonId, setNewAddonId] = useState("");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentReceived, setNewPaymentReceived] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("Cash");

  // Edit mode inside patient details
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    fetchInitData();
  }, []);

  const [packages, setPackages] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([]);

  async function fetchInitData() {
    const [pRes, dRes, rRes, tRes, pkgRes, prcRes] = await Promise.all([
      supabase
        .from("patients")
        .select("*, doctors(name), rooms(room_number), billing(*)")
        .order("created_at", { ascending: false }),
      supabase.from("doctors").select("*"),
      supabase.from("rooms").select("*"),
      supabase.from("treatment_catalog").select("*"),
      supabase.from("packages").select("*").order("id"),
      supabase.from("room_package_prices").select("*"),
    ]);

    if (pRes.data) setPatients(pRes.data);
    if (dRes.data) setDoctors(dRes.data);
    if (rRes.data) setRooms(rRes.data);
    if (tRes.data) setTreatmentsCatalog(tRes.data);
    if (pkgRes.data) setPackages(pkgRes.data);
    if (prcRes.data) setPrices(prcRes.data);
  }

  function lookupPrice(roomId: string, pkgId: string): number | null {
    if (!roomId || !pkgId) return null;
    const room = rooms.find((r) => r.id === roomId);
    const pkg = packages.find((p) => String(p.id) === String(pkgId));
    if (!room || !pkg) return null;
    const priceRow = prices.find((p) => p.room_number === room.room_number);
    if (!priceRow) return null;
    let priceCol = "";
    const pkgName = pkg.name.toLowerCase();
    if (pkgName.includes("sutika")) priceCol = "sutika_care_price";
    else if (pkgName.includes("purna shakti")) priceCol = "purna_shakti_price";
    else if (pkgName.includes("suvarna 21")) priceCol = "suvarna_21_price";
    else if (pkgName.includes("sampurna raksha"))
      priceCol = "sampurna_raksha_price";
    return priceCol && priceRow[priceCol] ? Number(priceRow[priceCol]) : null;
  }

  const filteredPatients = patients.filter(
    (p) =>
      p.contact?.includes(searchPhone) ||
      p.name?.toLowerCase().includes(searchPhone.toLowerCase()),
  );

  async function saveNewPatient() {
    if (!form.name || !form.contact)
      return alert("Name and Contact are required.");

    let targetPatientId = form.existing_patient_id;

    if (!targetPatientId) {
      const { data: newPat, error } = await supabase
        .from("patients")
        .insert([
          {
            name: form.name,
            contact: form.contact,
            age: form.age,
            aadhar: form.aadhar,
            blood_group: form.blood_group,
            doctor_id: form.doctor_id || null,
            room_id: form.room_id || null,
            status: "Admitted",
          },
        ])
        .select()
        .single();
      if (error) return alert(error.message);
      targetPatientId = newPat.id;
      await supabase.from("billing").insert([{ patient_id: targetPatientId }]);
    } else {
      // Updating existing patient
      const { error } = await supabase
        .from("patients")
        .update({
          status: "Admitted",
          doctor_id: form.doctor_id || null,
          room_id: form.room_id || null,
          discharge_date: null,
        })
        .eq("id", targetPatientId);
      if (error) return alert(error.message);
    }

    if (form.room_id) {
      await supabase
        .from("rooms")
        .update({ status: "Occupied" })
        .eq("id", form.room_id);
    }

    if (form.room_id && form.package_id) {
      const pBase = lookupPrice(form.room_id, form.package_id);
      const pkg = packages.find(
        (p) => String(p.id) === String(form.package_id),
      );
      if (pBase !== null && pkg) {
        const matchingCatalog = treatmentsCatalog.find(
          (t) => t.name === pkg.name,
        );
        if (matchingCatalog) {
          await supabase
            .from("patient_treatments")
            .insert([
              {
                patient_id: targetPatientId,
                treatment_id: matchingCatalog.id,
                total_cost: pBase,
              },
            ]);
        } else {
          const { data: newCatalog } = await supabase
            .from("treatment_catalog")
            .insert([{ name: pkg.name, price: pBase }])
            .select()
            .single();
          if (newCatalog) {
            await supabase
              .from("patient_treatments")
              .insert([
                {
                  patient_id: targetPatientId,
                  treatment_id: newCatalog.id,
                  total_cost: pBase,
                },
              ]);
          }
        }
      }
    }

    setIsAddingMode(false);
    setForm({});
    fetchInitData();
  }

  async function reAdmitCurrentPatient() {
    if (
      !confirm("Re-admit this patient? They will need a new room and package.")
    )
      return;
    setIsAddingMode(true);
    setForm({
      existing_patient_id: selectedPatient.id,
      name: selectedPatient.name,
      contact: selectedPatient.contact,
      age: selectedPatient.age,
      aadhar: selectedPatient.aadhar,
      blood_group: selectedPatient.blood_group,
    });
    setSelectedPatient(null);
  }

  async function openPatientDetails(patient: any) {
    setSelectedPatient(patient);
    setIsEditingPatient(false);
    setEditForm({
      name: patient.name,
      contact: patient.contact,
      aadhar: patient.aadhar,
      blood_group: patient.blood_group,
      age: patient.age,
    });

    const [tRes, payRes] = await Promise.all([
      supabase
        .from("patient_treatments")
        .select("*, treatment_catalog(name, price)")
        .eq("patient_id", patient.id),
      supabase.from("payments").select("*").eq("patient_id", patient.id),
    ]);

    if (tRes.data) setPatientTreatments(tRes.data);
    if (payRes.data) setPatientPayments(payRes.data);
  }

  async function savePatientEdits() {
    const { error } = await supabase
      .from("patients")
      .update({
        name: editForm.name,
        contact: editForm.contact,
        aadhar: editForm.aadhar,
        blood_group: editForm.blood_group,
        age: editForm.age,
      })
      .eq("id", selectedPatient.id);

    if (error) alert(error.message);
    else {
      setIsEditingPatient(false);
      fetchInitData();
      setSelectedPatient({ ...selectedPatient, ...editForm });
    }
  }

  async function deletePatient() {
    if (
      !confirm(
        "Are you SUPER sure? This will delete all records of this patient including their billing and treatments!",
      )
    )
      return;

    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("id", selectedPatient.id);
    if (error) alert(error.message);
    else {
      if (selectedPatient.room_id) {
        await supabase
          .from("rooms")
          .update({ status: "Available" })
          .eq("id", selectedPatient.room_id);
      }
      setSelectedPatient(null);
      fetchInitData();
    }
  }

  async function updatePatientAssignment(
    field: "doctor_id" | "room_id",
    value: string,
  ) {
    const val = value === "" ? null : value;

    // Manage old room vs new room availability
    if (field === "room_id" && selectedPatient.room_id !== val) {
      if (selectedPatient.room_id)
        await supabase
          .from("rooms")
          .update({ status: "Available" })
          .eq("id", selectedPatient.room_id);
      if (val)
        await supabase
          .from("rooms")
          .update({ status: "Occupied" })
          .eq("id", val);
    }

    const { error } = await supabase
      .from("patients")
      .update({ [field]: val })
      .eq("id", selectedPatient.id);
    if (error) alert(error.message);
    else {
      fetchInitData();
      const { data } = await supabase
        .from("patients")
        .select("*, doctors(name), rooms(room_number), billing(*)")
        .eq("id", selectedPatient.id)
        .single();
      if (data) setSelectedPatient(data);
    }
  }

  // Add a PACKAGE to patient (uses dynamic room pricing)
  async function addTreatmentToPatient() {
    if (!newTreatmentId) return;

    // newTreatmentId is like "pkg-3" for package id=3
    const pkgIdStr = newTreatmentId.replace("pkg-", "");
    const pkg = packages.find((p) => String(p.id) === pkgIdStr);
    if (!pkg) return;

    const pBase = lookupPrice(selectedPatient?.room_id, pkgIdStr);
    const finalCost = pBase !== null ? pBase : 0;

    // Find or create a treatment_catalog entry for this package
    let catalogId: string | null = null;
    const match = treatmentsCatalog.find((t) => t.name === pkg.name);
    if (match) {
      catalogId = match.id;
    } else {
      const { data: newCat } = await supabase
        .from("treatment_catalog")
        .insert([{ name: pkg.name, price: finalCost }])
        .select()
        .single();
      if (newCat) {
        catalogId = newCat.id;
        // Refresh catalog
        const { data: updatedCatalog } = await supabase
          .from("treatment_catalog")
          .select("*");
        if (updatedCatalog) setTreatmentsCatalog(updatedCatalog);
      }
    }

    if (!catalogId) return;

    const { error } = await supabase.from("patient_treatments").insert([
      {
        patient_id: selectedPatient.id,
        treatment_id: catalogId,
        total_cost: finalCost,
      },
    ]);

    if (error) alert(error.message);
    else {
      setNewTreatmentId("");
      openPatientDetails(selectedPatient);
    }
  }

  // Add an ADDITIONAL TREATMENT (face, body, herbal, etc.)
  async function addAddonTreatment() {
    if (!newAddonId) return;

    const t = treatmentsCatalog.find((tc) => tc.id === newAddonId);
    if (!t) return;

    const { error } = await supabase.from("patient_treatments").insert([
      {
        patient_id: selectedPatient.id,
        treatment_id: t.id,
        total_cost: t.price,
      },
    ]);

    if (error) alert(error.message);
    else {
      setNewAddonId("");
      openPatientDetails(selectedPatient);
    }
  }

  async function removeTreatment(treatmentRecordId: string) {
    if (!confirm("Remove this treatment/package?")) return;
    const { error } = await supabase
      .from("patient_treatments")
      .delete()
      .eq("id", treatmentRecordId);
    if (error) alert(error.message);
    else openPatientDetails(selectedPatient);
  }

  async function addPayment() {
    if (!newPaymentAmount) return;
    const amt = parseFloat(newPaymentAmount);

    const { error } = await supabase.from("payments").insert([
      {
        patient_id: selectedPatient.id,
        amount: amt,
        payment_type: "Advance/Partial",
        method: newPaymentMethod,
      },
    ]);

    if (error) alert(error.message);
    else {
      const currentBilling = selectedPatient.billing[0];
      if (currentBilling) {
        await supabase
          .from("billing")
          .update({
            total_paid: (currentBilling.total_paid || 0) + amt,
          })
          .eq("id", currentBilling.id);
      }

      setNewPaymentAmount("");
      setNewPaymentReceived("");
      fetchInitData();
      setTimeout(() => {
        const updatedBillPat = {
          ...selectedPatient,
          billing: [
            {
              ...currentBilling,
              total_paid: (currentBilling?.total_paid || 0) + amt,
            },
          ],
        };
        setSelectedPatient(updatedBillPat);
        openPatientDetails(updatedBillPat);
      }, 500);
    }
  }

  async function dischargePatient() {
    if (!confirm("Are you sure you want to discharge this patient?")) return;

    await supabase
      .from("patients")
      .update({
        status: "Discharged",
        discharge_date: new Date().toISOString(),
      })
      .eq("id", selectedPatient.id);

    if (selectedPatient.room_id) {
      await supabase
        .from("rooms")
        .update({ status: "Available" })
        .eq("id", selectedPatient.room_id);
    }

    alert("Patient Discharged Successfully");
    setSelectedPatient(null);
    fetchInitData();
  }

  function downloadCSV() {
    let csv =
      "Name,Contact,Aadhar,Blood Group,Status,Total Paid,Admission Date\n";
    patients.forEach((p) => {
      const totalPaid = p.billing?.[0]?.total_paid || 0;
      csv += `${p.name},${p.contact},${p.aadhar || ""},${p.blood_group || ""},${p.status},${totalPaid},${new Date(p.admission_date).toLocaleDateString()}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patients_export.csv";
    a.click();
  }

  const calcTotalTreatmentCost = () =>
    patientTreatments.reduce(
      (acc, curr) => acc + (Number(curr.total_cost) || 0),
      0,
    );
  const totalPaid = selectedPatient?.billing?.[0]?.total_paid || 0;
  const balanceDue = calcTotalTreatmentCost() - totalPaid;

  // Separate package items from addon treatments for display
  const packageNames = packages.map((p) => p.name);
  const pkgItems = patientTreatments.filter((pt) =>
    packageNames.includes(pt.treatment_catalog?.name),
  );
  const addonItems = patientTreatments.filter(
    (pt) => !packageNames.includes(pt.treatment_catalog?.name),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">
          Patients Data
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Phone/Name"
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:ring-gray-900 focus:border-gray-900 outline-none text-sm w-64 shadow-sm"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsAddingMode(true)}
            className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2" /> New Patient
          </button>
          <button
            onClick={downloadCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </button>
        </div>
      </div>

      {isAddingMode && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-indigo-600" /> Register New
              Patient
            </h2>
            <button
              onClick={() => setIsAddingMode(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 text-indigo-600">
                Autofill from Existing Patient (Optional)
              </label>
              <select
                className="w-full border-gray-300 border rounded-md px-3 py-2 text-sm focus:border-indigo-500 bg-indigo-50 outline-none"
                onChange={(e) => {
                  const p = patients.find((x) => x.id === e.target.value);
                  if (p) {
                    setForm({
                      ...form,
                      existing_patient_id: p.id,
                      name: p.name,
                      contact: p.contact,
                      age: p.age,
                      aadhar: p.aadhar,
                      blood_group: p.blood_group,
                    });
                  } else {
                    setForm({ ...form, existing_patient_id: null });
                  }
                }}
                value={form.existing_patient_id || ""}
              >
                <option value="">-- Select or type below --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {p.contact}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                className="w-full border-gray-300 border rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors shadow-sm"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Contact Number *
              </label>
              <input
                className="w-full border-gray-300 border rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors shadow-sm"
                value={form.contact || ""}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Age
              </label>
              <input
                type="number"
                className="w-full border-gray-300 border rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors shadow-sm"
                value={form.age || ""}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Aadhar Number
              </label>
              <input
                className="w-full border-gray-300 border rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors shadow-sm"
                value={form.aadhar || ""}
                onChange={(e) => setForm({ ...form, aadhar: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Blood Group
              </label>
              <input
                className="w-full border-gray-300 border rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors shadow-sm"
                value={form.blood_group || ""}
                onChange={(e) =>
                  setForm({ ...form, blood_group: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Assign Doctor
              </label>
              <select
                className="w-full border-gray-300 border rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors shadow-sm bg-white"
                onChange={(e) =>
                  setForm({ ...form, doctor_id: e.target.value })
                }
              >
                <option value="">-- Select --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialization})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Assign Room & Package
              </label>
              <div className="flex gap-2">
                <select
                  className="w-1/2 border-gray-300 border rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors shadow-sm bg-white"
                  onChange={(e) =>
                    setForm({ ...form, room_id: e.target.value })
                  }
                >
                  <option value="">-- Room --</option>
                  {rooms
                    .filter((r) => r.status === "Available")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.room_number} ({r.type})
                      </option>
                    ))}
                </select>
                <select
                  className="w-1/2 border-gray-300 border rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors shadow-sm bg-white"
                  onChange={(e) =>
                    setForm({ ...form, package_id: e.target.value })
                  }
                >
                  <option value="">-- Package --</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              onClick={saveNewPatient}
              className="px-5 py-2 bg-indigo-600 font-medium text-white rounded-md hover:bg-indigo-700 shadow-sm flex items-center"
            >
              <Check className="w-4 h-4 mr-2" /> Submit Patient Profile
            </button>
          </div>
        </div>
      )}

      {selectedPatient ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="w-full md:w-3/4">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold flex items-center text-gray-900">
                  <User className="w-6 h-6 mr-2 text-indigo-500" />
                  {isEditingPatient ? (
                    <input
                      className="border-b-2 border-indigo-500 outline-none bg-transparent px-1 min-w-[200px]"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                    />
                  ) : (
                    selectedPatient.name
                  )}
                </h2>
                {!isEditingPatient && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${selectedPatient.status === "Discharged" ? "bg-gray-200 text-gray-700" : "bg-green-100 text-green-700"}`}
                  >
                    {selectedPatient.status}
                  </span>
                )}

                {!isEditingPatient ? (
                  <button
                    onClick={() => setIsEditingPatient(true)}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={savePatientEdits}
                      className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsEditingPatient(false)}
                      className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-2 text-sm text-gray-500 flex flex-wrap items-center gap-x-6 gap-y-2">
                <span>
                  <strong className="text-gray-700">Phone:</strong>
                  {isEditingPatient ? (
                    <input
                      className="border border-gray-300 rounded px-2 py-0.5 ml-1 w-32"
                      value={editForm.contact}
                      onChange={(e) =>
                        setEditForm({ ...editForm, contact: e.target.value })
                      }
                    />
                  ) : (
                    selectedPatient.contact
                  )}
                </span>
                <span>
                  <strong className="text-gray-700">Aadhar:</strong>
                  {isEditingPatient ? (
                    <input
                      className="border border-gray-300 rounded px-2 py-0.5 ml-1 w-32"
                      value={editForm.aadhar}
                      onChange={(e) =>
                        setEditForm({ ...editForm, aadhar: e.target.value })
                      }
                    />
                  ) : (
                    selectedPatient.aadhar || "N/A"
                  )}
                </span>
                <span>
                  <strong className="text-gray-700">Blood Group:</strong>
                  {isEditingPatient ? (
                    <input
                      className="border border-gray-300 rounded px-2 py-0.5 ml-1 w-16"
                      value={editForm.blood_group}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          blood_group: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <span className="text-red-600 font-bold ml-1">
                      {selectedPatient.blood_group || "N/A"}
                    </span>
                  )}
                </span>
                <span>
                  <strong className="text-gray-700">Age:</strong>
                  {isEditingPatient ? (
                    <input
                      type="number"
                      className="border border-gray-300 rounded px-2 py-0.5 ml-1 w-16"
                      value={editForm.age}
                      onChange={(e) =>
                        setEditForm({ ...editForm, age: e.target.value })
                      }
                    />
                  ) : (
                    selectedPatient.age
                  )}
                </span>
              </div>

              <div className="mt-3 text-sm text-gray-500 flex items-center space-x-6 bg-white p-3 rounded-md border border-gray-200 shadow-sm inline-flex">
                <div className="flex flex-col">
                  <strong className="text-gray-700 text-xs uppercase mb-1">
                    Assigned Doctor
                  </strong>
                  <select
                    className="border-none bg-transparent outline-none cursor-pointer text-indigo-700 font-semibold"
                    value={selectedPatient.doctor_id || ""}
                    onChange={(e) =>
                      updatePatientAssignment("doctor_id", e.target.value)
                    }
                  >
                    <option value="">Unassigned</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex flex-col">
                  <strong className="text-gray-700 text-xs uppercase mb-1">
                    Assigned Room
                  </strong>
                  <select
                    className="border-none bg-transparent outline-none cursor-pointer text-indigo-700 font-semibold"
                    value={selectedPatient.room_id || ""}
                    onChange={(e) =>
                      updatePatientAssignment("room_id", e.target.value)
                    }
                  >
                    <option value="">No Room</option>
                    {rooms
                      .filter(
                        (r) =>
                          r.status === "Available" ||
                          r.id === selectedPatient.room_id,
                      )
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.room_number}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex flex-col justify-center">
                  <strong className="text-gray-700 text-xs uppercase mb-1">
                    Admitted On
                  </strong>
                  <span className="text-gray-600 font-medium">
                    {new Date(
                      selectedPatient.admission_date,
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={deletePatient}
                className="p-2 border border-red-200 text-red-600 rounded bg-red-50 hover:bg-red-100 flex items-center shadow-sm"
                title="Delete Patient Record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedPatient(null)}
                className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 shadow-sm text-gray-600"
              >
                Back
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-6 border-r border-gray-100">
              <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                <Activity className="w-5 h-5 mr-2 text-blue-500" /> Packages &
                Treatments
              </h3>

              {/* Package Selection */}
              <div className="mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">
                  Add Package
                </label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 border-gray-300 border rounded-md px-3 py-2 text-sm bg-white"
                    value={newTreatmentId}
                    onChange={(e) => setNewTreatmentId(e.target.value)}
                  >
                    <option value="">Select Package...</option>
                    {packages.map((p) => {
                      const dynamicPrice = lookupPrice(
                        selectedPatient?.room_id,
                        String(p.id),
                      );
                      return (
                        <option key={`pkg-${p.id}`} value={`pkg-${p.id}`}>
                          {p.name}{" "}
                          {dynamicPrice !== null
                            ? `(₹${dynamicPrice.toLocaleString()})`
                            : `(${p.duration})`}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    onClick={addTreatmentToPatient}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 text-sm shadow-sm whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Additional Treatments */}
              <div className="mb-4 p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                <label className="block text-xs font-semibold text-purple-700 uppercase tracking-wider mb-2">
                  Add Additional Treatment
                </label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 border-gray-300 border rounded-md px-3 py-2 text-sm bg-white"
                    value={newAddonId}
                    onChange={(e) => setNewAddonId(e.target.value)}
                  >
                    <option value="">
                      Select Treatment (Face, Body, Herbal...)
                    </option>
                    {treatmentsCatalog
                      .filter((t) => !packageNames.includes(t.name))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (₹{Number(t.price).toLocaleString()})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={addAddonTreatment}
                    className="px-4 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 text-sm shadow-sm whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Itemized List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                {patientTreatments.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">
                    No packages or treatments added yet.
                  </p>
                ) : null}

                {/* Package Items */}
                {pkgItems.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">
                      Packages
                    </p>
                    {pkgItems.map((pt) => (
                      <div
                        key={pt.id}
                        className="flex justify-between items-center p-3 bg-blue-50 border border-blue-100 rounded-lg mb-1"
                      >
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">
                            {pt.treatment_catalog?.name || "Package"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(pt.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-700">
                            ₹{Number(pt.total_cost).toLocaleString()}
                          </span>
                          <button
                            onClick={() => removeTreatment(pt.id)}
                            className="text-red-400 hover:text-red-600 p-1"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Addon Items */}
                {addonItems.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-purple-600 uppercase mb-1">
                      Additional Treatments
                    </p>
                    {addonItems.map((pt) => (
                      <div
                        key={pt.id}
                        className="flex justify-between items-center p-3 bg-purple-50 border border-purple-100 rounded-lg mb-1"
                      >
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">
                            {pt.treatment_catalog?.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(pt.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-700">
                            ₹{Number(pt.total_cost).toLocaleString()}
                          </span>
                          <button
                            onClick={() => removeTreatment(pt.id)}
                            className="text-red-400 hover:text-red-600 p-1"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-lg font-bold text-gray-900">
                <span>Total Care Bill:</span>
                <span>₹{calcTotalTreatmentCost().toLocaleString()}</span>
              </div>
            </div>

            <div className="p-6 bg-gray-50/30">
              <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                <CreditCard className="w-5 h-5 mr-2 text-green-500" /> Payments
                Ledger
              </h3>
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex gap-2 mb-2">
                  <select
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Apply to Bill (₹)"
                    className="flex-1 border-gray-300 border rounded-md px-3 py-2 text-sm"
                    value={newPaymentAmount}
                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Cash Received (₹)"
                    className="flex-1 border-gray-300 border rounded-md px-3 py-2 text-sm bg-green-50"
                    value={newPaymentReceived}
                    onChange={(e) => setNewPaymentReceived(e.target.value)}
                  />
                  <button
                    onClick={addPayment}
                    className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 text-sm shadow-sm whitespace-nowrap"
                  >
                    Receive Pay
                  </button>
                </div>
                {newPaymentReceived && newPaymentAmount && Number(newPaymentReceived) > Number(newPaymentAmount) && (
                   <div className="text-sm font-bold text-green-800 bg-green-100 p-2 rounded-md mb-2 flex justify-between">
                     <span>Change to Return to Patient:</span>
                     <span>₹{(Number(newPaymentReceived) - Number(newPaymentAmount)).toLocaleString()}</span>
                   </div>
                )}
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {patientPayments.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">
                    No payments received yet.
                  </p>
                ) : null}
                {patientPayments.map((pay) => (
                  <div
                    key={pay.id}
                    className="flex justify-between items-center p-3 bg-white border border-gray-200 shadow-sm rounded-lg"
                  >
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <div>
                        <span className="text-sm font-medium text-gray-700 block">
                          {pay.payment_type}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                          {pay.method || "Cash"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">
                        ₹{Number(pay.amount).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(pay.payment_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between text-sm mb-2 text-gray-600">
                  <span>Total Billed:</span>{" "}
                  <span className="font-semibold text-gray-900">
                    ₹{calcTotalTreatmentCost().toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-3 text-gray-600">
                  <span>Total Paid:</span>{" "}
                  <span className="font-semibold text-green-600">
                    ₹{Number(totalPaid).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-base border-t pt-2 border-gray-100 font-bold text-gray-900">
                  <span>Balance Due:</span>
                  <span
                    className={
                      balanceDue > 0 ? "text-red-500" : "text-gray-500"
                    }
                  >
                    ₹{balanceDue > 0 ? balanceDue.toLocaleString() : 0}
                  </span>
                </div>

                {selectedPatient.status !== "Discharged" ? (
                  <button
                    onClick={dischargePatient}
                    className="mt-5 w-full py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow flex justify-center items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" /> Discharge Patient &
                    Close
                  </button>
                ) : (
                  <button
                    onClick={reAdmitCurrentPatient}
                    className="mt-5 w-full py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow flex justify-center items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Re-Admit Patient
                  </button>
                )}
                <button
                  onClick={() =>
                    window.open(`/invoice/${selectedPatient.id}`, "_blank")
                  }
                  className="mt-3 w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow flex justify-center items-center"
                >
                  <FileText className="w-4 h-4 mr-2" /> Generate & Print Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Patient Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Contact Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Assigned
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Admission
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Paid / Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  onClick={() => openPatientDetails(patient)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900">
                          {patient.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Age: {patient.age || "N/A"} •{" "}
                          {patient.blood_group || "No BG"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {patient.contact}
                    </div>
                    <div className="text-xs text-gray-500">
                      {patient.aadhar ? `Aadhar: ${patient.aadhar}` : ""}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {patient.doctors?.name || "-"}
                    </div>
                    <div className="text-xs text-indigo-600 font-medium">
                      {patient.rooms?.room_number
                        ? `Room: ${patient.rooms.room_number}`
                        : ""}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />{" "}
                      {new Date(patient.admission_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-green-600 mb-1">
                      ₹{patient.billing?.[0]?.total_paid || 0} Paid
                    </div>
                    <span
                      className={`px-2 inline-flex text-[10px] leading-5 font-bold uppercase tracking-wider rounded-md ${patient.status === "Discharged" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"}`}
                    >
                      {patient.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-gray-500 italic"
                  >
                    No patients matched this search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
