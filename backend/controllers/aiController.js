import { OpenAI } from "openai";
import dotenv from "dotenv";
import axios from "axios";
import { VM } from "vm2";

import {
  logMessage,
  getConversationHistory,
} from "../middleware/messageLogging.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Memory storage object
const userMemory = {};

// Function to record a fact about the user
const recordFact = (userId, fact) => {
  try {
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: userId must be a non-empty string.");
    }

    if (!fact || typeof fact !== "string") {
      throw new Error("Invalid fact: fact must be a non-empty string.");
    }

    // Initialize user memory if it doesn't exist
    if (!userMemory[userId]) {
      userMemory[userId] = [];
    }

    // Record the fact
    userMemory[userId].push(fact);

    return `Fact recorded successfully for user ${userId}.`;
  } catch (error) {
    console.error("Error recording fact:", error);
    return `Error recording fact: ${error.message}`;
  }
};

// Function to retrieve facts about the user
const retrieveFacts = (userId) => {
  try {
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: userId must be a non-empty string.");
    }

    // Check if the user has any recorded facts
    if (!userMemory[userId] || userMemory[userId].length === 0) {
      return `No facts recorded for user ${userId}.`;
    }

    // Return the list of facts
    return `Facts for user ${userId}:\n${userMemory[userId]
      .map((fact, index) => `${index + 1}. ${fact}`)
      .join("\n")}`;
  } catch (error) {
    console.error("Error retrieving facts:", error);
    return `Error retrieving facts: ${error.message}`;
  }
};

const analyzeLogicProblem = async (args) => {
  try {
    // Input validation
    const requiredParams = [
      "problem",
      "entities",
      "attributes",
      "clues",
      "questions",
    ];
    for (const param of requiredParams) {
      if (!args[param]) throw new Error(`Missing required parameter: ${param}`);
    }

    // Initialize analysis
    let analysis = ["# Logic Problem Analysis", `**Problem**: ${args.problem}`];
    const assignments = {};
    const possibilities = {};

    // Initialize possibilities matrix
    args.entities.forEach((entity) => {
      possibilities[entity] = new Set(args.attributes);
      assignments[entity] = null;
    });

    // Helper functions
    const updatePossibilities = (entity, attribute, operation) => {
      if (operation === "remove") {
        possibilities[entity].delete(attribute);
      }
    };

    const checkContradictions = () => {
      args.entities.forEach((entity) => {
        if (possibilities[entity].size === 0) {
          throw new Error(
            `Contradiction found: ${entity} has no valid options`
          );
        }
      });
    };

    // Process clues
    analysis.push("\n## Step-by-Step Clue Analysis");
    args.clues.forEach((clue, index) => {
      analysis.push(`\n### Clue ${index + 1}: ${clue}`);

      // Basic clue parsing (can be expanded)
      const matchDirect = clue.match(/(\w+)\s*=\s*(\w+)/i);
      const matchExclusion = clue.match(/(\w+)\s*≠\s*(\w+)/i);

      if (matchDirect) {
        const [, entity, attribute] = matchDirect;
        if (!args.entities.includes(entity))
          throw new Error(`Invalid entity in clue: ${entity}`);
        if (!args.attributes.includes(attribute))
          throw new Error(`Invalid attribute in clue: ${attribute}`);

        // Assign directly
        assignments[entity] = attribute;
        analysis.push(`- Direct assignment: ${entity} → ${attribute}`);

        // Remove this attribute from others
        args.entities.forEach((other) => {
          if (other !== entity) updatePossibilities(other, attribute, "remove");
        });
      } else if (matchExclusion) {
        const [, entity, attribute] = matchExclusion;
        updatePossibilities(entity, attribute, "remove");
        analysis.push(`- Exclusion: ${entity} cannot be ${attribute}`);
      }

      // Update remaining possibilities
      args.entities.forEach((entity) => {
        if (!assignments[entity] && possibilities[entity].size === 1) {
          const determined = [...possibilities[entity]][0];
          assignments[entity] = determined;
          analysis.push(`- Deduced: ${entity} must be ${determined}`);

          // Propagate constraint
          args.entities.forEach((other) => {
            if (other !== entity)
              updatePossibilities(other, determined, "remove");
          });
        }
      });

      checkContradictions();
    });

    // Final assignments
    analysis.push("\n## Final Analysis");
    args.entities.forEach((entity) => {
      analysis.push(
        `- ${entity}: ${
          assignments[entity] || Array.from(possibilities[entity]).join(", ")
        }`
      );
    });

    // Check for contradictions
    if (Object.values(assignments).some((a) => !a)) {
      analysis.push(
        "\n⚠️ **Warning**: Problem is underspecified. Multiple solutions may exist."
      );
    }

    // Answer questions
    analysis.push("\n## Questions");
    args.questions.forEach((question, index) => {
      analysis.push(`\n**Q${index + 1}**: ${question}`);
      // Simple question answering - could be enhanced
      const entityMatch = question.match(/What (color|attribute).*\b(\w+)\?/i);
      if (entityMatch) {
        const entity = entityMatch[2];
        analysis.push(
          `**Answer**: ${
            assignments[entity] || "Cannot determine from given clues"
          }`
        );
      }
    });

    return analysis.join("\n");
  } catch (error) {
    return `Logic analysis error: ${error.message}`;
  }
};

