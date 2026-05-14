/**
 * Script to upload audio file to Cloudflare R2
 * 
 * Prerequisites:
 * 1. Install dependencies: npm install @aws-sdk/client-s3
 * 2. Set environment variables:
 *    - CLOUDFLARE_ACCOUNT_ID
 *    - CLOUDFLARE_ACCESS_KEY_ID
 *    - CLOUDFLARE_SECRET_ACCESS_KEY
 *    - CLOUDFLARE_BUCKET_NAME
 * 
 * Usage:
 *   node scripts/upload-to-cloudflare.js
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'YOUR_ACCOUNT_ID',
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || 'YOUR_ACCESS_KEY_ID',
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || 'YOUR_SECRET_ACCESS_KEY',
  bucketName: process.env.CLOUDFLARE_BUCKET_NAME || 'YOUR_BUCKET_NAME',
};

// File to upload
const audioFile = path.join(__dirname, '../apps/frontend/public/audio/success-sound.mp3');
const destinationKey = 'audio/success-sound.mp3';

// Create S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});

async function uploadFile() {
  try {
    console.log('🚀 Starting upload to Cloudflare R2...');
    console.log(`📁 File: ${audioFile}`);
    console.log(`🎯 Destination: ${destinationKey}`);

    // Check if file exists
    if (!fs.existsSync(audioFile)) {
      throw new Error(`File not found: ${audioFile}`);
    }

    // Read file
    const fileContent = fs.readFileSync(audioFile);
    const fileSize = fs.statSync(audioFile).size;

    console.log(`📊 File size: ${(fileSize / 1024).toFixed(2)} KB`);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: destinationKey,
      Body: fileContent,
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000', // Cache for 1 year
    });

    await s3Client.send(command);

    console.log('✅ Upload successful!');
    console.log(`\n📍 Public URL (after enabling public access):`);
    console.log(`   https://pub-${config.accountId}.r2.dev/${destinationKey}`);
    console.log(`\n⚙️  Next steps:`);
    console.log(`   1. Enable public access in R2 bucket settings`);
    console.log(`   2. Update apps/frontend/src/config/assets.ts with the public URL`);
    console.log(`   3. Change CURRENT_BASE to 'cloudflare' in assets.ts`);

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    
    if (error.message.includes('YOUR_')) {
      console.log('\n💡 Please set environment variables:');
      console.log('   export CLOUDFLARE_ACCOUNT_ID="your_account_id"');
      console.log('   export CLOUDFLARE_ACCESS_KEY_ID="your_access_key"');
      console.log('   export CLOUDFLARE_SECRET_ACCESS_KEY="your_secret_key"');
      console.log('   export CLOUDFLARE_BUCKET_NAME="your_bucket_name"');
      console.log('\nOr edit the config object in this script.');
    }
    
    process.exit(1);
  }
}

// Run upload
uploadFile();
