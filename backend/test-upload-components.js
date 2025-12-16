// Test script to diagnose upload issues
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');
const { VertexAI } = require('@google-cloud/vertexai');
const vision = require('@google-cloud/vision');

async function testComponents() {
    console.log('🔍 Testing Google Cloud Components\n');

    // 1. Test environment variables
    console.log('1️⃣  Checking environment variables...');
    const requiredEnvVars = [
        'GOOGLE_PROJECT_ID',
        'GCS_BUCKET_NAME',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY'
    ];

    let allEnvVarsPresent = true;
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            console.error(`   ❌ ${envVar} is not set`);
            allEnvVarsPresent = false;
        } else {
            console.log(`   ✅ ${envVar} is set`);
        }
    }

    if (!allEnvVarsPresent) {
        console.error('\n❌ Missing required environment variables');
        return;
    }

    console.log('\n2️⃣  Testing Google Cloud Storage...');
    try {
        const storage = new Storage();
        const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
        const [exists] = await bucket.exists();
        if (exists) {
            console.log(`   ✅ GCS bucket "${process.env.GCS_BUCKET_NAME}" is accessible`);
        } else {
            console.error(`   ❌ GCS bucket "${process.env.GCS_BUCKET_NAME}" does not exist`);
        }
    } catch (error) {
        console.error('   ❌ GCS Error:', error.message);
    }

    console.log('\n3️⃣  Testing Vision API (OCR)...');
    try {
        const visionClient = new vision.ImageAnnotatorClient();
        // Try a simple test - just check if client initializes
        console.log('   ✅ Vision API client initialized successfully');
    } catch (error) {
        console.error('   ❌ Vision API Error:', error.message);
    }

    console.log('\n4️⃣  Testing Vertex AI (Gemini)...');
    try {
        const vertexAI = new VertexAI({
            project: process.env.GOOGLE_PROJECT_ID,
            location: 'us-central1',
        });
        const model = vertexAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        console.log('   ✅ Vertex AI client initialized successfully');

        // Test a simple generation
        console.log('   Testing a simple text generation...');
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'Say "Hello" in one word.' }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 10 }
        });
        const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log(`   ✅ Gemini response: "${response.trim()}"`);
    } catch (error) {
        console.error('   ❌ Vertex AI Error:', error.message);
        if (error.stack) {
            console.error('   Stack:', error.stack);
        }
    }

    console.log('\n5️⃣  Testing Supabase connection...');
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Test a simple query
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error) {
            console.error('   ❌ Supabase Error:', error.message);
        } else {
            console.log('   ✅ Supabase connection successful');
        }
    } catch (error) {
        console.error('   ❌ Supabase Error:', error.message);
    }

    console.log('\n✨ Component testing complete!\n');
}

testComponents().catch(console.error);
