const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'book-258ee.firebasestorage.app'
});

const db = admin.firestore();
const storage = admin.storage().bucket();

async function uploadBooks() {
    console.log('Starting book upload...');

    // Read books.json
    const booksData = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../data/books.json'), 'utf8')
    );

    const batch = db.batch();

    for (const book of booksData) {
        const bookRef = db.collection('books').doc(book.id.toString());
        let coverUrl = book.cover;
        let fileUrl = book.file;

        // Upload cover image to Storage
        const coverPath = path.join(__dirname, '../data/covers', book.cover);
        if (fs.existsSync(coverPath)) {
            const destination = `covers/${book.cover}`;
            await storage.upload(coverPath, {
                destination,
                metadata: {
                    contentType: 'image/jpeg',
                    cacheControl: 'public, max-age=31536000'
                }
            });

            // Make cover publicly accessible
            await storage.file(destination).makePublic();

            // Get public URL
            coverUrl = `https://storage.googleapis.com/${storage.name}/${destination}`;
        }

        // Upload PDF file to Storage
        const filePath = path.join(__dirname, '../data/files', book.file);
        if (fs.existsSync(filePath)) {
            const destination = `files/${book.file}`;
            await storage.upload(filePath, {
                destination,
                metadata: {
                    contentType: 'application/pdf',
                    cacheControl: 'public, max-age=31536000'
                }
            });

            // Get download URL (requires authentication)
            const file = storage.file(destination);
            const [url] = await file.getSignedUrl({
                action: 'read',
                expires: '03-01-2500' // Far future date
            });
            fileUrl = destination; // Store path, will generate signed URL on client
        }

        // Add book to Firestore batch
        batch.set(bookRef, {
            id: book.id,
            title: book.title,
            author: book.author,
            category: book.category,
            price: book.price,
            description: book.description || '',
            coverUrl: coverUrl || '',
            fileUrl: fileUrl || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Processed: ${book.title}`);
    }

    // Commit batch
    await batch.commit();
    console.log(`Successfully uploaded ${booksData.length} books!`);
}

// Run the upload
uploadBooks()
    .then(() => {
        console.log('Upload complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error uploading books:', error);
        process.exit(1);
    });
