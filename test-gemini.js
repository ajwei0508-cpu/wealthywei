const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const [key, ...value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
      }
    });
  }
}

async function test() {
  loadEnv();
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log("Listing available models using REST API...");
    // Use standard fetch to list models via API key
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.error) {
       console.error("API Error:", data.error);
       return;
    }

    console.log("Available Models count:", data.models ? data.models.length : 0);
    if (data.models) {
      data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`));
    }

    if (data.models && data.models.length > 0) {
      // Find a model that supports generateContent
      const validModel = data.models.find(m => m.supportedGenerationMethods.includes('generateContent'));
      if (validModel) {
        const modelName = validModel.name.split('/').pop();
        console.log(`Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const res = await model.generateContent("test");
        console.log(`Success with ${modelName}! Response: ${res.response.text()}`);
      } else {
        console.log("No models found that support generateContent.");
      }
    } else {
      console.log("No models available for this API key.");
    }
  } catch (error) {
    console.error("Critical error:", error);
  }
}

test();
