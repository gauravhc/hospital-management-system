let appointmentsStore = [
  {
    id: "1",
    patientId: "P1001",
    patient_id: "P1001",
    patientName: "John Doe",
    doctorId: "1",
    doctorName: "Dr. Smith",
    date: new Date().toISOString().split("T")[0],
    time: "10:00 AM",
    status: "pending",
    symptoms: "Fever and headache",
    type: "General Checkup",
    notes: "Regular checkup",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    patientId: "P1002",
    patient_id: "P1002",
    patientName: "Alice Johnson",
    doctorId: "2",
    doctorName: "Dr. Wilson",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "11:30 AM",
    status: "completed",
    symptoms: "Back pain",
    type: "Consultation",
    notes: "",
    createdAt: new Date().toISOString(),
  },
];

export const appointmentService = {
  async getAppointments(query = {}) {
    const { role, userId, status, date } = query;
    let appointments = [...appointmentsStore];

    if (role === "doctor" && userId) {
      appointments = appointments.filter((a) => String(a.doctorId) === String(userId));
    } else if (role === "patient" && userId) {
      appointments = appointments.filter((a) => String(a.patientId) === String(userId));
    }

    if (status && status.toLowerCase() !== "all") {
      appointments = appointments.filter(
        (a) => String(a.status || "").toLowerCase() === String(status).toLowerCase()
      );
    }

    if (date) {
      appointments = appointments.filter((a) => a.date === date);
    }

    return appointments.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  async createAppointment(data) {
    const newAppt = {
      id: String(Date.now()),
      status: "pending",
      createdAt: new Date().toISOString(),
      ...data,
    };

    appointmentsStore.push(newAppt);
    return newAppt;
  },

  async updateStatus(id, status) {
    const index = appointmentsStore.findIndex((a) => String(a.id) === String(id));
    if (index === -1) return null;

    appointmentsStore[index] = {
      ...appointmentsStore[index],
      status,
      updatedAt: new Date().toISOString(),
    };

    return appointmentsStore[index];
  },

  async updateAppointmentDate(id, date) {
    const index = appointmentsStore.findIndex((a) => String(a.id) === String(id));
    if (index === -1) return null;

    appointmentsStore[index] = {
      ...appointmentsStore[index],
      date,
      updatedAt: new Date().toISOString(),
    };

    return appointmentsStore[index];
  },

  async deleteAppointment(id) {
    const index = appointmentsStore.findIndex((a) => String(a.id) === String(id));
    if (index === -1) return null;
    const [removed] = appointmentsStore.splice(index, 1);
    return removed;
  },
};
