const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'book-258ee.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function checkBucket() {
    try {
        console.log(`Checking bucket: ${bucket.name}...`);
        const [exists] = await bucket.exists();
        console.log('Bucket exists:', exists);

        if (exists) {
            console.log('Listing files...');
            const [files] = await bucket.getFiles();
            console.log('Files found:', files.length);
            files.forEach(file => console.log(`- ${file.name}`));
        }
    } catch (err) {
        console.error('ERROR:', err);
    }
}

checkBucket();
