export const LAB_TEST_CATEGORIES = [
  {
    id: "hematology",
    title: "Hematology",
    tests: [
      { id: "cbc", name: "Complete Blood Count (CBC)", price: 250, turnaround: "24–48 hrs" },
      { id: "hb", name: "Hemoglobin (Hb)", price: 150, turnaround: "24–48 hrs" },
      { id: "esr", name: "ESR", price: 180, turnaround: "24–48 hrs" },
      { id: "crp", name: "CRP", price: 300, turnaround: "24–48 hrs" },
      { id: "ptinr", name: "PT/INR", price: 350, turnaround: "24–48 hrs" },
      { id: "platelet", name: "Platelet Count", price: 200, turnaround: "24–48 hrs" },
    ],
  },
  {
    id: "microbiology",
    title: "Microbiology",
    tests: [
      { id: "urine_culture", name: "Urine Culture", price: 550, turnaround: "48–72 hrs" },
      { id: "blood_culture", name: "Blood Culture", price: 850, turnaround: "72–96 hrs" },
      { id: "sputum_culture", name: "Sputum Culture", price: 650, turnaround: "48–72 hrs" },
      { id: "widal", name: "Widal Test", price: 250, turnaround: "24–48 hrs" },
      { id: "dengue_ns1", name: "Dengue NS1", price: 450, turnaround: "24–48 hrs" },
    ],
  },
  {
    id: "bioderlogy",
    title: "Bioderlogy",
    tests: [
      { id: "lft", name: "Liver Function Test (LFT)", price: 500, turnaround: "24–48 hrs" },
      { id: "rft", name: "Renal Function Test (RFT)", price: 450, turnaround: "24–48 hrs" },
      { id: "lipid", name: "Lipid Profile", price: 450, turnaround: "24–48 hrs" },
      { id: "hba1c", name: "HbA1c", price: 350, turnaround: "24–48 hrs" },
      { id: "tsh", name: "Thyroid (TSH)", price: 400, turnaround: "24–48 hrs" },
      { id: "blood_sugar", name: "Blood Sugar (FBS)", price: 120, turnaround: "24–48 hrs" },
    ],
  },
  {
    id: "radiology",
    title: "Radiology",
    tests: [
      { id: "xray_chest", name: "X-Ray Chest", price: 300, turnaround: "24–48 hrs" },
      { id: "usg_abdomen", name: "Ultrasound Abdomen", price: 900, turnaround: "24–48 hrs" },
      { id: "ct_head", name: "CT Scan (Head)", price: 2500, turnaround: "24–48 hrs" },
      { id: "mri_brain", name: "MRI (Brain)", price: 5500, turnaround: "24–48 hrs" },
      { id: "echo", name: "ECHO (2D)", price: 1200, turnaround: "24–48 hrs" },
    ],
  },
];

export const LAB_TESTS_FLAT = LAB_TEST_CATEGORIES.flatMap((cat) =>
  (cat.tests || []).map((t) => ({
    ...t,
    category_id: cat.id,
    category_title: cat.title,
  }))
);

