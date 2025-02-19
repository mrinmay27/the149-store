import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [
  16,
  32,
  72,
  96,
  128,
  144,
  152,
  192,
  384,
  512
];

async function generateIcons(sourceIcon) {
  // Convert to absolute path if relative
  const absoluteSourcePath = path.isAbsolute(sourceIcon) 
    ? sourceIcon 
    : path.join(process.cwd(), sourceIcon);

  // Create icons directory if it doesn't exist
  const iconsDir = path.join(__dirname, '../public/icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('🎨 Generating icons...');
  console.log('Source icon:', absoluteSourcePath);
  console.log('Output directory:', iconsDir);

  try {
    // Verify source file exists and is readable
    await fs.promises.access(absoluteSourcePath, fs.constants.R_OK);
    
    // Process each size in parallel
    await Promise.all(sizes.map(async (size) => {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      try {
        await sharp(absoluteSourcePath)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toFile(outputPath);
        
        console.log(`✅ Generated ${size}x${size} icon`);
      } catch (error) {
        console.error(`❌ Error generating ${size}x${size} icon:`, error.message);
        throw error;
      }
    }));

    console.log('\n🎉 All icons generated successfully!');
    
    // Verify files exist
    console.log('\n🔍 Verifying generated files...');
    const missingFiles = sizes.filter(size => 
      !fs.existsSync(path.join(iconsDir, `icon-${size}x${size}.png`))
    );

    if (missingFiles.length > 0) {
      console.error('\n❌ Missing icons:', missingFiles.map(size => `${size}x${size}`).join(', '));
      process.exit(1);
    }

    console.log('✅ All files verified successfully!');
  } catch (error) {
    console.error('\n❌ Error generating icons:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Check if source icon is provided
const sourceIcon = process.argv[2];
if (!sourceIcon) {
  console.error('❌ Please provide the source icon path');
  console.log('Usage: node generate-icons.js <source-icon-path>');
  process.exit(1);
}

// Check if source icon exists
const absoluteSourcePath = path.isAbsolute(sourceIcon) 
  ? sourceIcon 
  : path.join(process.cwd(), sourceIcon);

if (!fs.existsSync(absoluteSourcePath)) {
  console.error(`❌ Source icon not found: ${absoluteSourcePath}`);
  process.exit(1);
}

generateIcons(sourceIcon); 