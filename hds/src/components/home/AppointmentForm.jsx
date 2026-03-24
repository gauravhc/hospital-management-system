'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { apiGet, apiPost } from '@/services/api';

const SERVICE_BY_DEPARTMENT = {
    Cardiology: ['ECG', 'Heart Checkup', 'Consultation'],
    Neurology: ['Brain Checkup', 'Consultation'],
    Orthopedics: ['Joint Care', 'Bone Consultation'],
    'General Medicine': ['General Checkup', 'Consultation'],
    Pediatrics: ['Child Checkup', 'Vaccination'],
};

const AppointmentForm = () => {
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const [loadingHospitals, setLoadingHospitals] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const [doctors, setDoctors] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const router = useRouter();

    const [form, setForm] = useState({
        hospitalId: '',
        department: '',
        service: '',
        doctorId: '',
        date: '',
        time: '',
        comments: '',
    });

    const departmentOptions = [
        'Cardiology',
        'Neurology',
        'Orthopedics',
        'General Medicine',
        'Pediatrics',
    ];

    const services = useMemo(
        () => SERVICE_BY_DEPARTMENT[form.department] || ['Consultation'],
        [form.department]
    );

    const filteredDoctors = useMemo(() => {
        const base = form.hospitalId
            ? doctors.filter((d) => String(d.hospital_id) === String(form.hospitalId))
            : doctors;
        if (!form.department) return base;
        const selected = String(form.department).toLowerCase();
        const matched = base.filter((d) => {
            const dept = String(d.department || '').toLowerCase();
            if (!dept) return false;
            return dept.includes(selected) || selected.includes(dept);
        });
        return matched.length ? matched : base;
    }, [doctors, form.department, form.hospitalId]);

    useEffect(() => {
        const loadHospitals = async () => {
            try {
                setLoadingHospitals(true);
                const data = await apiGet('/api/hospitals');
                setHospitals(Array.isArray(data?.hospitals) ? data.hospitals : []);
            } catch (err) {
                console.error('Failed to load hospitals:', err);
                setHospitals([]);
            } finally {
                setLoadingHospitals(false);
            }
        };

        loadHospitals();
    }, []);

    useEffect(() => {
        const loadDoctors = async () => {
            if (!form.hospitalId) {
                setDoctors([]);
                return;
            }
            try {
                setLoadingDoctors(true);
                const data = await apiGet(`/api/doctors/hospital/${form.hospitalId}`);
                setDoctors(Array.isArray(data?.doctors) ? data.doctors : []);
            } catch (err) {
                console.error('Failed to load doctors:', err);
                setDoctors([]);
            } finally {
                setLoadingDoctors(false);
            }
        };

        loadDoctors();
    }, [form.hospitalId]);

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => {
            const next = { ...prev, [name]: value };
            if (name === 'hospitalId') {
                next.department = '';
                next.service = '';
                next.doctorId = '';
            }
            if (name === 'department') {
                next.service = '';
                next.doctorId = '';
            }
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            setShowAuthPrompt(true);
            return;
        }

        if (!form.hospitalId || !form.department || !form.service || !form.doctorId || !form.date || !form.time || !form.comments.trim()) {
            setMessage('Please fill all required fields.');
            return;
        }

        const selectedDoctor = doctors.find((d) => String(d.id) === String(form.doctorId));

        try {
            setSubmitting(true);
            const rawUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
            const user = rawUser ? JSON.parse(rawUser) : null;
            const patientProfileRaw = typeof window !== 'undefined' ? localStorage.getItem('patient_profile') : null;
            const patientProfile = patientProfileRaw ? JSON.parse(patientProfileRaw) : null;

            const payload = {
                patient_id: user?.id || null,
                patient_email: user?.username || user?.email || '',
                patient_name: patientProfile?.name || user?.username || 'Patient',
                patient_phone: patientProfile?.phone || '',
                hospital_id: form.hospitalId,
                doctor_id: selectedDoctor?.doctor_id || selectedDoctor?.id || form.doctorId,
                appointment_date: form.date,
                appointment_time: form.time,
                department: form.department,
                service: form.service,
                comments: form.comments.trim(),
            };

            const res = await apiPost('/api/appointments/book', payload);
            if (res?.success) {
                setMessage('Appointment booked successfully.');
                setForm({
                    hospitalId: '',
                    department: '',
                    service: '',
                    doctorId: '',
                    date: '',
                    time: '',
                    comments: '',
                });
            } else {
                setMessage(res?.message || 'Failed to book appointment.');
            }
        } catch (err) {
            setMessage(err?.message || 'Failed to book appointment.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-[20px] p-8 shadow-xl w-full max-w-md mx-auto relative z-20">
            <h3 className="text-2xl font-bold text-[#1B2559] mb-6">Appointment Form</h3>

            <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                        <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
                            Hospital <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                name="hospitalId"
                                value={form.hospitalId}
                                onChange={onChange}
                                className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 appearance-none focus:outline-none focus:border-[#0E82FD]"
                                required
                                disabled={loadingHospitals}
                            >
                                <option value="">{loadingHospitals ? 'Loading hospitals...' : 'Select hospital'}</option>
                                {hospitals.map((hospital) => (
                                    <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
                            Department <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                name="department"
                                value={form.department}
                                onChange={onChange}
                                className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 appearance-none focus:outline-none focus:border-[#0E82FD]"
                                required
                            >
                                <option value="">Select</option>
                                {departmentOptions.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
                            Services <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                name="service"
                                value={form.service}
                                onChange={onChange}
                                className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 appearance-none focus:outline-none focus:border-[#0E82FD]"
                                required
                            >
                                <option value="">Select</option>
                                {services.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
                        Doctors <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <select
                            name="doctorId"
                            value={form.doctorId}
                            onChange={onChange}
                            className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 appearance-none focus:outline-none focus:border-[#0E82FD]"
                            required
                            disabled={loadingDoctors || !form.hospitalId}
                        >
                            <option value="">
                                {!form.hospitalId ? 'Select hospital first' : loadingDoctors ? 'Loading doctors...' : 'Select'}
                            </option>
                            {filteredDoctors.map((d) => (
                                <option key={d.doctor_id || d.id} value={d.doctor_id || d.id}>
                                    {d.name}{d.department ? ` - ${d.department}` : ''}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    {!loadingDoctors && form.hospitalId && filteredDoctors.length === 0 ? (
                        <p className="text-xs text-amber-600">No doctors available for this hospital.</p>
                    ) : null}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
                            Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="date"
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={form.date}
                            onChange={onChange}
                            className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 focus:outline-none focus:border-[#0E82FD]"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
                            Time <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="time"
                            type="time"
                            step="60"
                            value={form.time}
                            onChange={onChange}
                            className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 focus:outline-none focus:border-[#0E82FD]"
                            required
                        />
                        <p className="text-[11px] text-gray-400">24-hour format (HH:MM)</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
                        Comments <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        name="comments"
                        rows="3"
                        value={form.comments}
                        onChange={onChange}
                        placeholder="Description"
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 focus:outline-none focus:border-[#0E82FD] resize-none"
                        required
                    ></textarea>
                </div>

                {message ? (
                    <p className={`text-sm ${message.toLowerCase().includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                        {message}
                    </p>
                ) : null}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
                >
                    {submitting ? 'Booking...' : 'Book an Appointment'}
                </button>
            </form>

            {showAuthPrompt ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <h4 className="text-lg font-semibold text-slate-900">Sign Up Required</h4>
                        <p className="mt-2 text-sm text-slate-600">
                            Please sign up first to book an appointment.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowAuthPrompt(false)}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/signup')}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                                Go to Sign Up
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default AppointmentForm;
