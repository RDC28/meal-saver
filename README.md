# MealSaver

MealSaver is a food-rescue platform that connects food donors with verified NGOs, shelters, community kitchens, orphanages, and feeding programs through a fast pickup and redistribution system.

The platform helps reduce food waste by allowing restaurants, bakeries, cafes, caterers, supermarkets, vegetable vendors, and other donors to upload surplus food or raw materials. MealSaver then matches the donation with the nearest suitable verified receiver and coordinates pickup or delivery.

> Donor uploads surplus → MealSaver finds nearest verified NGO → pickup assigned → delivery completed → waste reduced.

---

## Project Purpose

Every day, restaurants, cafes, bakeries, caterers, supermarkets, and individuals may have extra food that can still be safely used. At the same time, NGOs and community kitchens need regular food support.

MealSaver solves this gap by acting as a **connection and logistics platform**.

MealSaver does **not** store food in the initial version.  
MealSaver only helps with:

- Matching donors with nearby verified receivers
- Coordinating pickup or delivery
- Tracking donation status
- Verifying pickup and delivery
- Measuring social and environmental impact

---

## Core Users

### 1. Donors

Food donors can be:

- Restaurants
- Bakeries
- Cafes
- Caterers
- Supermarkets
- Vegetable vendors
- Individuals with packed or leftover food
- Grocery surplus providers

### 2. Receivers

Receivers can be:

- NGOs
- Shelters
- Orphanages
- Community kitchens
- Animal shelters
- Low-income feeding programs

In the first version, MealSaver should focus on verified organizations only, not random direct individual receivers.

### 3. Admin Team

Admins manage:

- Donor verification
- NGO verification
- Donation monitoring
- Manual matching
- Emergency handling
- Reports and impact tracking

---

## MVP Scope

The first version of MealSaver should focus on one local area or city zone.

Recommended MVP:

```txt
Restaurants / bakeries / cafes
        ↓
Upload surplus food
        ↓
Nearby verified NGO gets notified
        ↓
NGO accepts donation
        ↓
Pickup assigned
        ↓
Pickup verified
        ↓
Receiver confirms delivery
        ↓
Impact is tracked
```

---

## Key Features

### Donor Features

* Donor registration and login
* Business profile setup
* Upload food donation
* Add food type
* Add quantity
* Add veg / non-veg status
* Add cooked / raw / packaged status
* Add preparation time
* Add expiry or safe usage time
* Add pickup address
* Upload food image
* Track donation status
* View donation history
* View impact report

### Receiver / NGO Features

* NGO registration and login
* Organization profile setup
* Add service area
* Add storage capability
* Add contact details
* View nearby available donations
* Accept or reject donations
* Confirm pickup
* Confirm delivery condition
* View received donation history

### Admin Features

* Verify donors
* Verify NGOs
* View all donations
* Approve or reject users
* Manually assign donations
* Monitor active pickups
* Track expired donations
* Handle emergency fallback
* Generate impact reports

---

## Food Categories

MealSaver should divide food into two major categories.

### Short-Term Food

Time-sensitive food that needs fast pickup.

Examples:

* Cooked food
* Bakery items
* Cut vegetables
* Fresh prepared meals

Rules:

* Must be fresh
* Must be properly packed
* Must be picked up quickly
* Should ideally be delivered within 30–60 minutes

### Long-Term Food

Food that can survive longer and may be easier to manage.

Examples:

* Rice bags
* Atta
* Packaged food
* Onions
* Potatoes
* Dry groceries

---

## Donation Upload Fields

Each donation should include:

* Food title
* Food category
* Food type
* Quantity
* Veg / non-veg
* Cooked / raw / packaged
* Preparation time
* Expiry or safe usage time
* Pickup address
* Pickup instructions
* Food image
* Donor contact number
* Preferred pickup time

---

## Smart Matching Logic

MealSaver should match donations based on:

* Nearest verified receiver
* Urgency
* Food quantity
* Receiver storage capability
* Food compatibility
* Pickup availability

Basic matching priority:

```txt
1. Food safety
2. Distance
3. Urgency
4. Receiver capacity
5. Receiver reliability
```

Example:

```txt
Donation uploaded
        ↓
System checks food type, quantity, expiry, and location
        ↓
System finds nearby verified NGOs
        ↓
Nearest suitable NGOs are notified
        ↓
First accepted NGO gets locked
```

---

## Operational Flow

