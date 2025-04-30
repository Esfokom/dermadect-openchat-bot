# Dermadect Bot Integration

## Overview

Dermadect is a comprehensive healthcare and educational platform that provides AI-powered healthcare assistance, health metrics tracking, and an educational game about human anatomy. This repository contains the OpenChat bot integration for Dermadect, allowing users to interact with the platform's features directly through chat.

## Architecture

The Dermadect ecosystem consists of two main components:

1. **FastAPI Backend** (`dermadect-oc-fastapi`)
   - Handles core healthcare and educational functionality
   - Manages AI interactions and game mechanics
   - Processes health metrics and provides health tips
   - Hosted at `https://dermadect-oc-fastapi.vercel.app`

2. **OpenChat Bot Integration** (this repository)
   - Provides chat interface for Dermadect services
   - Implements OpenChat bot protocol
   - Handles command execution and message routing
   - Manages user interactions and responses

## Bot Commands

The Dermadect bot supports the following commands:

### 1. `info`
- **Description**: Get information about Dermadect bot and its commands
- **Role**: Participant
- **Permissions**: Text message access
- **Parameters**: None

### 2. `game`
- **Description**: Interactive anatomy game with 5 questions
- **Role**: Participant
- **Permissions**: Text message access
- **Parameters**:
  - `message`: Command or answer to question (required)
  - Example commands: "start game", "end game"

### 3. `prompt`
- **Description**: Interact with AI agents for healthcare queries
- **Role**: Participant
- **Permissions**: Text message access
- **Parameters**:
  - `Message`: Prompt for the AI agent (required)
  - Supports multi-line input
  - Maximum length: 10000 characters

### 4. `health_tip`
- **Description**: Get health tips and wellness information
- **Role**: Participant
- **Permissions**: Text message access
- **Parameters**: None

### 5. `health_joke`
- **Description**: Get health-related jokes
- **Role**: Participant
- **Permissions**: Text message access
- **Parameters**: None

## Technical Implementation

### Bot Schema
The bot follows the OpenChat bot protocol defined in `bot_schema.json`, which specifies:
- Command definitions
- Parameter types and constraints
- Permission requirements
- Response formats

### Command Handlers
Each command is implemented as a separate handler in the `src/commands` directory:
- `game.ts`: Manages the anatomy game flow
- `prompt.ts`: Handles AI agent interactions
- `health_tip.ts`: Fetches health tips from the backend
- `health_joke.ts`: Retrieves health-related jokes
- `ping.ts`: Basic connectivity check

### Backend Integration
The bot communicates with the FastAPI backend through REST endpoints:
- Health tips: `GET /health-tip`
- Health jokes: `GET /health-joke`
- Game commands: `POST /game/{user_id}`
- AI interactions: `POST /chat`

## Setup and Installation

### Prerequisites
- Node.js 14+
- npm or yarn
- OpenChat bot credentials
- Access to Dermadect FastAPI backend

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```
   IDENTITY_PRIVATE=your_private_key
   OC_PUBLIC=your_public_key
   IC_HOST=your_ic_host
   STORAGE_INDEX_CANISTER=your_canister_id
   ```

### Running the Bot
- Development:
  ```bash
  npm run dev
  ```
- Production:
  ```bash
  npm run build
  npm run start
  ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 