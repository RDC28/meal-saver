# MealSaver
**Rescue Surplus Food. Feed More People. Save Our Planet.**

MealSaver is a robust food-rescue platform that connects food businesses possessing surplus edible food with verified NGOs, shelters, and community kitchens. By leveraging real-time spatial queries and an automated matching engine, MealSaver coordinates fast pickups, validates secure handovers, and tracks social and environmental impact.

---

## Project Overview
MealSaver acts as a connection and logistics platform to eliminate food waste. It does not store food. Instead, it facilitates the matching of food donors with nearby verified receivers, coordinates the pickup or delivery process, tracks donation statuses, verifies the safe handover of food, and measures the resulting social and environmental impact.

**Core Users:**
- **Donors:** Restaurants, bakeries, cafes, caterers, supermarkets, vegetable vendors, and grocery surplus providers.
- **Receivers (NGOs):** Shelters, orphanages, community kitchens, animal shelters, and low-income feeding programs.
- **Admins:** Oversee donor and NGO verification, monitor donations, handle emergency manual matching, and track overall platform impact.
- **Delivery Partners:** Handle third-party logistics for pickups when NGOs cannot collect directly.

---

## Screenshots
*(Add your screenshots to the `public/images` folder and link them here)*
- ![Donor Dashboard](./public/images/donor-dashboard.png)
- ![Spatial Map Engine](./public/images/map-routing.png)
- ![Secure OTP Handover](./public/images/otp-verify.png)

---

## Technical Architecture

### Tech Stack
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui.
- **Authentication:** Clerk Authentication (with role-based metadata synchronization).
- **Database:** Supabase / Neon PostgreSQL (with postgis, uuid-ossp, and pg_trgm extensions enabled).
- **ORM:** Drizzle ORM.
- **Mapping & Data Visualization:** Leaflet Maps (react-leaflet) for spatial routing; Recharts for real-time impact analytics.

### Geospatial Matching Engine (PostGIS)
MealSaver relies on database-level spatial queries. The `donor_profiles` and `receiver_profiles` tables store geographic points using `GEOGRAPHY(POINT)`. The platform executes a `find_nearby_receivers` stored procedure via PostGIS to execute highly optimized proximity queries, filtering for NGOs that accept the specific food category and quantity, and pairing the donor with the nearest active, verified receiver.

### Secure Handover Verification (OTP)
To ensure accountability and prevent fraud, MealSaver utilizes a secure OTP workflow. When a donation is matched and a pickup is assigned, an OTP is generated and provided to the receiver. The receiver must present this OTP to the donor upon arrival, and the donor verifies it on their dashboard to complete the handover.

### Automated Impact Tracking
Upon successful delivery confirmation, MealSaver automatically generates an impact report. This tracks:
- Approximate meals saved.
- Total kilograms of food waste reduced.
- Estimated CO2 impact saved (calculated at an industry average of 2.5kg CO2 saved per 1kg of food rescued).

---

## Database Schema Highlights

MealSaver uses a relational schema designed for strict access control and geographic efficiency.

### Main Entities
- **users:** Public profile linked to Clerk authentication.
- **donor_profiles / receiver_profiles:** Detailed profiles containing business licenses (FSSAI/NGO registrations), capacity constraints, food preferences, and PostGIS location data.
- **donations:** Listings categorized by term (short_term for perishables vs. long_term for dry goods), food condition (cooked, raw, packaged), expiry timestamp, and quantity.
- **pickup_assignments & delivery_confirmations:** Tables coordinating the logistical state transitions and securely capturing handover verification PINs.
- **impact_reports:** Audit rows summarizing the environmental benefits and meal savings generated automatically upon delivery.
- **user_verifications:** Handles KYC document uploads (stored securely in Supabase Storage buckets) for admin review.

### System Workflow
1. **Upload:** A verified donor uploads a surplus donation (Title, Quantity, Expiry, Location).
2. **Matching:** The system evaluates the expiry time and triggers the geospatial match, notifying the closest compatible NGOs.
3. **Acceptance:** An NGO accepts the donation, which locks the listing. The status transitions from available to accepted, then to pickup_assigned.
4. **Coordination:** A secure handover OTP is generated.
5. **Pickup:** The receiver arrives and presents the OTP. The donor verifies the OTP to mark the food as picked up.
6. **Delivery Confirmation:** The receiver confirms delivery and reports the food's condition.
7. **Impact Generation:** The database automatically triggers the generation of an impact report, updating the donor's dashboard with the CO2 and meals saved.

---

## Project Structure

```text
mealsaver/
├── app/                  # Next.js App Router (pages & API endpoints)
│   ├── admin/            # Admin analytics, user verifications, emergency routing
│   ├── api/              # Route handlers (auth, donations, pickups, impact)
│   ├── donor/            # Donor dashboards, donation postings, history
│   ├── ngo/              # NGO dashboards, nearby finder, active pickups
│   ├── globals.css       # Global design tokens (Tailwind CSS v4 & custom variables)
│   └── layout.tsx        # Root entry and providers setup
├── components/           # Reusable UI widgets
│   ├── mealsaver/        # Brand-specific sidebars, maps, badges, status displays
│   └── ui/               # Base design system components (buttons, dialogs, inputs)
├── database/             # Raw SQL migrations, Drizzle schemas, seed files
├── hooks/                # Custom React hook utilities
├── lib/                  # Shared helper logic (matching, geocoding, client config)
├── public/               # Public assets and branding media
├── scripts/              # Automation and maintenance tasks
└── package.json          # Main package configuration
```

---

## Local Development Setup

### Prerequisite Services
1. **Supabase / Neon DB:** A PostgreSQL instance with the extensions postgis, uuid-ossp, and pg_trgm active.
2. **Clerk Auth:** An active project with email authentication enabled.
3. **Google Maps API Key:** For the frontend map search and interactive distance displays.

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/RDC28/meal-saver.git
cd meal-saver
npm install
```

### 2. Database Migration & Schema Setup
Execute the SQL scripts in the following order inside your Supabase SQL Editor:
1. `database/schema.sql` (Tables, Triggers, and Enums)
2. `database/rls_policies.sql` (Security Rules)
3. `database/functions.sql` (Spatial Matching, OTP Generation, and Impact Triggers)
4. `database/seed.sql` (Optional: Load mock testing profiles and logs)

### 3. Environment Configuration
Create a `.env.local` file in your root folder:
```env
# Clerk Authentication Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_pub_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase API Settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_secret_service_role_key

# Database Connection (for Drizzle migrations)
DATABASE_URL=postgresql://postgres:password@localhost:5432/mealsaver

# Map Integration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### 4. Running the Development Server
Launch the compiler and live-reload system:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser to view the application.

---

## Contributors
![Contributors Graph](https://contrib.rocks/image?repo=RDC28/meal-saver)

---

## License
Distributed under the MIT License. See `LICENSE` for more information.
