
# re:cursor - A Recursive AI Agent with Dynamic Tool Creation

This project implements a **recursive AI agent** that can **dynamically create tools** for specific purposes. The agent leverages OpenAI's API to analyze tasks, generate new tools when needed, and execute them in a controlled environment. It can store user-specific information, perform complex analyses, and integrate external APIs for real-time data retrieval.

## Features

- **Recursive AI reasoning** for breaking down complex tasks into manageable steps.
- **Dynamic tool creation**, allowing the AI to define and execute new tools in real-time.
- **Sandboxed execution** using `vm2` to ensure security when running user-generated code.
- **Memory storage** for recording user facts and retrieving them later.
- **Predefined utility tools**, including:
  - `getCurrentTime` - Retrieve the current time.
  - `sendEmail` - Simulate email sending.
  - `calculateMath` - Evaluate mathematical expressions.
  - `getHeadlines` - Fetch top news headlines.
  - `getWeather` - Retrieve weather data from an external API.
  - `recordFact` / `retrieveFacts` - Store and recall user facts.
  - `selfDeliberation` - Recursive analysis and decision-making.
  ## Installation

### Prerequisites
Ensure you have the following installed:

- **Node.js** (v16 or later)
- **npm** or **yarn**
- An OpenAI API key

### Setup
```bash
git clone https://github.com/matt0792/re-cursor
cd re-cursor
```

#### Install Dependencies:

Frontend:
```bash
cd frontend/
npm install
```

Backend: 
```bash
cd backend/
npm install
```

#### Create a .env file and add your API keys: 

```bash
MONGO_URI=your_mongo_api_key
OPENAI_API_KEY=your_openai_api_key
NEWSAPI_KEY=your_newsapi_key
WEATHERAPI_KEY=your_weatherapi_key
```

#### Start the front and backend:

Frontend: 

```bash
cd frontend/
npm run dev
```

Backend (Seperate terminal):

```bash
cd backend/
node server.js
```


## Usage/Examples

#### AI Interaction: 

The AI agent listens for messages and determines whether a tool is needed. If no tool exists, it creates one dynamically. Users can interact with the AI via the React frontend.

#### Tool creation example: 

```bash
{
  "metadata": {
    "name": "convertTemperature",
    "description": "Convert temperatures between Celsius and Fahrenheit.",
    "parameters": {
      "type": "object",
      "properties": {
        "temperature": { "type": "number", "description": "The temperature to convert." },
        "unit": { "type": "string", "description": "Target unit (C or F)." }
      },
      "required": ["temperature", "unit"]
    }
  },
  "code": "(args) => args.unit === 'F' ? args.temperature * 9/5 + 32 : (args.temperature - 32) * 5/9;"
}
```

#### Security Considerations: 

- Sandboxing with vm2 prevents unauthorized code execution.
- Strict input validation ensures tools handle arguments safely.
- API key management is handled through .env to protect sensitive credentials.


## Contributing

Contributions are always welcome, Feel free to submit a pull request!

