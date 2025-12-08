import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputFile = path.join(__dirname, '../public/images/logo.png');
const outputDir = path.join(__dirname, '../public/images');

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`❌ Logo file not found: ${inputFile}`);
  console.log('📝 Please ensure logo.png exists in public/images/ directory');
  process.exit(1);
}

console.log('🎨 Generating PWA icons from logo.png...\n');

// Generate all icon sizes
Promise.all(
  sizes.map(size => {
    const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
    
    return sharp(inputFile)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toFile(outputFile)
      .then(() => {
        console.log(`✅ Generated icon-${size}x${size}.png`);
      })
      .catch(err => {
        console.error(`❌ Failed to generate icon-${size}x${size}.png:`, err.message);
      });
  })
)
.then(() => {
  console.log('\n🎉 All PWA icons generated successfully!');
  console.log('📱 Your app is now ready to be installed as a PWA');
  console.log('\n📋 Next steps:');
  console.log('   1. Run: npm run build');
  console.log('   2. Test on mobile device');
  console.log('   3. Look for "Add to Home Screen" prompt');
})
.catch(err => {
  console.error('\n❌ Error generating icons:', err);
  process.exit(1);
});