const explainTopic = async (topic) => {
  console.log(`AI explaining topic: ${topic}`);

  // Helper function to safely parse JSON
  const safeJsonParse = (jsonString, fallback = {}) => {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("JSON parsing error:", error);
      return fallback;
    }
  };

  // Helper function to ensure string output
  const ensureString = (value, fallback = "No information available") => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.join(", ");
    if (value && typeof value === "object") return JSON.stringify(value);
    return fallback;
  };

  // Helper function to generate fallback components
  const generateFallbackComponents = (topic) => {
    return [
      `Core Principle of ${topic}`,
      `Key Mechanism in ${topic}`,
      `Fundamental Aspect of ${topic}`,
    ];
  };

  // Step 1: Break down into fundamental components
  const decompositionResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Break down "${topic}" into 3 fundamental components/concepts that are essential for basic understanding. 
            Return a JSON object with: { "topic": "string", "components": [] }. The components array should JUST be the names of the components, with no additional explanation`,
      },
    ],
    response_format: { type: "json_object" },
  });

  // Safely parse decomposition
  const decomposition = safeJsonParse(
    decompositionResponse.choices[0].message.content,
    {
      topic: topic,
      components: generateFallbackComponents(topic), // Use dynamic fallback
    }
  );

  // Ensure components is an array
  if (!Array.isArray(decomposition.components)) {
    decomposition.components = generateFallbackComponents(topic);
  }

  // Step 2: Explain each component in simple terms
  const componentExplanations = [];
  for (const component of decomposition.components) {
    const explanationResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Explain "${component}" in simple terms as part of understanding "${decomposition.topic}".
              Use analogies and everyday examples. Make sure that every small detail is fully explained in a way that the user can grasp, use jargon if needed, but explain what complicated terms mean. Do not output <pre> or <code> tags unless absolutely necessary. Respond with just the explanation.`,
        },
      ],
    });
    componentExplanations.push({
      component: ensureString(component),
      explanation: ensureString(explanationResponse.choices[0].message.content),
    });
  }

  // Step 3: Show how components work together
  const integrationResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Explain how these components work together to create "${
          decomposition.topic
        }":
            ${componentExplanations.map((e) => `- ${e.component}`).join("\n")}
            Use a logical step-by-step process. Do not output <pre> or <code> tags unless absolutely necessary. Respond with just the explanation.`,
      },
    ],
  });

  const integrationExplanation = ensureString(
    integrationResponse.choices[0].message.content,
    "The components work together in a complex way to form the overall concept."
  );

  // Step 4: Expand into advanced concepts
  const expansionResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Based on understanding of "${decomposition.topic}", suggest just the names 2-3 natural extensions or 
            advanced aspects that build on the fundamentals. Return as JSON: { "extensions": [] }`,
      },
    ],
    response_format: { type: "json_object" },
  });

  // Safely parse extensions
  const extensions = safeJsonParse(
    expansionResponse.choices[0].message.content,
    {
      extensions: [
        `Advanced Application of ${decomposition.topic}`,
        `Cutting-Edge Research in ${decomposition.topic}`,
        `Future Trends in ${decomposition.topic}`,
      ],
    }
  ).extensions;

  // Ensure extensions is an array
  if (!Array.isArray(extensions)) {
    extensions = [
      `Advanced Application of ${decomposition.topic}`,
      `Cutting-Edge Research in ${decomposition.topic}`,
      `Future Trends in ${decomposition.topic}`,
    ];
  }

  // Format final output
  return `# Comprehensive Explanation of: ${ensureString(decomposition.topic)}
    
      ## Fundamental Components
      ${componentExplanations
        .map((e) => `### ${e.component}\n${e.explanation}`)
        .join("\n\n")}
    
      ## How It All Fits Together
      ${integrationExplanation}
    
      ## Building Further Understanding
      ${extensions
        .map(
          (e, i) =>
            `${i + 1}. **${ensureString(
              e
            )}** - Suggested area for deeper exploration`
        )
        .join("\n")}
    
      *Would you like me to elaborate on any of these advanced aspects?*`;
};

// Function to create a new tool dynamically
const createTool = (metadata, code) => {
  try {
    // Validate metadata
    if (!metadata.name || !metadata.description || !metadata.parameters) {
      throw new Error(
        "Invalid metadata: name, description, and parameters are required."
      );
    }

    // Sanitize the function name
    const sanitizedName = metadata.name
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9_-]/g, ""); // Remove invalid characters

    // Validate code
    if (typeof code !== "string" || code.trim() === "") {
      throw new Error("Invalid code: code must be a non-empty string.");
    }

    // Ensure the parameters schema is valid
    if (
      !metadata.parameters.type ||
      metadata.parameters.type !== "object" ||
      !metadata.parameters.properties ||
      typeof metadata.parameters.properties !== "object"
    ) {
      throw new Error(
        "Invalid parameters schema: type must be 'object' and properties must be defined."
      );
    }

    // Create a sandboxed function with improved input validation
    const sandbox = new VM({ sandbox: { console } });
    const func = sandbox.run(`(args) => { 
          try {
            // Ensure that args is an object
            const safeArgs = typeof args === 'object' && args !== null ? args : {};
            
            // Convert function to string to prevent any code injection and ensure it executes correctly
            const toolFunction = ${code};
            
            if (typeof toolFunction !== 'function') {
              throw new Error('The provided code does not evaluate to a function');
            }
            
            // Execute the provided code with safe arguments
            const result = toolFunction(safeArgs);
            
            // Ensure the result is always a string
            return result === undefined ? "No result" : 
                   result === null ? "Null result" : 
                   typeof result === 'object' ? JSON.stringify(result) : 
                   String(result);
          } catch (error) {
            console.error("Tool execution error:", error);
            return String(\`Error executing tool: \${error.message}\`);
          }
        }`);

    // Add the new tool to the tools array
    tools.push({
      type: "function",
      function: {
        name: sanitizedName, // Use the sanitized name
        description: metadata.description,
        parameters: metadata.parameters,
        func, // Store the function for execution
      },
    });

    return "Tool created successfully.";
  } catch (error) {
    console.error("Tool creation error:", error);
    return `Error creating tool: ${error.message}`;
  }
};

