require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AQ.Ab8RN6II9hyEXCLVQBud0JjBtFc56CsJF0wPgfuW4JEljLcK0Q');
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent("Hello, are you there?");
    console.log(result.response.text());
  } catch (error) {
    console.error("Error:", error);
  }
}
run();
