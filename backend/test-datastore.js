// Test script to diagnose DataStore connection
const { SearchServiceClient } = require('@google-cloud/discoveryengine');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from the backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const LOCATION = 'us';
const APP_ID = 'samurai-insurance_1764794177586';

const searchClient = new SearchServiceClient({
    apiEndpoint: 'us-discoveryengine.googleapis.com',
});

console.log('Configuration:');
console.log('- Project ID:', PROJECT_ID);
console.log('- Location:', LOCATION);
console.log('- App ID:', APP_ID);
console.log('- Credentials:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

const servingConfig = searchClient.projectLocationCollectionEngineServingConfigPath(
    PROJECT_ID,
    LOCATION,
    'default_collection',
    APP_ID,
    'default_config'
);

console.log('\nConstructed serving config path:');
console.log(servingConfig);

// Try to search
(async () => {
    try {
        console.log('\nAttempting search...');

        const request = {
            servingConfig,
            query: 'test query',
            pageSize: 1,
        };

        const [response] = await searchClient.search(request);
        console.log('✅ Success! DataStore is accessible.');
        console.log('Response:', JSON.stringify(response, null, 2));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nFull error details:', error);

        // Try to list available data stores
        console.log('\n--- Attempting to list all DataStores ---');
        try {
            const parent = `projects/${PROJECT_ID}/locations/${LOCATION}`;
            console.log('Parent path:', parent);

            // Note: This might require different permissions
        } catch (listError) {
            console.error('Could not list datastores:', listError.message);
        }
    }
})();