// Function to get current time
const getCurrentTime = () => {
  console.log("Got current time");
  return new Date().toISOString();
};

// Placeholder function for sending emails
const sendEmail = (recipient, subject, body) => {
  return `Email to ${recipient} with subject "${subject}" was sent (not really, just a placeholder).`;
};

// evaulate a mathematical expression
const calculateMath = (expression) => {
  try {
    const result = Function(
      '"use strict"; return (' +
        expression.replace(/([a-zA-Z]+)/g, "Math.$1") +
        ")"
    )();
    return result;
  } catch (error) {
    return `Error evaluating expression: ${error.message}`;
  }
};

// Function to get the top headlines from NewsAPI
const getHeadlines = async () => {
  try {
    const response = await axios.get(
      `https://newsapi.org/v2/top-headlines?country=us&apiKey=${process.env.NEWSAPI_KEY}`
    );
    const headlines = response.data.articles.map((article) => article.title); // Extract article titles
    return headlines;
  } catch (error) {
    console.error("Error fetching headlines:", error);
    return "Failed to fetch headlines.";
  }
};

const getWeather = async (location) => {
  try {
    const response = await axios.get(
      `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHERAPI_KEY}&q=${location}&aqi=no`
    );

    const currentWeather = {
      location: response.data.location.name,
      region: response.data.location.region,
      country: response.data.location.country,
      localTime: response.data.location.localtime,
      lastUpdated: response.data.current.last_updated,
      temperature: response.data.current.temp_c,
      is_day: response.data.current.is_day,
      wind: response.data.current.wind_kph,
      wind_dir: response.data.current.wind_dir,
      precipitation: response.data.current.precip_mm,
      humidity: response.data.current.humidity,
      feels_like: response.data.current.feelslike_c,
      visibility: response.data.current.vis_km,
      uv: response.data.current.uv,
      gust: response.data.current.gust_kph,
    };

    const weatherString = `
    Current weather for ${currentWeather.location}, ${currentWeather.region}, ${currentWeather.country}:
    - Temperature: ${currentWeather.temperature}°C (feels like: ${currentWeather.feels_like}°C)
    - Condition: ${response.data.current.condition.text}
    - Wind: ${currentWeather.wind} kph, direction: ${currentWeather.wind_dir}
    - Humidity: ${currentWeather.humidity}%
    - Precipitation: ${currentWeather.precipitation} mm
    - Visibility: ${currentWeather.visibility} km
    - UV Index: ${currentWeather.uv}
    - Last updated: ${currentWeather.lastUpdated}
        `.trim();

    return weatherString;
  } catch (error) {
    console.error("Error fetching weather:", error);
    return "Failed to fetch weather.";
  }
};

