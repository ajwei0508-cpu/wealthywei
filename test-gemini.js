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
    // Attempt ListModels to find valid model names
    console.log("Listing available models...");
    // SDK doesn't expose listModels easily in Node with just the API Key in some versions,
    // but we can try common ones: gemini-1.5-flash, gemini-1.5-flash-latest, gemini-pro
    const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro", "gemini-2.0-flash-exp"];
    for (const m of models) {
      try {
        console.log(`Checking ${m}...`);
        const model = genAI.getGenerativeModel({ model: m });
        const res = await model.generateContent("test");
        console.log(`Success with ${m}!`);
        return m;
      } catch (e) {
        console.log(`Failed ${m}: ${e.status}`);
      }
    }
  } catch (error) {
    console.error("Critical error:", error);
  }
}

test();
