# Kenya Airways Online Ticketing System — Implementation Documentation

> **Stack:** Next.js 16 · Prisma v7 · PostgreSQL · Socket.IO (standalone server) · Tailwind CSS · NextAuth.js

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Repository Structure](#3-repository-structure)
4. [Environment Setup](#4-environment-setup)
5. [Database Schema (Prisma)](#5-database-schema-prisma)
6. [Next.js App Structure & Routing](#6-nextjs-app-structure--routing)
7. [API Routes Reference](#7-api-routes-reference)
8. [Socket.IO Server](#8-socketio-server)
9. [Authentication](#9-authentication)
10. [Core Feature Implementation](#10-core-feature-implementation)
    - 10.1 [Booking Management](#101-booking-management)
    - 10.2 [Passenger Management](#102-passenger-management)
    - 10.3 [Seat Capacity & Availability](#103-seat-capacity--availability)
    - 10.4 [Employee–Flight Assignment](#104-employeeflight-assignment)
    - 10.5 [Reports (Ticket & Match)](#105-reports-ticket--match)
    - 10.6 [Online Help Section](#106-online-help-section)
11. [HCI & UI/UX Guidelines](#11-hci--uiux-guidelines)
12. [Usability Evaluation Plan](#12-usability-evaluation-plan)
13. [Key Component Blueprints](#13-key-component-blueprints)
14. [State Management](#14-state-management)
15. [Error Handling Strategy](#15-error-handling-strategy)
16. [Deployment](#16-deployment)
17. [Implementation Checklist](#17-implementation-checklist)

---

## 1. Project Overview

**System Name:** Kenya Airways Online Ticketing & Booking System
**Client:** Kenya Airways (KQ)
**Purpose:** A web-based platform that allows passengers to search, book, modify, and cancel flights across three fare classes, while enabling airline staff to manage passengers, match crew to flights, and generate operational reports.

### Primary Goals

| Goal                 | Description                                                           |
| -------------------- | --------------------------------------------------------------------- |
| Booking & Processing | Full CRUD lifecycle for flight bookings                               |
| Class Management     | Executive (A), Middle (B), Low Class (C) with real-time seat tracking |
| Capacity Awareness   | Auto-advise next available slot when class is full                    |
| Staff Operations     | Employee–flight matching, report generation                           |
| Guided Experience    | Contextual help system throughout the UI                              |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  CLIENT (Browser)                   │
│   Next.js 16 App Router · React · Tailwind CSS     │
│   Socket.IO Client · React Query / SWR             │
└───────────────┬───────────────────┬─────────────────┘
                │  HTTP (REST/RSC)  │  WebSocket
                ▼                   ▼
┌──────────────────────┐   ┌───────────────────────┐
│  Next.js 16 Server   │   │  Socket.IO Server     │
│  - App Router        │   │  (Node.js standalone) │
│  - Route Handlers    │   │  Port: 3001           │
│  - Server Actions    │   │  Events: seat-update  │
│  - NextAuth.js       │   │         booking-change│
└──────────┬───────────┘   └───────────────────────┘
           │
           ▼
┌──────────────────────┐
│  Prisma v7 ORM       │
│  PostgreSQL DB       │
└──────────────────────┘
```

### Why a Separate Socket.IO Server?

Next.js 16 uses the Edge / Node runtime with no persistent TCP connections. The Socket.IO server runs as a **separate Node.js process** (e.g., `server/socket-server.ts`) and communicates seat/booking updates to all connected clients in real time. The Next.js API layer publishes events to Socket.IO via a shared Redis adapter or direct HTTP emit endpoint.

---

## 3. Repository Structure

```
kenya-airways/
├── app/                          # Next.js 16 App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard home
│   │   ├── bookings/
│   │   │   ├── page.tsx          # List bookings
│   │   │   ├── new/page.tsx      # Add booking
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Booking detail/inquiry
│   │   │       └── edit/page.tsx # Change booking
│   │   ├── passengers/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   ├── flights/
│   │   │   ├── page.tsx
│   │   │   └── [id]/seats/page.tsx  # Seat map per class
│   │   ├── staff/
│   │   │   ├── page.tsx          # Employee list
│   │   │   └── assignments/page.tsx # Match employee to opening
│   │   ├── reports/
│   │   │   ├── tickets/page.tsx
│   │   │   └── matches/page.tsx
│   │   └── help/
│   │       └── page.tsx          # Online Help section
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── bookings/
│   │   │   ├── route.ts          # GET list, POST create
│   │   │   └── [id]/route.ts     # GET, PUT, DELETE
│   │   ├── passengers/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── flights/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── availability/route.ts
│   │   ├── staff/
│   │   │   ├── route.ts
│   │   │   └── assignments/route.ts
│   │   └── reports/
│   │       ├── tickets/route.ts
│   │       └── matches/route.ts
│   ├── globals.css
│   └── layout.tsx
│
├── components/
│   ├── ui/                       # Reusable primitives (Button, Input, Modal…)
│   ├── bookings/
│   │   ├── BookingForm.tsx
│   │   ├── BookingTable.tsx
│   │   └── BookingInquiry.tsx
│   ├── passengers/
│   │   ├── PassengerForm.tsx
│   │   └── PassengerTable.tsx
│   ├── flights/
│   │   ├── FlightSearch.tsx
│   │   ├── SeatMap.tsx
│   │   └── ClassCapacityBadge.tsx
│   ├── reports/
│   │   ├── TicketReport.tsx
│   │   └── MatchReport.tsx
│   ├── help/
│   │   ├── HelpPanel.tsx
│   │   └── HelpTooltip.tsx
│   └── layout/
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
│
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   ├── auth.ts                   # NextAuth config
│   ├── socket-client.ts          # Socket.IO client hook
│   ├── validations/              # Zod schemas
│   │   ├── booking.ts
│   │   ├── passenger.ts
│   │   └── flight.ts
│   └── utils.ts
│
├── server/
│   └── socket-server.ts          # Standalone Socket.IO server
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── public/
│   └── kenya-airways/            # Brand assets
│
├── .env.local
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Environment Setup

### 4.1 Prerequisites

- Node.js >= 20.x
- PostgreSQL >= 15
- pnpm (recommended) or npm

### 4.2 Install Dependencies

```bash
pnpm create next-app@latest kenya-airways --typescript --tailwind --app
cd kenya-airways

# Core
pnpm add prisma@latest @prisma/client@latest
pnpm add next-auth@latest @auth/prisma-adapter
pnpm add socket.io socket.io-client
pnpm add zod react-hook-form @hookform/resolvers
pnpm add @tanstack/react-query
pnpm add date-fns
pnpm add jspdf jspdf-autotable   # PDF report generation
pnpm add react-hot-toast          # Notifications
pnpm add lucide-react             # Icons

# Dev
pnpm add -D @types/node tsx nodemon
```

### 4.3 Environment Variables

```dotenv
# .env.local

# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/kenya_airways"

# NextAuth
NEXTAUTH_SECRET="your-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Socket.IO standalone server
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
SOCKET_SERVER_PORT=3001

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4.4 Initialize Prisma

```bash
npx prisma init
# Edit prisma/schema.prisma (see Section 5)
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

### 4.5 Run All Services

```bash
# Terminal 1 — Next.js
pnpm dev

# Terminal 2 — Socket.IO server
npx tsx --watch server/socket-server.ts
```

---

## 5. Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

enum FlightClass {
  EXECUTIVE   // Class A
  MIDDLE      // Class B
  LOW         // Class C
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  CHANGED
}

enum UserRole {
  PASSENGER
  STAFF
  ADMIN
}

enum AssignmentStatus {
  OPEN
  MATCHED
  CLOSED
}

// ─────────────────────────────────────────
// MODELS
// ─────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String
  role          UserRole  @default(PASSENGER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  passenger     Passenger?
  employee      Employee?
  sessions      Session[]
  accounts      Account[]
}

model Passenger {
  id            String    @id @default(cuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  firstName     String
  lastName      String
  email         String
  phone         String?
  passportNo    String?   @unique
  nationality   String?
  dateOfBirth   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  bookings      Booking[]
}

model Employee {
  id            String    @id @default(cuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  employeeNo    String    @unique
  firstName     String
  lastName      String
  department    String
  position      String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  assignments   StaffAssignment[]
}

model Flight {
  id              String      @id @default(cuid())
  flightNumber    String      @unique
  origin          String
  destination     String
  departureTime   DateTime
  arrivalTime     DateTime
  aircraft        String?

  // Capacity per class
  executiveTotal  Int         @default(20)
  middleTotal     Int         @default(60)
  lowTotal        Int         @default(120)

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  bookings        Booking[]
  assignments     StaffAssignment[]
}

model Booking {
  id              String        @id @default(cuid())
  bookingRef      String        @unique @default(cuid())
  passengerId     String
  passenger       Passenger     @relation(fields: [passengerId], references: [id])
  flightId        String
  flight          Flight        @relation(fields: [flightId], references: [id])
  flightClass     FlightClass
  seatNumber      String?
  status          BookingStatus @default(PENDING)
  totalAmount     Decimal       @db.Decimal(10, 2)
  paymentRef      String?
  specialRequests String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  cancelledAt     DateTime?

  inquiries       BookingInquiry[]
}

model BookingInquiry {
  id          String    @id @default(cuid())
  bookingId   String
  booking     Booking   @relation(fields: [bookingId], references: [id])
  type        String    // "ADD" | "CHANGE" | "DELETE"
  note        String?
  resolvedAt  DateTime?
  createdAt   DateTime  @default(now())
}

model StaffAssignment {
  id          String            @id @default(cuid())
  flightId    String
  flight      Flight            @relation(fields: [flightId], references: [id])
  employeeId  String?
  employee    Employee?         @relation(fields: [employeeId], references: [id])
  role        String            // e.g. "PILOT", "CABIN_CREW", "GROUND_STAFF"
  status      AssignmentStatus  @default(OPEN)
  assignedAt  DateTime?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

// ─── NextAuth Required Models ───────────────

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

### 5.1 Computed Seat Availability (View / Helper)

Because Prisma v7 doesn't auto-compute remaining seats, calculate dynamically in your service layer:

```typescript
// lib/seat-availability.ts

export async function getFlightAvailability(flightId: string) {
  const flight = await prisma.flight.findUniqueOrThrow({
    where: { id: flightId },
  });

  const counts = await prisma.booking.groupBy({
    by: ["flightClass"],
    where: { flightId, status: { in: ["CONFIRMED", "PENDING"] } },
    _count: { flightClass: true },
  });

  const booked = Object.fromEntries(
    counts.map((c) => [c.flightClass, c._count.flightClass]),
  );

  return {
    EXECUTIVE: {
      total: flight.executiveTotal,
      booked: booked["EXECUTIVE"] ?? 0,
    },
    MIDDLE: { total: flight.middleTotal, booked: booked["MIDDLE"] ?? 0 },
    LOW: { total: flight.lowTotal, booked: booked["LOW"] ?? 0 },
  };
}

export function isClassFull(
  availability: Awaited<ReturnType<typeof getFlightAvailability>>,
  flightClass: "EXECUTIVE" | "MIDDLE" | "LOW",
) {
  const cls = availability[flightClass];
  return cls.booked >= cls.total;
}
```

---

## 6. Next.js App Structure & Routing

### 6.1 Root Layout (`app/layout.tsx`)

```typescript
import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Kenya Airways — Online Booking',
  description: 'Book flights with Kenya Airways',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 6.2 Dashboard Layout (`app/(dashboard)/layout.tsx`)

```typescript
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role={session.user.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

### 6.3 Role-Based Navigation

| Route                | Passenger   | Staff | Admin |
| -------------------- | ----------- | ----- | ----- |
| `/bookings/new`      | ✅          | ✅    | ✅    |
| `/bookings`          | Own only    | All   | All   |
| `/passengers`        | Own profile | ✅    | ✅    |
| `/staff/assignments` | ❌          | ✅    | ✅    |
| `/reports`           | ❌          | ✅    | ✅    |
| `/flights` (manage)  | ❌          | ❌    | ✅    |

---

## 7. API Routes Reference

All routes live under `app/api/`. They use Next.js 16 Route Handlers with Zod validation.

### 7.1 Bookings

| Method   | Path                          | Description                             |
| -------- | ----------------------------- | --------------------------------------- |
| `GET`    | `/api/bookings`               | List bookings (filtered by user role)   |
| `POST`   | `/api/bookings`               | **Add booking**                         |
| `GET`    | `/api/bookings/:id`           | **Booking inquiry** (detail)            |
| `PUT`    | `/api/bookings/:id`           | **Change booking**                      |
| `DELETE` | `/api/bookings/:id`           | **Delete booking**                      |
| `POST`   | `/api/bookings/:id/inquiries` | Log booking inquiry (add/change/delete) |

```typescript
// app/api/bookings/route.ts  — POST (Add Booking)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingCreateSchema } from "@/lib/validations/booking";
import { getFlightAvailability, isClassFull } from "@/lib/seat-availability";
import { emitBookingUpdate } from "@/lib/socket-emitter";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = bookingCreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 422 },
    );

  const { flightId, flightClass, passengerId, specialRequests } = parsed.data;

  // Check seat availability
  const availability = await getFlightAvailability(flightId);
  if (isClassFull(availability, flightClass)) {
    // Find next available flight on same route
    const currentFlight = await prisma.flight.findUniqueOrThrow({
      where: { id: flightId },
    });
    const nextFlight = await prisma.flight.findFirst({
      where: {
        origin: currentFlight.origin,
        destination: currentFlight.destination,
        departureTime: { gt: currentFlight.departureTime },
      },
      orderBy: { departureTime: "asc" },
    });
    return NextResponse.json(
      {
        error: "CLASS_FULL",
        message: `${flightClass} class is fully booked.`,
        nextAvailable: nextFlight
          ? { flightId: nextFlight.id, departureTime: nextFlight.departureTime }
          : null,
      },
      { status: 409 },
    );
  }

  // Pricing map
  const prices: Record<string, number> = {
    EXECUTIVE: 85000,
    MIDDLE: 45000,
    LOW: 22000,
  };

  const booking = await prisma.booking.create({
    data: {
      passengerId,
      flightId,
      flightClass,
      status: "CONFIRMED",
      totalAmount: prices[flightClass],
      specialRequests,
    },
    include: { passenger: true, flight: true },
  });

  // Notify Socket.IO server of seat change
  await emitBookingUpdate(flightId, flightClass);

  return NextResponse.json(booking, { status: 201 });
}
```

### 7.2 Passengers

| Method   | Path                  | Description                   |
| -------- | --------------------- | ----------------------------- |
| `GET`    | `/api/passengers`     | List passengers (admin/staff) |
| `POST`   | `/api/passengers`     | **Add passenger**             |
| `GET`    | `/api/passengers/:id` | Get passenger detail          |
| `PUT`    | `/api/passengers/:id` | **Change passenger**          |
| `DELETE` | `/api/passengers/:id` | **Delete passenger**          |

### 7.3 Flights & Availability

| Method | Path                            | Description                 |
| ------ | ------------------------------- | --------------------------- |
| `GET`  | `/api/flights`                  | Search/list flights         |
| `GET`  | `/api/flights/:id/availability` | Get seat capacity per class |

```typescript
// app/api/flights/[id]/availability/route.ts

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const availability = await getFlightAvailability(params.id);
  return NextResponse.json(availability);
}
```

### 7.4 Staff Assignments

| Method | Path                         | Description                   |
| ------ | ---------------------------- | ----------------------------- |
| `GET`  | `/api/staff/assignments`     | List openings & matches       |
| `POST` | `/api/staff/assignments`     | Create opening                |
| `PUT`  | `/api/staff/assignments/:id` | **Match employee to opening** |

### 7.5 Reports

| Method | Path                   | Description                           |
| ------ | ---------------------- | ------------------------------------- |
| `GET`  | `/api/reports/tickets` | **Print ticket report** (JSON or PDF) |
| `GET`  | `/api/reports/matches` | **Print successful matches report**   |

```typescript
// app/api/reports/tickets/route.ts

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "json"; // 'json' | 'pdf'

  const bookings = await prisma.booking.findMany({
    where: { status: "CONFIRMED" },
    include: { passenger: true, flight: true },
    orderBy: { createdAt: "desc" },
  });

  if (format === "pdf") {
    // Generate PDF server-side with jspdf
    const { generateTicketReportPDF } = await import("@/lib/pdf-reports");
    const pdfBuffer = await generateTicketReportPDF(bookings);
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="ticket-report.pdf"',
      },
    });
  }

  return NextResponse.json(bookings);
}
```

---

## 8. Socket.IO Server

### 8.1 Standalone Server (`server/socket-server.ts`)

```typescript
import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// ── Room strategy: one room per flight ──────────────────
io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Client subscribes to seat updates for a specific flight
  socket.on("join-flight", (flightId: string) => {
    socket.join(`flight:${flightId}`);
    console.log(`[Socket] ${socket.id} joined flight:${flightId}`);
  });

  socket.on("leave-flight", (flightId: string) => {
    socket.leave(`flight:${flightId}`);
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ── Emit endpoint: called by Next.js API routes ─────────
// (Use an internal HTTP endpoint for Next → Socket.IO communication)
import express from "express";
const app = express();
app.use(express.json());

app.post("/internal/emit", (req, res) => {
  const { flightId, event, data } = req.body;
  io.to(`flight:${flightId}`).emit(event, data);
  res.json({ ok: true });
});

const PORT = process.env.SOCKET_SERVER_PORT ?? 3001;
httpServer.listen(PORT, () => console.log(`[Socket.IO] Running on :${PORT}`));
```

### 8.2 Socket Emitter Helper (`lib/socket-emitter.ts`)

```typescript
// Called from Next.js API routes to push updates to Socket.IO

export async function emitBookingUpdate(flightId: string, flightClass: string) {
  const { getFlightAvailability } = await import("./seat-availability");
  const availability = await getFlightAvailability(flightId);

  await fetch(
    `${process.env.SOCKET_SERVER_URL ?? "http://localhost:3001"}/internal/emit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flightId,
        event: "seat-availability-updated",
        data: { flightId, flightClass, availability },
      }),
    },
  );
}
```

### 8.3 Client Hook (`lib/socket-client.ts`)

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useFlightSocket(flightId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [availability, setAvailability] = useState<Record<
    string,
    { total: number; booked: number }
  > | null>(null);

  useEffect(() => {
    if (!flightId) return;

    socketRef.current = io(
      process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001",
    );
    socketRef.current.emit("join-flight", flightId);

    socketRef.current.on("seat-availability-updated", (data) => {
      if (data.flightId === flightId) setAvailability(data.availability);
    });

    return () => {
      socketRef.current?.emit("leave-flight", flightId);
      socketRef.current?.disconnect();
    };
  }, [flightId]);

  return { availability };
}
```

---

## 9. Authentication

### 9.1 NextAuth Config (`lib/auth.ts`)

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as string;
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
});
```

---

## 10. Core Feature Implementation

### 10.1 Booking Management

#### Zod Validation Schema

```typescript
// lib/validations/booking.ts
import { z } from "zod";

export const bookingCreateSchema = z.object({
  passengerId: z.string().cuid(),
  flightId: z.string().cuid(),
  flightClass: z.enum(["EXECUTIVE", "MIDDLE", "LOW"]),
  specialRequests: z.string().max(500).optional(),
});

export const bookingUpdateSchema = bookingCreateSchema.partial().extend({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "CHANGED"]).optional(),
});
```

#### Booking State Machine

```
PENDING → CONFIRMED   (on payment / staff confirmation)
PENDING → CANCELLED   (user cancels before confirmation)
CONFIRMED → CHANGED   (passenger modifies flight/class)
CONFIRMED → CANCELLED (user cancels)
CHANGED → CONFIRMED   (change applied)
```

#### Change Booking — Key Logic

When a passenger changes their booking's flight class or flight:

1. Cancel old booking (set `status = CANCELLED`)
2. Create new booking with updated details
3. Emit `seat-availability-updated` for both the old and new `flightId`
4. Log a `BookingInquiry` record with `type = "CHANGE"`

### 10.2 Passenger Management

```typescript
// lib/validations/passenger.ts
import { z } from "zod";

export const passengerCreateSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  passportNo: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
});
```

**Delete Passenger Rule:** A passenger with active (non-cancelled) bookings cannot be deleted. Return HTTP 409 with a message listing active bookings.

### 10.3 Seat Capacity & Availability

#### Class Definitions

| Class       | Label                  | Default Seats | Price (KES) |
| ----------- | ---------------------- | ------------- | ----------- |
| `EXECUTIVE` | Class A — Executive    | 20            | 85,000      |
| `MIDDLE`    | Class B — Middle Class | 60            | 45,000      |
| `LOW`       | Class C — Low Class    | 120           | 22,000      |

#### Full-Class Handling Flow

```
User selects class → Check availability →
  IF remaining > 0  → Proceed to booking
  IF remaining == 0 → Show "Class Full" banner
                     → Query next flight (same route)
                     → Display next available date/time
                     → Offer "Book next available" CTA
```

#### `ClassCapacityBadge` Component

```typescript
// components/flights/ClassCapacityBadge.tsx
'use client';

type Props = {
  label: string;
  total: number;
  booked: number;
  onSelectNextAvailable?: () => void;
};

export function ClassCapacityBadge({ label, total, booked, onSelectNextAvailable }: Props) {
  const remaining = total - booked;
  const pct = (booked / total) * 100;
  const isFull = remaining <= 0;
  const isAlmostFull = !isFull && remaining <= 5;

  return (
    <div className={`rounded-xl border p-4 ${isFull ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-gray-800">{label}</span>
        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
          isFull ? 'bg-red-100 text-red-700' :
          isAlmostFull ? 'bg-amber-100 text-amber-700' :
          'bg-green-100 text-green-700'
        }`}>
          {isFull ? 'FULL' : `${remaining} left`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${
            isFull ? 'bg-red-500' : isAlmostFull ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-gray-500">{booked} / {total} seats booked</p>

      {isFull && onSelectNextAvailable && (
        <button
          onClick={onSelectNextAvailable}
          className="mt-3 w-full text-sm bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition-colors"
        >
          Check Next Available Flight →
        </button>
      )}
    </div>
  );
}
```

### 10.4 Employee–Flight Assignment

**Match Employee to Opening** — core workflow:

1. Admin/Staff creates a `StaffAssignment` with `status = OPEN` for a flight and role.
2. On the Assignments page, staff views all `OPEN` slots.
3. Selecting an employee and clicking "Match" calls `PUT /api/staff/assignments/:id` with `{ employeeId, status: 'MATCHED' }`.
4. This updates the record and triggers the "Successful Matches" report.

```typescript
// app/api/staff/assignments/[id]/route.ts — PUT (Match employee to opening)

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session || !["STAFF", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { employeeId } = await req.json();

  const assignment = await prisma.staffAssignment.update({
    where: { id: params.id },
    data: {
      employeeId,
      status: "MATCHED",
      assignedAt: new Date(),
    },
    include: { employee: { include: { user: true } }, flight: true },
  });

  return NextResponse.json(assignment);
}
```

### 10.5 Reports (Ticket & Match)

#### Ticket Report Data Shape

```typescript
type TicketReportRow = {
  bookingRef: string;
  passenger: string;
  flight: string;
  route: string;
  departure: string;
  class: string;
  status: string;
  amount: string;
};
```

#### PDF Generation Helper

```typescript
// lib/pdf-reports.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function generateTicketReportPDF(
  bookings: any[],
): Promise<Buffer> {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Kenya Airways — Ticket Report", 14, 22);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

  autoTable(doc, {
    startY: 36,
    head: [
      [
        "Ref",
        "Passenger",
        "Flight",
        "Route",
        "Departure",
        "Class",
        "Status",
        "Amount (KES)",
      ],
    ],
    body: bookings.map((b) => [
      b.bookingRef.slice(0, 8).toUpperCase(),
      `${b.passenger.firstName} ${b.passenger.lastName}`,
      b.flight.flightNumber,
      `${b.flight.origin} → ${b.flight.destination}`,
      new Date(b.flight.departureTime).toLocaleString(),
      b.flightClass,
      b.status,
      Number(b.totalAmount).toLocaleString(),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 74, 153] }, // KQ Navy Blue
  });

  return Buffer.from(doc.output("arraybuffer"));
}
```

### 10.6 Online Help Section

The Help section lives at `/help` and consists of:

```typescript
// app/(dashboard)/help/page.tsx

const helpTopics = [
  {
    id: "booking",
    title: "How to Book a Flight",
    icon: "Plane",
    steps: [
      "Go to Bookings → New Booking",
      "Search for your desired route and date",
      "Select a flight class (Executive, Middle, or Low)",
      "Fill in passenger details or select an existing passenger",
      "Review the booking summary and confirm",
    ],
  },
  {
    id: "change",
    title: "How to Change a Booking",
    icon: "RefreshCw",
    steps: [
      "Go to Bookings and find your booking",
      'Click "View" to open the booking detail',
      'Click "Change Booking"',
      "Update the class, flight, or any details",
      "Save changes — a new booking reference will be issued",
    ],
  },
  {
    id: "cancel",
    title: "How to Cancel a Booking",
    icon: "XCircle",
    steps: [
      "Open the booking detail page",
      'Click "Cancel Booking"',
      "Confirm cancellation in the modal",
      "A cancellation confirmation will be emailed to you",
    ],
  },
  {
    id: "seats",
    title: "Understanding Seat Availability",
    icon: "LayoutGrid",
    steps: [
      "Each flight shows available seats per class",
      "Green badge: seats available",
      "Amber badge: almost full (≤5 seats)",
      "Red badge: FULL — system will show you the next available flight",
    ],
  },
  {
    id: "reports",
    title: "Printing Reports",
    icon: "FileText",
    steps: [
      "Go to Reports → Ticket Report or Matches Report",
      "Apply any date or status filters",
      'Click "Export PDF" to download a printable report',
    ],
  },
];
```

Additionally, implement a **`HelpTooltip`** component that wraps any UI element:

```typescript
// components/help/HelpTooltip.tsx
'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export function HelpTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="Help"
        className="text-gray-400 hover:text-blue-500 transition-colors"
      >
        <HelpCircle size={16} />
      </button>
      {visible && (
        <span
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
```

---

## 11. HCI & UI/UX Guidelines

### 11.1 Usability Principles

| Principle                          | Implementation                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Visibility of system status**    | Loading spinners on all async actions; toast notifications for success/error; real-time seat badge updates via Socket.IO |
| **Match system to real world**     | Use flight terminology (Departure, Arrival, Class, Booking Ref); KES currency formatting                                 |
| **User control & freedom**         | "Cancel" available on every form; back navigation; "Undo" toast with 5s window for booking cancellation                  |
| **Consistency & standards**        | Tailwind design tokens; consistent button hierarchy (primary/secondary/danger); KQ brand colors                          |
| **Error prevention**               | Zod validation with inline field errors; confirmation modals for destructive actions                                     |
| **Recognition over recall**        | Breadcrumbs on all pages; recent bookings on dashboard; class selection with visual labels, not just codes               |
| **Flexibility & efficiency**       | Keyboard shortcuts (e.g., `N` for new booking); staff can bulk-manage seats                                              |
| **Aesthetic & minimal design**     | Only show role-relevant options; progressive disclosure (advanced filters behind "More filters")                         |
| **Help users recover from errors** | Clear error messages with suggested next steps (e.g., "Class is full → Try next flight")                                 |
| **Help & documentation**           | Persistent `?` icon in navbar opens help panel; contextual `HelpTooltip` on complex fields                               |

### 11.2 Color & Visual Accessibility

```css
/* globals.css — KQ Brand Palette (WCAG 2.1 AA compliant) */
:root {
  --kq-navy: #002b5c; /* Primary — passes 4.5:1 on white */
  --kq-red: #c8102e; /* Accent / danger */
  --kq-gold: #c9a84c; /* Executive class accent */
  --kq-sky: #0072ce; /* Links, info */
  --kq-green: #1a7a4a; /* Available / success */
  --kq-amber: #c47c00; /* Almost full / warning */
  --kq-gray-50: #f8fafc;
  --kq-gray-900: #0f172a;
}
```

**Color-blind considerations:**

- Never use color alone to convey information — always pair with an icon or text label.
- Seat availability: use icon (✓ / ⚠ / ✗) + color + text count.
- Status badges: include text (`CONFIRMED`, `FULL`) not just colored dots.

### 11.3 Human Limitations Checklist

- **Vision:** Minimum 16px body text; all icons have `aria-label`; 4.5:1 contrast ratio minimum; support for browser zoom up to 200% without horizontal scroll.
- **Motor / Touch:** All touch targets minimum 44×44px; no hover-only interactions; tab-accessible forms; avoid time-limited interactions.
- **Cognitive load:** Max 7±2 items per menu/list page; progressive disclosure; clear section headings; short sentence copy.
- **Literacy:** Simple language (Grade 8 reading level); avoid jargon; use numbers and icons alongside words.
- **Screen readers:** Semantic HTML (`<main>`, `<nav>`, `<form>`, `<table>`); ARIA roles and live regions for dynamic seat updates (`aria-live="polite"`).

---

## 12. Usability Evaluation Plan

### 12.1 Heuristic Evaluation

Conduct a heuristic evaluation against Nielsen's 10 heuristics before user testing. Assign severity ratings (0–4) to all issues found.

**Evaluators:** 3–5 usability experts
**Method:** Each evaluator reviews the system independently, then combines findings.

### 12.2 User Testing Protocol

**Participants:** 5–8 representative users (mix of frequent flyers, first-time online bookers, airline staff)

**Test Tasks:**

1. Search for a flight from Nairobi (NBO) to Mombasa (MBA) tomorrow and book a Middle Class seat.
2. Change your booking to Executive Class.
3. Cancel the booking you just made.
4. Find the next available flight when a class is shown as full.
5. Add a new passenger profile.
6. (Staff) Match an employee to an open cabin crew position on flight KQ101.
7. (Staff) Generate and download the ticket report for this week.
8. Find help documentation on how to change a booking.

**Metrics to Collect:**

- Task completion rate (%)
- Time on task (seconds)
- Error rate (number of mistakes per task)
- Satisfaction (SUS questionnaire — System Usability Scale, 0–100)

**Success Criteria:**

- Task completion rate ≥ 90%
- SUS score ≥ 70 (acceptable) / target ≥ 85 (excellent)

### 12.3 SUS Questionnaire

Administer the standard 10-item SUS survey post-testing. Calculate score: `(sum of odd items - 5) + (25 - sum of even items)` × 2.5.

### 12.4 Accessibility Audit

Run automated audit with **axe-core** or **Lighthouse** (target score ≥ 90 for Accessibility). Manually test with NVDA + Chrome screen reader.

---

## 13. Key Component Blueprints

### 13.1 `BookingForm` (New / Change)

```typescript
// components/bookings/BookingForm.tsx  — props interface

type BookingFormProps = {
  mode: "create" | "edit";
  initialData?: Partial<BookingFormValues>;
  onSuccess?: (booking: Booking) => void;
};

type BookingFormValues = {
  passengerId: string;
  flightId: string;
  flightClass: "EXECUTIVE" | "MIDDLE" | "LOW";
  specialRequests?: string;
};
```

**Key behaviors:**

- `flightId` selection triggers fetching `GET /api/flights/:id/availability` and renders `ClassCapacityBadge` for each class.
- If selected class is full, disable submit and show `"Next available: [date]"` suggestion.
- On submit, call `POST /api/bookings` (create) or `PUT /api/bookings/:id` (edit).
- Show toast on success; navigate to booking detail page.

### 13.2 `FlightSearch`

```typescript
type FlightSearchProps = {
  onFlightSelect: (flight: Flight) => void;
};

// Search fields: origin, destination, date, class
// Uses debounced GET /api/flights?origin=&destination=&date=
```

### 13.3 `SeatMap`

Visual seat grid showing individual seat numbers per class. Booked seats shown in red (non-interactive). Available seats in green (clickable for selection). Uses `useFlightSocket` hook for live updates.

### 13.4 `DataTable` (Generic)

Reusable paginated table component with:

- Column sorting
- Row selection (for bulk actions)
- Search/filter bar
- Action buttons per row (View, Edit, Delete)
- Loading skeleton state

---

## 14. State Management

### 14.1 Server State — TanStack Query

```typescript
// hooks/useBookings.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: () => fetch("/api/bookings").then((r) => r.json()),
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BookingFormValues) =>
      fetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}
```

### 14.2 Real-Time State — Socket.IO

The `useFlightSocket(flightId)` hook (see Section 8.3) maintains live seat counts. When a `seat-availability-updated` event is received, it also triggers `qc.invalidateQueries({ queryKey: ['flights', flightId, 'availability'] })` to sync server state.

### 14.3 UI State — React `useState` / `useReducer`

Modals, form steps, and filter panels use local component state. No global client state store (like Zustand or Redux) is required for this application scope.

---

## 15. Error Handling Strategy

### API Layer

All route handlers use a shared `withErrorHandler` wrapper:

```typescript
// lib/api-handler.ts
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export function withErrorHandler(
  handler: (req: NextRequest, ctx: any) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: err.flatten() },
          { status: 422 },
        );
      }
      console.error("[API Error]", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
```

### Client Layer

```typescript
// lib/api-client.ts — wrapper for fetch with error extraction
export async function apiRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? data.error ?? "Request failed");
  return data;
}
```

Errors bubble up to React Query's `error` state and are displayed via `react-hot-toast`.

---

## 16. Deployment

### 16.1 Docker Compose (Development)

```yaml
# docker-compose.yml
version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: kq_user
      POSTGRES_PASSWORD: kq_pass
      POSTGRES_DB: kenya_airways
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  nextjs:
    build: .
    ports:
      - "3000:3000"
    env_file: .env.local
    depends_on: [postgres, socketio]

  socketio:
    build:
      context: .
      dockerfile: Dockerfile.socket
    ports:
      - "3001:3001"
    env_file: .env.local

volumes:
  pg_data:
```

### 16.2 Dockerfile (Next.js)

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN pnpm build
CMD ["pnpm", "start"]
```

### 16.3 Dockerfile.socket

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY server/ ./server/
COPY tsconfig.json .
CMD ["npx", "tsx", "server/socket-server.ts"]
```

### 16.4 Production Checklist

- [ ] Set strong `NEXTAUTH_SECRET` (32+ chars, random)
- [ ] Enable SSL for PostgreSQL connection (`?sslmode=require`)
- [ ] Place Socket.IO behind nginx with WSS (WebSocket Secure)
- [ ] Set up database connection pooling (PgBouncer or Prisma Accelerate)
- [ ] Configure rate limiting on API routes
- [ ] Enable Prisma query logging in non-production environments only

---

## 17. Implementation Checklist

### Phase 1 — Foundation (Week 1)

- [ ] Scaffold Next.js 16 project with TypeScript + Tailwind
- [ ] Set up PostgreSQL + Prisma schema (see Section 5)
- [ ] Run `prisma migrate dev --name init`
- [ ] Implement NextAuth with Credentials provider
- [ ] Build layout components (Navbar, Sidebar, Footer)
- [ ] Create seeder (`prisma/seed.ts`) with sample flights, users, and passengers

### Phase 2 — Booking Core (Week 2)

- [ ] `FlightSearch` component + `GET /api/flights`
- [ ] `ClassCapacityBadge` with real data from `GET /api/flights/:id/availability`
- [ ] `BookingForm` (create) + `POST /api/bookings`
- [ ] `BookingTable` + `GET /api/bookings`
- [ ] Change booking (`PUT /api/bookings/:id`) + edit page
- [ ] Delete/cancel booking (`DELETE /api/bookings/:id`) with confirmation modal

### Phase 3 — Passenger & Inquiry (Week 2–3)

- [ ] `PassengerForm` (add/edit) + CRUD API routes
- [ ] `BookingInquiry` logging on create/change/delete
- [ ] Booking detail / inquiry view page

### Phase 4 — Real-Time Seats (Week 3)

- [ ] Standalone Socket.IO server (`server/socket-server.ts`)
- [ ] `emitBookingUpdate` called from booking API routes
- [ ] `useFlightSocket` hook in `ClassCapacityBadge`
- [ ] Next-available flight suggestion when class is full

### Phase 5 — Staff Features (Week 3–4)

- [ ] Employee CRUD (admin only)
- [ ] `StaffAssignment` creation (open slots)
- [ ] Employee-to-opening matching UI + `PUT /api/staff/assignments/:id`
- [ ] Successful matches report page

### Phase 6 — Reports & Help (Week 4)

- [ ] Ticket report page + PDF export
- [ ] Matches report page + PDF export
- [ ] Help section with all topics (Section 10.6)
- [ ] `HelpTooltip` wired to all complex form fields

### Phase 7 — Accessibility & Usability (Week 4–5)

- [ ] ARIA labels on all interactive elements
- [ ] `aria-live` region for seat availability updates
- [ ] Keyboard navigation audit
- [ ] Lighthouse accessibility score ≥ 90
- [ ] SUS usability test (recruit 5 participants, run tasks from Section 12.2)
- [ ] Fix issues from usability evaluation

### Phase 8 — Deployment (Week 5)

- [ ] Docker Compose stack running end-to-end
- [ ] Environment variables documented in `.env.example`
- [ ] Final regression test of all CRUD operations
- [ ] PDF report generation verified

---

_Document version 1.0 — Kenya Airways Online Ticketing System_
_Generated for implementation kick-off. Update this document as design decisions evolve._
