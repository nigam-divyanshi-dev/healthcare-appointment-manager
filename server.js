const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Store
const db = {
    doctors: [
        { id: 1, name: "Dr. Sarah Adams", specialisation: "Cardiology", workingHours: "09:00 - 17:00", leaveDays: [] },
        { id: 2, name: "Dr. John Doe", specialisation: "Dermatology", workingHours: "10:00 - 16:00", leaveDays: [] },
        { id: 3, name: "Dr. Emily Smith", specialisation: "General Medicine", workingHours: "08:00 - 14:00", leaveDays: [] }
    ],
    appointments: [],
    slotHolds: new Set()
};

// Rule-Based Summary Generators
function generatePreVisitSummary(symptoms) {
    const text = (symptoms || "").toLowerCase();
    let urgency = "Low";
    if (text.includes("chest pain") || text.includes("shortness of breath") || text.includes("severe bleeding")) {
        urgency = "High";
    } else if (text.includes("fever") || text.includes("migraine") || text.includes("pain")) {
        urgency = "Medium";
    }
    return {
        urgencyLevel: urgency,
        chiefComplaint: symptoms,
        suggestedQuestions: [
            "When did these symptoms first appear?",
            "Are you currently taking any over-the-counter or prescribed medications?",
            "Have you experienced any previous episodes of this condition?"
        ]
    };
}

function generatePostVisitSummary(notes, prescription) {
    return {
        clinicalSummary: `Doctor's Clinical Assessment: ${notes}`,
        medicationSchedule: prescription || "Take medications as directed on packaging.",
        followUpSteps: "Schedule a follow-up consultation in 7 days if symptoms persist."
    };
}

// API Routes
app.get('/api/doctors', (req, res) => {
    res.json({ success: true, data: db.doctors });
});

app.get('/api/appointments', (req, res) => {
    res.json({ success: true, data: db.appointments });
});

app.post('/api/appointments/book', (req, res) => {
    const { patientName, doctorId, startTime, symptoms } = req.body;
    const docId = parseInt(doctorId);
    const lockKey = `${docId}_${startTime}`;

    if (!patientName || !docId || !startTime || !symptoms) {
        return res.status(400).json({ error: "All booking fields are required." });
    }

    // Check doctor leave
    const doctor = db.doctors.find(d => d.id === docId);
    if (doctor && doctor.leaveDays.includes(startTime.split('T')[0])) {
        return res.status(400).json({ error: "The doctor is on leave on this date." });
    }

    // Check slot hold and double-booking
    if (db.slotHolds.has(lockKey)) {
        return res.status(409).json({ error: "This slot is currently on hold. Try again shortly." });
    }

    const existing = db.appointments.find(a => a.doctorId === docId && a.startTime === startTime && a.status === 'CONFIRMED');
    if (existing) {
        return res.status(409).json({ error: "This time slot is already booked." });
    }

    db.slotHolds.add(lockKey);

    try {
        const preVisit = generatePreVisitSummary(symptoms);
        const newAppointment = {
            id: `APT-${Date.now().toString().slice(-4)}`,
            patientName,
            doctorId: docId,
            doctorName: doctor ? doctor.name : "Doctor",
            startTime,
            symptoms,
            preVisitSummary: preVisit,
            postVisitNotes: null,
            postVisitSummary: null,
            status: "CONFIRMED",
            createdAt: new Date().toISOString()
        };

        db.appointments.push(newAppointment);
        db.slotHolds.delete(lockKey);
        res.status(201).json({ success: true, data: newAppointment });
    } catch (err) {
        db.slotHolds.delete(lockKey);
        res.status(500).json({ error: "Server error during booking." });
    }
});

app.post('/api/appointments/:id/notes', (req, res) => {
    const { notes, prescription } = req.body;
    const appointment = db.appointments.find(a => a.id === req.params.id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found." });

    appointment.postVisitNotes = notes;
    appointment.postVisitSummary = generatePostVisitSummary(notes, prescription);
    res.json({ success: true, data: appointment });
});

app.post('/api/admin/leave', (req, res) => {
    const { doctorId, date } = req.body;
    const docId = parseInt(doctorId);
    const doctor = db.doctors.find(d => d.id === docId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found." });

    if (!doctor.leaveDays.includes(date)) doctor.leaveDays.push(date);

    let cancelledCount = 0;
    db.appointments.forEach(a => {
        if (a.doctorId === docId && a.startTime.startsWith(date) && a.status === 'CONFIRMED') {
            a.status = 'CANCELLED';
            cancelledCount++;
        }
    });

    res.json({ success: true, message: `Leave applied. ${cancelledCount} appointments cancelled and notified.` });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`App is running on http://localhost:${PORT}`));