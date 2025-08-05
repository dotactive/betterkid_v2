# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (runs on http://localhost:3000)
- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Run linting**: `npm run lint`

## Architecture Overview

This is a Next.js 15 application using the App Router architecture, built as a behavioral tracking system for children called "Better Kid". The application has a dual interface design with separate sections for children (`/front`) and parents (`/back`).

### Core Technologies
- **Framework**: Next.js 15 with App Router
- **Database**: AWS DynamoDB (table: `betterkid_v2`, region: `ap-southeast-2`)
- **Styling**: Tailwind CSS v4
- **State Management**: React hooks with localStorage for authentication
- **HTTP Client**: Axios

### Application Structure

The app follows a clear separation between user interfaces:

- **Frontend**: Child-friendly interface with colorful design
  - `/behaviors` - View and track behaviors
  - `/earnlose` - Earn/lose "Super Coins"
  - `/spend` - Spend coins on rewards
  - `/logs` - View activity history

- **Backend (`/back`)**: Parent/admin interface for content management
  - `/back/content-editor` - Manage content
  - `/back/events-editor` - Manage events

- **Award Editor**: Coin reward configuration (available in edit mode)
  - `/award-editor` - Configure coin rewards

### Authentication System

Authentication is client-side only using localStorage:
- Login via `/api/login` validates against DynamoDB user table
- `useAuth` hook manages authentication state
- Both front and back layouts use identical authentication logic
- No JWT tokens - relies on userId stored in localStorage

### API Routes

All API routes follow RESTful patterns under `/api/`:
- User management: `/api/users`, `/api/login`, `/api/user-balance`
- Content: `/api/behaviors`, `/api/activities`, `/api/events`
- Media: `/api/images`, `/api/homebanner`
- Logging: `/api/logs`

Dynamic routes use bracket notation (e.g., `/api/users/[userId]`).

### Database Schema

Uses AWS DynamoDB with a single table approach:
- Table name: `betterkid_v2`
- Users have: `userId`, `email`, `password`, `username`, balance fields
- Authentication uses plain text password comparison (scan operation with filter)

### Key Components

- **Layout Components**: Unified layout with navigation and user balance display that adapts for front/back sections
- **ImagePicker**: Component for handling image uploads
- **Authentication Hook**: `useAuth` provides authentication state across the app

### Development Notes

- Next.js configuration includes experimental server components external packages for axios
- TypeScript is used throughout with strict typing
- Console logging is extensive for debugging authentication flows
- AWS credentials are handled via environment (no hardcoded credentials)