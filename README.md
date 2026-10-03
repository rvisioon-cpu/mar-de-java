# Showroom Virtual Template

A high-performance, data-driven Next.js template for creating virtual real estate showrooms. Designed for a "clone-and-fill" workflow, this template allows you to deploy a new project in minutes by simply updating data files and assets.

## 🚀 Getting Started

### 1. Initialization

Follow these steps to set up the project for the first time:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pluska/showroom-template.git your-project-name
   cd your-project-name
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Copy the example environment file and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```
   *Note: Ensure you set at least `NEXTAUTH_SECRET`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, and `NEXT_PUBLIC_ASSET_BASE_URL`.*

   For Cloudflare Pages production, configure `MAPBOX_ACCESS_TOKEN` as an encrypted secret. The map loads this runtime value from `/api/map-config`.

4. **Initialize Database:**
   This project uses Cloudflare D1. Initialize your local database with migrations and seed data:
   ```bash
   # Generate migrations from schema
   npm run db:generate

   # Apply migrations to local D1 instance
   npm run db:migrate

   # (Optional) Seed the database with initial data
   npm run db:seed
   ```

### 2. Running Locally

Once initialized, you can run the project in development mode:

**Standard Next.js Development:**
```bash
npm run dev
```

**Cloudflare Pages Environment (Recommended for D1/R2 features):**
```bash
npm run dev:pages
```
The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Documentation

- [**CLONE_AND_FILL.md**](./CLONE_AND_FILL.md): Detailed step-by-step setup guide.
- [**STRUCTURE.md**](./STRUCTURE.md): Overview of the project architecture and file organization.
- [**RULES_AI.md**](./RULES_AI.md): Essential rules for AI coding assistants to maintain template integrity.

## ✨ Key Features

- **360° Scene Controller**: Smooth transitions between building faces with background video support.
- **Interactive Floor Plans**: SVG-based unit highlighting and status management.
- **Virtual Tours Integration**: Seamless embedding of Matterport or similar 360° tours.
- **Dynamic Map**: Custom Mapbox integration with route calculation.
- **Mobile First**: Fully responsive design optimized for mobile showroom experiences.

## 🛠 Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS
- **Animations**: GSAP (GreenSock)
- **State Management**: Zustand
- **Maps**: React Map GL (Mapbox)
- **Icons**: Lucide React