```txt
1. Donor uploads food donation

2. System checks:
   - food type
   - quantity
   - preparation time
   - expiry time
   - location

3. Nearby verified NGOs are notified

4. NGO accepts or rejects the donation

5. Once accepted:
   - donation gets reserved
   - other NGOs cannot claim it

6. Pickup is assigned:
   - NGO pickup
   - donor drop-off
   - third-party delivery partner

7. Pickup verification:
   - food checked visually
   - quantity confirmed
   - pickup marked complete
   - optional OTP verification

8. Delivery confirmation:
   - receiver confirms received
   - quantity confirmed
   - food condition confirmed

9. Impact tracking:
   - meals saved
   - food waste reduced
   - CO2 impact estimated
   - donation history updated
```

---

## Emergency Handling

If no NGO accepts a donation:

```txt
Donation remains pending
        ↓
Nearby backup NGOs are notified
        ↓
If still no acceptance, donation expires
        ↓
Donor is informed
```

Expired donations should not be redistributed through the platform.

---

## Revenue Model Ideas

MealSaver should not depend only on NGOs paying.

Possible revenue sources:

### 1. CSR Sponsorships

Companies sponsor pickups, delivery, or monthly impact campaigns.

Example:

```txt
ABC Company sponsors 1,000 rescued meals this month.
```

### 2. Donor Pickup Fee

Restaurants or food businesses pay a small convenience or logistics fee.

Example:

```txt
₹30–₹100 per pickup
```

### 3. Monthly Donor Plans

For regular donors:

```txt
Basic Plan
Pro Plan
Impact Partner Plan
```

### 4. Impact Reports

Paid verified impact reports for donors, sponsors, or CSR partners.

---

## Tech Stack

MealSaver will use the PERN stack.

```txt
P - PostgreSQL
E - Express.js
R - React.js
N - Node.js
```

---

## Recommended Architecture

```txt
mealsaver/
├── client/              # React frontend
├── server/              # Node.js + Express backend
├── database/            # SQL migrations, schema, seed data
├── docs/                # Project planning and documentation
├── shared/              # Shared constants, types, validation schemas
├── .env.example
├── README.md
└── package.json
```

---

## Frontend

Recommended frontend:

```txt
React + Vite
Tailwind CSS
React Router
Axios / TanStack Query
React Hook Form
Zod
```

Main frontend pages:

```txt
/
├── Landing Page
├── Login
├── Register
├── Donor Dashboard
├── NGO Dashboard
├── Admin Dashboard
├── Create Donation
├── Donation Details
├── Active Pickups
├── Impact Report
└── Profile Settings
```

---

## Backend

Recommended backend:

```txt
Node.js
Express.js
PostgreSQL
Prisma or node-postgres
JWT authentication
Multer / Cloudinary for image uploads
Google Maps API for distance calculation
```

Main backend modules:

```txt
server/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   └── app.js
└── package.json
```

---

## Database Tables

Suggested main tables:

```txt
users
donor_profiles
receiver_profiles
donations
donation_images
pickup_assignments
delivery_confirmations
impact_reports
notifications
user_verifications
admin_actions
```

---

## Main Database Entities

### users

Stores login and role information.

Roles:

```txt
donor
receiver
admin
delivery_partner
```

### donor_profiles

Stores donor business details.

Fields:

```txt
business_name
business_type
phone_number
address
latitude
longitude
food_license_number
verification_status
```

### receiver_profiles

Stores NGO or receiver organization details.

Fields:

```txt
organization_name
organization_type
service_area
storage_capability
phone_number
address
latitude
longitude
verification_status
```

### donations

Stores donation details.

Fields:

```txt
donor_id
title
food_type
category
quantity
veg_status
food_condition
preparation_time
expiry_time
pickup_address
status
```

Donation statuses:

```txt
available
pending_acceptance
accepted
pickup_assigned
picked_up
delivered
expired
cancelled
rejected
unsafe
```

### pickup_assignments

Stores pickup details.

Fields:

```txt
donation_id
receiver_id
pickup_type
assigned_to
pickup_status
pickup_time
otp_code
```

### impact_reports

Stores donation impact.

Fields:

```txt
donation_id
meals_saved
food_waste_reduced_kg
co2_impact_kg
receiver_confirmed
donor_report_generated
```

---

## API Routes

### Auth Routes