// Self-deliberation tool execution function
const selfDeliberation = async (topic) => {
  console.log(`AI deliberating on the topic: ${topic}`);

  // First step: Generate key questions to explore
  const questionsResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Identify 3 key questions that need to be answered to fully understand: "${topic}". 
          Return only the questions in a JSON array format like: ["Question 1?", "Question 2?", ...]`,
      },
    ],
    response_format: { type: "json_object" },
  });

  // Parse the questions
  const questions = JSON.parse(
    questionsResponse.choices[0].message.content
  ).questions;

  // Second step: Answer each question with detailed analysis
  const answers = [];
  for (const question of questions) {
    const answerResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are analyzing the question: "${question}" as part of understanding "${topic}".
            Provide a thoughtful analysis with evidence and reasoning.`,
        },
      ],
    });

    answers.push({
      question,
      answer: answerResponse.choices[0].message.content,
    });
  }

  // Final step: Synthesize the findings into a comprehensive analysis
  const synthesisResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Synthesize the following analyses into a comprehensive understanding of "${topic}". Use Markdown formatting.`,
      },
      {
        role: "user",
        content: JSON.stringify(answers),
      },
    ],
  });

  // Return the full chain of thought plus final synthesis
  return `# Analysis of: ${topic}
  
  ## Key Questions Explored
  ${questions.map((q) => `- ${q}`).join("\n")}
  
  ## Detailed Analysis
  ${answers.map((a) => `### ${a.question}\n${a.answer}`).join("\n\n")}
  
  ## Synthesis
  ${synthesisResponse.choices[0].message.content}`;
};

// Define available tools
const tools = [
  {
    type: "function",
    function: {
      name: "getCurrentTime",
      description: "Get the current date and time in ISO format",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "sendEmail",
      description: "Send an email",
      parameters: {
        type: "object",
        properties: {
          recipient: { type: "string", description: "The email recipient" },
          subject: { type: "string", description: "The email subject" },
          body: { type: "string", description: "The email content" },
        },
        required: ["recipient", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculateMath",
      description: "Evaluate a math expression",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "The mathematical expression to evaluate",
          },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getHeadlines",
      description: "Fetch the latest top headlines",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "selfDeliberation",
      description:
        "Recursively analyze a topic. Use this tool iteratively to break down complex ideas into subtopics or deepen analysis. Ask for user confirmation before use, and warn that it may take a while.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "The specific subtopic or angle to explore next",
          },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createTool",
      description:
        "Dynamically define a new tool. Must always accept and output a string.",
      parameters: {
        type: "object",
        properties: {
          metadata: {
            type: "object",
            description:
              "Metadata for the new tool (name, description, parameters)",
            properties: {
              name: { type: "string", description: "The name of the new tool" },
              description: {
                type: "string",
                description: "The description of the new tool",
              },
              parameters: {
                type: "object",
                description: "The parameters for the new tool",
                properties: {
                  type: {
                    type: "string",
                    description: "The type of the parameters object",
                  },
                  properties: {
                    type: "object",
                    description: "The properties of the parameters object",
                  },
                  required: {
                    type: "array",
                    description: "The required parameters",
                    items: { type: "string" },
                  },
                },
                required: ["type", "properties"],
              },
            },
            required: ["name", "description", "parameters"],
          },
          code: {
            type: "string",
            description:
              "The JavaScript code for the new tool. ALWAYS make sure that code is complete and functional",
          },
        },
        required: ["metadata", "code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getWeather",
      description:
        "Get the current weather for a specific location (city) in metric units.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The location to get weather for",
          },
        },
        required: ["location"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recordFact",
      description: "Record an important or interesting fact about the user.",
      parameters: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "The unique identifier for the user",
          },
          fact: {
            type: "string",
            description: "The fact to record about the user",
          },
        },
        required: ["userId", "fact"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "retrieveFacts",
      description: "Retrieve all recorded facts about the user.",
      parameters: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "The unique identifier for the user",
          },
        },
        required: ["userId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyzeLogicProblem",
      description:
        "Systematically solve logic puzzles using constraint satisfaction. Returns step-by-step analysis.",
      parameters: {
        type: "object",
        properties: {
          problem: {
            type: "string",
            description: "Description of the logic problem",
          },
          entities: {
            type: "array",
            items: { type: "string" },
            description:
              "List of entities in the problem (e.g., ['Alice', 'Bob'])",
          },
          attributes: {
            type: "array",
            items: { type: "string" },
            description: "Possible attributes/options (e.g., ['Red', 'Blue'])",
          },
          clues: {
            type: "array",
            items: { type: "string" },
            description: "List of constraints/clues (e.g., ['Alice ≠ Red'])",
          },
          questions: {
            type: "array",
            items: { type: "string" },
            description: "Questions to answer about the problem",
          },
        },
        required: ["problem", "entities", "attributes", "clues", "questions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "explainTopic",
      description:
        "Break down complex topics into fundamental components and build up understanding systematically. Ask for user confirmation before use, and warn that it may take a while.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "The subject to explain in depth",
          },
        },
        required: ["topic"],
      },
    },
  },
];

// let activeToolStore = [];

// Function to execute tool calls
const executeTool = async (
  toolName,
  args,
  senderId,
  senderName,
  senderRole,
  res,
  activeTools
) => {
  try {
    // if (!activeToolStore.includes(toolName)) {
    //   return `The tool "${toolName}" is turned off and cannot be used.`;
    // }

    switch (toolName) {
      case "getCurrentTime":
        return String(getCurrentTime()) || "Unknown time";
      case "sendEmail":
        return (
          String(sendEmail(args.recipient, args.subject, args.body)) ||
          "Failed to send email"
        );
      case "calculateMath":
        return String(calculateMath(args.expression));
      case "getHeadlines":
        return String(await getHeadlines()) || "Failed to get headlines";
      case "selfDeliberation":
        return String(await selfDeliberation(args.topic));
      case "getWeather":
        return String(await getWeather(args.location));
      case "createTool":
        return String(createTool(args.metadata, args.code));
      case "recordFact":
        return String(recordFact(args.userId, args.fact));
      case "retrieveFacts":
        return String(retrieveFacts(args.userId));
      case "analyzeLogicProblem":
        return String(await analyzeLogicProblem(args));
      case "explainTopic":
        return String(await explainTopic(args.topic));
      default:
        // Handle dynamically created tools
        const tool = tools.find(
          (t) => t.function && t.function.name === toolName
        );
        if (tool && tool.function.func) {
          // Validate args to ensure it's an object
          const safeArgs =
            typeof args === "object" && args !== null ? args : {};
          const result = await tool.function.func(safeArgs);
          return String(result || "No result returned");
        }
        return "Unknown tool";
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return `Error executing ${toolName}: ${error.message}`;
  }
};

const chatHistory = {};

// const updateActiveTools = (activeTools) => {
//   if (Array.isArray(activeTools)) {
//     activeToolStore = activeTools;
//   }
// };

// console.log(activeToolStore);

// Main AI function
export const answer = async (req, res) => {
  try {
    const {
      senderId,
      senderName,
      senderRole,
      message,
      activeTools,
      conversationId,
    } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message must be a valid string" });
    }

    // Log the incoming user message
    await logMessage({
      senderId,
      senderName,
      senderRole,
      content: message,
      conversationId: conversationId || senderId,
    });

    // Initialize chat history if it doesn't exist
    if (!chatHistory[senderId]) {
      chatHistory[senderId] = [];
    }

    // Initialize chat history if it doesn't exist
    if (!chatHistory[senderId]) {
      chatHistory[senderId] = [];
    }

    // Append user message to history
    chatHistory[senderId].push({ role: senderRole, content: message });

    let response;
    let retryCount = 0;
    const maxRetries = 3; // Maximum number of retries

    while (retryCount < maxRetries) {
      try {
        response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are re:cursor, a curious and thoughtful AI assistant. Follow these core principles:

1. **Tool Usage**:
- Always use available tools before responding when appropriate
- When asked to explain or deliberate on a topic, ALWAYS use the explainTopic or selfDeliberation tool:
  • Explain what the tool does in simple terms
  • *Always* ask explicit user permission before executing
  • Estimate time/complexity ("This analysis may take 2-3 minutes")

2. **Communication Style**:
- Use clear, conversational English with _occasional_ formatting:
  • **Bold** for key terms/concepts
  • Bullet points for lists
  • Section headers only for long explanations
- Begin complex answers with a 1-sentence summary
- Use analogies from everyday life for technical concepts

3. **Error Handling**:
- Explain errors in plain language:
  "I couldn't calculate that because the equation seems incomplete."
- Suggest specific fixes when possible
- Never show raw error logs to users
- NEVER use emojis, rather use ascii faces. 

4. **Memory Integration**:
- Actively use recorded facts when relevant:
  "Since you mentioned you're a visual learner, here's a diagram..."
- Ask before recording new personal information

5. **Tool Creation**:
- When creating tools:
  • Explain the new capability in simple terms
  • Provide usage examples
  • Warn about limitations
    ALWAYS follow these guidelines:
      1. Ensure your tool function ALWAYS handles input validation
      2. ALWAYS ensure your function returns a string or converts its result to a string
      3. Properly handle errors with try/catch blocks
      4. NEVER use placeholder logic or comments when creating a tool
      5. Make sure tool code is complete and functional
      
      Example of proper tool code:
      (args) => {
        try {
          // Input validation
          if (!args.text || typeof args.text !== 'string') {
            return "Error: Invalid input. 'text' must be a string.";
          }
          
          // Tool logic
          const result = args.text.split('').reverse().join('');
          
          // Return string result
          return result;
        } catch (error) {
          return \`Error processing: \${error.message}\`;
        }
      }

6. **Process Transparency**:
- Briefly explain your workflow:
  "I'll first analyze the logic puzzle constraints, then..."
- Show progress during long operations
  "Processing step 2/3: Validating possible solutions..."

7. **User Control**:
- Offer options where applicable:
  "Would you prefer a quick summary or detailed analysis?"
- Allow interruption of long processes
- Confirm understanding of complex instructions

Example of good response:
"Let's analyze this logic puzzle! First, I'll need to:  
1. **Identify** all constraints from the clues  
2. **Eliminate** impossible combinations  
3. **Verify** the remaining options  

This should take about 1 minute. Should I proceed?"

Use markdown formatting if needed in responses. Use:
        - **Bold** for important concepts
        - ## Section Headers
        - ### Subheaders
        - Bullet points for lists
        - Numbered steps for processes
        - _Italics_ for emphasis
        Always structure complex answers with clear headers and sections. Never use emojis, rather use ascii faces.

Maintain a curious, patient tone focused on user understanding. Admit uncertainty and offer verification for critical information. Be curious, suggest new approaches, inspire, create!`,
            },
            ...chatHistory[senderId],
          ],
          tools,
          tool_choice: "auto",
        });

        break; // Exit the retry loop if the request succeeds
      } catch (error) {
        if (
          error.status === 400 &&
          error.message.includes("Invalid parameter: messages with role 'tool'")
        ) {
          // Handle the specific 400 error
          console.error(
            "Invalid message sequence detected. Attempting to recover..."
          );

          // Remove the last tool message from the chat history
          const lastMessage =
            chatHistory[senderId][chatHistory[senderId].length - 1];
          if (lastMessage && lastMessage.role === "tool") {
            chatHistory[senderId].pop(); // Remove the problematic tool message
          }

          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error(
              "Max retries reached. Unable to recover from invalid message sequence."
            );
          }
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }

    let responseMessage = response.choices[0].message;
    let directToolResponse = null; // To store direct responses from special tools

    // Add the assistant's message to history first + log
    if (responseMessage.content) {
      await logMessage({
        senderId,
        senderName: "AI Assistant",
        senderRole: "assistant",
        content: responseMessage.content,
        conversationId: conversationId || senderId,
      });

      chatHistory[senderId].push({
        role: "assistant",
        content: responseMessage.content,
      });
    }

    // Process tool calls and log them if any
    while (
      responseMessage.tool_calls &&
      responseMessage.tool_calls.length > 0
    ) {
      // Log the assistant message with tool calls
      if (!responseMessage.content) {
        await logMessage({
          senderId,
          senderName: "AI Assistant",
          senderRole: "assistant",
          content: "",
          toolCalls: responseMessage.tool_calls,
          conversationId: conversationId || senderId,
        });

        chatHistory[senderId].push({
          role: "assistant",
          tool_calls: responseMessage.tool_calls,
          content: null,
        });
      }

      // Then process each tool call and add the tool responses
      const toolResults = [];
      for (const toolCall of responseMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`Executing tool: ${toolName} with args`, args);

        // Check if this is a special tool that should return directly
        if (toolName === "selfDeliberation") {
          console.log("Self-deliberation detected - will return directly");
          const deliberationResult = await selfDeliberation(args.topic);

          // Store the tool result for direct return
          directToolResponse = deliberationResult;

          // Add the tool response to history immediately after the assistant message with tool_calls
          chatHistory[senderId].push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: deliberationResult ?? "No output",
          });

          // Add a final message to history indicating direct return
          chatHistory[senderId].push({
            role: "assistant",
            content: "I've completed a comprehensive analysis on this topic.",
          });

          // Break out of the tool processing loop
          break;
        } else if (toolName === "explainTopic") {
          console.log("Deep explanation detected - will return directly");
          const explanationResult = await explainTopic(args.topic);

          // Store the tool result for direct return
          directToolResponse = explanationResult;

          chatHistory[senderId].push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: explanationResult ?? "No output",
          });

          // Add a final message to history indicating direct return
          chatHistory[senderId].push({
            role: "assistant",
            content:
              "I've completed a comprehensive explanation on this topic.",
          });

          break;
        } else {
          // Normal tool processing
          const toolResult = await executeTool(
            toolName,
            args,
            senderId,
            senderName,
            senderRole,
            res
          );

          await logMessage({
            senderId,
            senderName: `Tool: ${toolName}`,
            senderRole: "tool",
            content: toolResult || "No output",
            toolCallId: toolCall.id,
            conversationId: conversationId || senderId,
          });

          // Add each tool response immediately after execution
          chatHistory[senderId].push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult ?? "No output",
          });

          toolResults.push({
            tool_call_id: toolCall.id,
            output: toolResult ?? "No output",
          });
        }
      }

      // If we have a direct tool response, break the loop early
      if (directToolResponse) {
        break;
      }

      // Get a new response based on the updated history
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant capable of using tools. Always execute tools if needed before responding.`,
          },
          ...chatHistory[senderId],
        ],
        tools,
        tool_choice: "auto",
      });

      responseMessage = response.choices[0].message;

      // Add the new assistant response to history
      if (responseMessage.content) {
        if (responseMessage.content) {
          await logMessage({
            senderId,
            senderName: "AI Assistant",
            senderRole: "assistant",
            content: responseMessage.content,
            conversationId: conversationId || senderId,
          });

          chatHistory[senderId].push({
            role: "assistant",
            content: responseMessage.content,
          });
        }

        chatHistory[senderId].push({
          role: "assistant",
          content: responseMessage.content,
        });
      }
    }

    // Send final response - use direct tool response if available
    return res.json({
      senderId,
      senderName,
      senderRole: "assistant",
      message:
        directToolResponse ||
        responseMessage.content ||
        "No response generated",
    });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({ error: "Failed to process AI request" });
  }
};

export const getTools = async (req, res) => {
  try {
    const formattedTools = tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
    }));

    res.json(formattedTools);
  } catch (error) {
    res.status(500).json({ error: "Error getting tools" });
  }
};
