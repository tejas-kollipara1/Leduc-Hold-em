import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = 'AIzaSyAbTgLvKjMHiiknRLKtaTxKh6IyZ6auFWo';

if (!apiKey) {
  console.error('VITE_GEMINI_API_KEY is not defined');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testConnection() {
  try {
    const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });
    const result = await model.generateContent('Say "Hello World"');
    console.log('Success:', result.response.text());
  } catch (error) {
    console.error('Error Details:', error);
  }
}

testConnection();
