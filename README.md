# My Pay By Day

A full-stack web application to manage and track daily pay records.

## Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite
- React Router DOM
- TanStack Query
- Zustand
- React Hook Form + Zod
- Lucide React

**Backend**
- Quarkus 3.32.1
- Java 25
- Maven

## Project Structure

```
my-pay-by-day/
├── frontend/   # React + Vite application
└── mypaybyday/ # Quarkus backend
```

## Getting Started

### Backend

```bash
cd mypaybyday
./mvnw quarkus:dev
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the frontend dev server |
| `pnpm build` | Build the frontend for production |
| `pnpm lint` | Lint the frontend code |
| `./mvnw quarkus:dev` | Start the backend in dev mode |
| `./mvnw test` | Run backend tests |
