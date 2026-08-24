# 🏥 Healthcare Appointment & Follow-up Manager

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![Render](https://img.shields.io/badge/Deployed_on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

**Live Deployment URL:** [https://healthcare-appointment-manager-api-5x1u.onrender.com](https://healthcare-appointment-manager-api-5x1u.onrender.com)
**Submitted By:** Divyanshi Nigam| Reg No: 23BCE10898 | VIT Bhopal University

---


## 📌 Project Overview
The Healthcare Appointment & Follow-up Manager is a full-stack web application designed to streamline clinic operations. Moving beyond basic booking forms, this platform provides intelligent triage, automated clinical summaries, and robust concurrency controls to ensure seamless coordination between patients, doctors, and clinic administrators.

## 🚀 Setup & Execution Guide

### Prerequisites
* Node.js installed locally.
* A terminal or command prompt.

### Local Installation
1. Clone or extract the source code repository.
2. Open your terminal in the project root folder.
3. Install the required dependencies:
   ```bash
   npm install
---

## ✨ Core Features by Role

### 🧑‍⚕️ Patient Portal
* **Intelligent Booking:** Search for doctors by specialization and view available slots.
* **Pre-visit Symptom Analysis:** Patients submit their symptoms during booking, which the system analyzes to generate a clinical urgency level and suggested diagnostic questions.

### 🩺 Doctor Portal
* **Smart Dashboard:** View upcoming appointments augmented with AI-generated pre-visit summaries.
* **Post-Visit Automation:** Doctors input raw clinical notes and prescriptions, which the system converts into patient-friendly summaries and follow-up steps.

### 🛡️ Admin Portal
* **Leave Management:** Administrators can mark doctors as unavailable for specific dates.
* **Automated Conflict Resolution:** The system automatically identifies conflicting appointments, cancels them, and triggers notification workflows.

---

## 🏗️ System Design & Architecture

This project was built to address complex backend challenges, specifically focusing on the evaluation criteria of slot conflicts, notification reliability, and AI integration.

### 1. Double-Booking Prevention (Slot Hold Mechanism)
To guarantee data integrity during high-traffic booking windows, the system utilizes an atomic lock pattern. 
* When a booking request fires, a unique identifier (`doctorId_startTime`) is pushed to an active lock `Set`.
* Concurrent requests attempting to claim the exact same slot receive an immediate HTTP 409 Conflict rejection.
* Once the primary transaction is safely committed to the database, the lock is released.

### 2. Leave Conflict Handling & Reconciliation
When an admin marks a doctor on leave, a reconciliation pipeline is triggered:
* The system executes a sweep of all `CONFIRMED` appointments for that doctor on the target date.
* Affected appointments are forcefully transitioned to a `CANCELLED` state.
* The system invokes an asynchronous notification queue to dispatch email alerts and remove Google Calendar blocks.

### 3. Notification Reliability (Background Jobs)
Network requests to external APIs (SendGrid, Google Calendar) are inherently volatile. To prevent these external failures from breaking the core API response, notifications are decoupled from the main thread. They are processed as simulated background events, representing a microservice architecture where tasks are pushed to a message broker (e.g., Redis/BullMQ) with exponential backoff.

### 4. LLM Integration & Graceful Fallbacks
The system dictates precise prompt engineering to extract targeted clinical data:
* **Pre-visit:** *"Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions..."*
* **Post-visit:** *"Convert these clinical notes into a patient-friendly summary with medication schedule..."*
**Resilience:** The AI integration is wrapped in a strict `try-catch` block. If rate limits are exceeded, a rule-based Natural Language parser takes over to categorize keywords (e.g., "chest pain" -> High Urgency), ensuring the platform remains 100% operational offline.

---

## 📖 API Documentation

### `POST /api/appointments/book`
Creates a new patient appointment and holds the time slot.
* **Request Body:**
  ```json
  {
    "patientName": "Jane Doe",
    "doctorId": "1",
    "startTime": "2026-08-25T10:00",
    "symptoms": "Severe headache and mild fever for 2 days."
  }

## 🗄️ Database Schema
While currently using an in-memory store for immediate deployment, the relational schema is designed as follows:
* **Users:** `id` (PK), `name`, `role` (ENUM), `email`
* **DoctorProfiles:** `id` (PK), `doctorId` (FK -> Users), `specialisation`, `workingHours`, `slotDuration`, `leaveDays` (Array)
* **Appointments:** `id` (PK), `patientId` (FK), `doctorId` (FK), `startTime` (DateTime), `symptoms` (Text), `preVisitSummary` (JSON), `postVisitNotes` (Text), `postVisitSummary` (JSON), `status` (ENUM)

## 🤖 LLM Prompts
The following prompts are engineered to extract structured clinical data:
1. **Pre-visit Summary:** "Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>"
2. **Post-visit Summary:** "Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>"

## 📅 Google Calendar Setup Steps
To enable the calendar integration in a production environment:
1. Navigate to the Google Cloud Console and create a new project.
2. Enable the **Google Calendar API** in the API Library.
3. Configure the OAuth Consent Screen (External or Internal).
4. Go to Credentials > Create Credentials > OAuth client ID (Web application).
5. Add your server's URL to "Authorized redirect URIs".
6. Copy the generated `Client ID` and `Client Secret` into your `.env` file.
