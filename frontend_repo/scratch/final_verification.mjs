import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

function getEnvValue(key) {
    const envPath = path.join(process.cwd(), '.env');
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : null;
}

async function verify() {
    const apiKey = getEnvValue('VITE_GEMINI_API_KEY');
    if (!apiKey) {
        console.error('API Key not found in .env');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        console.log('Verifying app logic with model: gemini-flash-latest...');
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const result = await model.generateContent('A high-roller just entered the casino. Greet them as Cyberbot.');
        console.log('--- RESPONSE START ---');
        console.log(result.response.text());
        console.log('--- RESPONSE END ---');
        console.log('SUCCESS: Uplink operational.');
    } catch (error) {
        console.error('UPLINK FAILURE:', error.message);
    }
}

verify();
