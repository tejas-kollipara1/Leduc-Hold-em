import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = 'AIzaSyAbTgLvKjMHiiknRLKtaTxKh6IyZ6auFWo';
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
     const models = await genAI.listModels();
     console.log('Available Models:');
     models.models.forEach(m => console.log(`- ${m.name} (${m.displayName})` || m.name));
  } catch (error) {
     console.error('List Error Details:', error);
  }
}

listModels();
