# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular 16 single-page application built as a personal portfolio website (pho3nixhun.github.io). It features a Christmas gift exchange name picker with internationalization support.

## Common Development Commands

### Development
- `npm start` or `ng serve` - Start development server on http://localhost:4200/
- `npm run watch` - Build with watch mode for development
- `npm run build` - Build for production (outputs to dist/)

### Testing & Quality
- `npm test` or `ng test` - Run unit tests with Karma
- `npm run lint` or `ng lint` - Run ESLint on TypeScript and HTML files

### Utilities  
- `npm run reset` or `node ./scripts/reset.mjs` - Reset the gift exchange data via external API

## Architecture

### Core Technologies
- **Angular 16** with TypeScript 5.1
- **NgRx** for state management (Store, Effects, Component Store)
- **Transloco** for internationalization with language persistence
- **TailwindCSS** for styling with custom configuration
- **FontAwesome** icons and **Lobster** font
- **SCSS** as the primary styling language

### Project Structure
- `src/app/core/` - Core components (header, footer)
- `src/app/pages/` - Page components (currently only home)
- `src/app/shared/` - Reusable components and utilities (snowfall, gift-box, facts, directives, pipes)
- `src/app/stores/` - NgRx state management (name-picker store with effects and actions)
- `scripts/` - Utility scripts (reset.mjs for gift exchange data)

### State Management
The application uses NgRx for managing the name picker functionality:
- Actions, effects, and state are defined in `src/app/stores/name-picker/`
- External API integration for persistent gift exchange data
- Backend interface definitions for API communication

### Key Features
- Christmas-themed name picker with forbidden pairs logic
- Multi-language support (Transloco with persistence)
- Animated components (snowfall, gift boxes)
- Dark mode compatible styling
- Responsive design with TailwindCSS

### Development Notes
- Components use SCSS styling (configured in angular.json)
- ESLint and Prettier are configured for code quality
- Bundle size limits: 500KB warning, 1MB error for initial bundle
- TailwindCSS has custom regex patterns configured in VS Code settings