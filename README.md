# One Way Out Portal

A comprehensive Next.js application for managing your personal finances, tracking expenses, managing debts, and achieving financial freedom — built for the One Way Out Portal.

## Features

### 🏠 Dashboard
- Overview of your financial health
- Monthly income, expenses, and debt tracking
- Savings rate visualization
- Real-time financial insights and warnings

### 💰 Expense Management
- Add and track expenses with categories
- View expenses by category
- Filter and sort expenses
- Monthly expense summaries

### 💳 Debt Management
- Track multiple debts (credit cards, loans, mortgages)
- Monitor interest rates and minimum payments
- Record payments and track progress
- Visual progress indicators

### 👤 Profile Management
- Personal information management
- Monthly income tracking
- Savings goals setting

### 💡 Financial Insights
- Personalized financial tips and advice
- Budgeting recommendations
- Debt management strategies
- Savings guidance

### 🔐 Authentication
- **Mobile number (primary)** — WhatsApp OTP sign-in via Twilio
- **Email/password (fallback)** — traditional sign-in and registration
- Google OAuth login (optional, requires setup)
- Secure session management via Supabase Auth
- Unique mobile number per account

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Modern styling
- **Lucide React** - Beautiful icons
- **date-fns** - Date formatting utilities
- **@react-oauth/google** - Google OAuth integration
- **Supabase** - Auth, database, and data persistence

- **Twilio** - WhatsApp OTP delivery
- **Nodemailer** - App-level transactional email (SMTP)

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in values:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for OTP verify and admin APIs |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender (e.g. `whatsapp:+14155238886`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | App SMTP for coach welcome and appointment emails |
| `COACH_SETUP_EMAIL_MODE` | `supabase`, `smtp`, or `both` (default: `both`) |

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. **Set up Supabase** (required for auth and data):
   - Create a project at [supabase.com](https://supabase.com)
   - In the Supabase dashboard, go to **SQL Editor** and run the migration in `supabase/migrations/20250217000000_initial_schema.sql`
   - Run all migrations in `supabase/migrations/` (including `20260706000000_phone_unique_and_otp.sql`)
   - Go to **Project Settings** → **API** and copy the project URL, anon key, and service role key
   - Copy `.env.local.example` to `.env.local` and set Supabase variables

3. **WhatsApp OTP (Twilio)**:
   - Create a [Twilio](https://www.twilio.com/) account and enable WhatsApp (sandbox for dev, or approved business template for production)
   - Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` in `.env.local`
   - For sandbox: join the sandbox from your phone and use the sandbox WhatsApp number as `TWILIO_WHATSAPP_FROM`

4. **SMTP (two layers)**:
   - **Supabase auth emails** (password reset): Supabase Dashboard → **Authentication** → **Email** → enable **Custom SMTP** and enter your SMTP credentials
   - **App transactional emails** (coach welcome, appointment confirmations): set `SMTP_*` variables in `.env.local`

5. **Supabase phone auth**:
   - Dashboard → **Authentication** → **Providers** → enable **Phone**
   - This allows phone-based users in `auth.users`; OTP delivery is handled by this app via Twilio WhatsApp

6. (Optional) Set up Google OAuth:
   - Create a `.env.local` file in the root directory
   - Get your Google OAuth Client ID from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Add the following to `.env.local`:
     ```
     NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
     ```
   - **Steps to get Google Client ID:**
     1. Go to [Google Cloud Console](https://console.cloud.google.com/)
     2. Create a new project or select an existing one
     3. Enable Google+ API
     4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
     5. Choose "Web application"
     6. Add authorized JavaScript origins: `http://localhost:3000` (for development)
     7. Add authorized redirect URIs: `http://localhost:3000` (for development)
     8. Copy the Client ID and add it to `.env.local`
   - **Note:** Google login will only appear if the Client ID is configured. The app works fine without it using email/password authentication.

7. Run the development server:
```bash
npm run dev
```

8. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
onewayout/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Dashboard
│   ├── expenses/          # Expenses page
│   ├── debts/            # Debts page
│   ├── profile/          # Profile page
│   └── insights/         # Financial insights page
├── components/            # React components
│   ├── Dashboard.tsx
│   ├── ExpenseList.tsx
│   ├── DebtList.tsx
│   ├── ProfileForm.tsx
│   ├── FinancialInsights.tsx
│   └── Navigation.tsx
├── lib/                  # Utility functions
│   ├── storage.ts        # Supabase-backed data layer
│   └── supabase.ts       # Supabase client
├── supabase/
│   └── migrations/       # SQL schema and RLS
└── types/                # TypeScript type definitions
    └── index.ts
```

## Data Storage

The app uses **Supabase** for authentication and data. User accounts, profiles, expenses, debts, assets, daily moods, and onboarding data are stored in Supabase with row-level security so each user only sees their own data. Set up a Supabase project and run the migration (see Getting Started) before using the app.

## Features in Detail

### Expense Categories
- Food & Dining
- Transportation
- Shopping
- Bills & Utilities
- Entertainment
- Healthcare
- Education
- Other

### Debt Types
- Credit Card
- Loan
- Mortgage
- Other

## Future Enhancements

Potential features for future versions:
- Export data to CSV/PDF
- Charts and visualizations
- Budget planning tools
- Recurring expense tracking
- Financial goal tracking
- Multi-currency support
- Cloud sync (optional)

## License

This project is open source and available for personal use.