```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

### Donor Routes

```txt
POST /api/donors/profile
GET  /api/donors/profile
PUT  /api/donors/profile
GET  /api/donors/donations
```

### Receiver Routes

```txt
POST /api/receivers/profile
GET  /api/receivers/profile
PUT  /api/receivers/profile
GET  /api/receivers/nearby-donations
```

### Donation Routes

```txt
POST /api/donations
GET  /api/donations
GET  /api/donations/:id
PUT  /api/donations/:id
DELETE /api/donations/:id
POST /api/donations/:id/accept
POST /api/donations/:id/reject
POST /api/donations/:id/expire
```

### Pickup Routes

```txt
POST /api/pickups/:donationId/assign
POST /api/pickups/:pickupId/verify
POST /api/pickups/:pickupId/complete
```

### Delivery Routes

```txt
POST /api/deliveries/:pickupId/confirm
```

### Admin Routes

```txt
GET  /api/admin/users
POST /api/admin/users/:id/verify
GET  /api/admin/donations
GET  /api/admin/reports
POST /api/admin/donations/:id/manual-assign
```

---

## Matching Algorithm V1

Simple version:

```js
function matchDonation(donation, receivers) {
  return receivers
    .filter(receiver => receiver.verificationStatus === "verified")
    .filter(receiver => receiver.canAcceptFoodType(donation.foodType))
    .filter(receiver => receiver.hasCapacityFor(donation.quantity))
    .map(receiver => ({
      receiver,
      distance: calculateDistance(donation.location, receiver.location),
      urgencyScore: calculateUrgency(donation.expiryTime),
    }))
    .sort((a, b) => a.distance - b.distance);
}
```

V1 should prioritize nearest verified receivers first.

---

## Brand Colors

```txt
Primary Green:      #2E7D32
Deep Trust Green:   #1B5E20
Fresh Mint:         #E8F5E9
Warm Food Orange:   #F59E0B
Soft Cream:         #FFF8E1
Light Background:   #FAFAF7
Charcoal Text:      #263238
Success Green:      #43A047
Warning Amber:      #F9A825
Error Red:          #D32F2F
```

Recommended usage:

```txt
70% White / Cream
20% Green
10% Orange
```

---

## Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/rdc28/mealsaver.git
cd mealsaver
```

### 2. Install root dependencies

```bash
npm install
```

### 3. Install client dependencies

```bash
cd client
npm install
```

### 4. Install server dependencies

```bash
cd ../server
npm install
```

### 5. Create environment file

Create a `.env` file inside `server/`.

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/mealsaver
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173

GOOGLE_MAPS_API_KEY=your_google_maps_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

### 6. Start PostgreSQL

Create a local PostgreSQL database:

```bash
createdb mealsaver
```

### 7. Run server

```bash
cd server
npm run dev
```

### 8. Run client

```bash
cd client
npm run dev
```

---

## Development Scripts

Root scripts can be configured like this:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "client": "npm run dev --prefix client",
    "server": "npm run dev --prefix server"
  }
}
```

---

## MVP Development Roadmap

### Phase 1: Foundation

* Project setup
* Database schema
* Authentication
* User roles
* Donor profile
* Receiver profile
* Admin login

### Phase 2: Donation Flow

* Create donation
* Upload food image
* List available donations
* Accept / reject donation
* Donation status tracking

### Phase 3: Matching System

* Location storage
* Nearby receiver matching
* Urgency calculation
* Receiver notification

### Phase 4: Pickup & Delivery

* Pickup assignment
* Pickup verification
* OTP verification
* Delivery confirmation

### Phase 5: Admin & Impact

* Admin dashboard
* User verification
* Manual assignment
* Impact report
* Donation history

### Phase 6: Future Features

* AI freshness prediction
* Route optimization
* Cold chain partner support
* CSR dashboard
* Carbon credit estimation
* Mobile app / PWA

---

## Future Mobile App Plan

MealSaver can start as a responsive PERN web app and later become a mobile app.

Recommended path:

```txt
PERN Web App
        ↓
Responsive PWA
        ↓
React Native / Expo Mobile App
```

The backend API and PostgreSQL database can remain the same.

---

## Important Product Rules

* MealSaver should not store food in the first version.
* Only verified NGOs and receivers should accept donations.
* Cooked food should be time-sensitive and expire quickly.
* Unsafe or expired food should not be redistributed.
* NGO payment should not be the main model.
* CSR sponsorship and donor convenience fees are better revenue options.
* Admin control is necessary in the MVP.
* Manual operations are acceptable in the early stage.

---

## One-Line Pitch

MealSaver helps food businesses rescue surplus food by connecting them with verified NGOs through fast pickup, safe delivery, and measurable impact tracking.

---

## License

This project is currently private and under development.
