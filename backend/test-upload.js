// Test actual file upload to GCS
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

async function testUpload() {
    console.log('🔍 Testing actual file upload to GCS\n');

    const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
    const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;

    console.log(`Project: ${PROJECT_ID}`);
    console.log(`Bucket: ${GCS_BUCKET_NAME}\n`);

    try {
        const storage = new Storage();
        const bucket = storage.bucket(GCS_BUCKET_NAME);

        // Create a test file
        const testFileName = `test-uploads/test_${Date.now()}.txt`;
        const testContent = 'This is a test upload from the backend service account.';

        console.log(`📤 Attempting to upload test file: ${testFileName}`);

        const file = bucket.file(testFileName);
        await file.save(Buffer.from(testContent), {
            contentType: 'text/plain',
            metadata: {
                source: 'test-upload-script',
                uploadedAt: new Date().toISOString()
            }
        });

        console.log(`✅ Upload successful!`);
        console.log(`   File created at: gs://${GCS_BUCKET_NAME}/${testFileName}`);

        // Try to read it back
        console.log(`\n📥 Attempting to read the file back...`);
        const [contents] = await file.download();
        console.log(`✅ Read successful!`);
        console.log(`   Content: "${contents.toString()}"`);

        // Clean up
        console.log(`\n🗑️  Cleaning up test file...`);
        await file.delete();
        console.log(`✅ Test file deleted`);

        console.log(`\n🎉 All GCS operations successful! Upload permissions are working correctly.\n`);

    } catch (error) {
        console.error('❌ Upload test failed:', error.message);
        if (error.code) {
            console.error('   Error code:', error.code);
        }
        if (error.errors && error.errors.length > 0) {
            console.error('   Details:', error.errors[0]);
        }
    }
}

testUpload().catch(console.error);
