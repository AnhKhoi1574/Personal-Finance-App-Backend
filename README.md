# Personal Finance Application - Backend
Backend repository for personal finance assistant app, using ExpressJS

## Installation
- Download and install [NodeJS](https://nodejs.org/en/download/package-manager)
- Clone the repository:
```bash
git clone https://github.com/AnhKhoi1574/Personal-Finance-App-Backend
cd Personal-Finance-App-Backend
```
- Install dependencies
```bash
npm install
```

## Usage

**Important**:  Ensure the [Frontend](https://github.com/HaBui7/PFA_FE) is running. Optionally, for the AI Chat feature to work, [revChatVal](https://github.com/Khang5687/revChatVal/tree/fastapi) must be running on port `8000` as well:

Run the Backend on port `3000` (default):
```bash
node server.js
```

## Testing
Integration Test for AI Chatbot commands, **REQUIRES** [revChatVal](https://github.com/Khang5687/revChatVal/tree/fastapi) to be running on port `8000`.

- Install dependencies:
```bash
npm install
```

- Run test: `npm run test-measure <number of iterations>`

Example: Test for 10 iterations
```bash
npm run test-measure 10
```


## License
None