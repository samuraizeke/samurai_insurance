// Test the upload endpoint like the frontend does
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testUploadEndpoint() {
    console.log('🔍 Testing /api/upload-policy endpoint\n');

    // Create a simple test PDF-like buffer
    const testContent = Buffer.from('%PDF-1.4\nTest Policy Document\nCarrier: State Farm\nPolicy Type: Auto Insurance\nThis is a test policy document.');

    // Save to temp file
    const testFilePath = '/tmp/test-policy.pdf';
    fs.writeFileSync(testFilePath, testContent);

    try {
        const formData = new FormData();
        formData.append('document', fs.createReadStream(testFilePath), {
            filename: 'test-policy.pdf',
            contentType: 'application/pdf'
        });
        formData.append('sessionId', 'test_session_123');

        console.log('📤 Sending upload request to http://localhost:8080/api/upload-policy');
        console.log('   Note: This will fail auth, but we can see the error\n');

        const response = await fetch('http://localhost:8080/api/upload-policy', {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const contentType = response.headers.get('content-type');
        let responseData;

        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
            console.log('\nResponse body (JSON):');
            console.log(JSON.stringify(responseData, null, 2));
        } else {
            responseData = await response.text();
            console.log('\nResponse body (text):');
            console.log(responseData);
        }

        // Clean up
        fs.unlinkSync(testFilePath);

    } catch (error) {
        console.error('❌ Request failed:', error.message);
        // Clean up
        try { fs.unlinkSync(testFilePath); } catch (e) {}
    }
}

testUploadEndpoint().catch(console.error);
