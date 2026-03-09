import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputDir = 'public/civs';
const outputDir = 'public/civs';

async function optimizeFlags() {
  const files = fs.readdirSync(inputDir);
  const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png'));

  console.log(`Found ${pngFiles.length} PNG files to optimize...`);

  for (const file of pngFiles) {
    const inputPath = path.join(inputDir, file);
    const outputName = file.replace(/\.[^/.]+$/, "") + ".webp";
    const outputPath = path.join(outputDir, outputName);

    try {
      await sharp(inputPath)
        .resize(800) // Resize to a maximum width of 800px
        .webp({ quality: 80 }) // Convert to WebP with 80% quality
        .toFile(outputPath);
      
      const oldSize = fs.statSync(inputPath).size;
      const newSize = fs.statSync(outputPath).size;
      const reduction = ((oldSize - newSize) / oldSize * 100).toFixed(1);
      
      console.log(`Optimized: ${file} -> ${outputName} (${reduction}% reduction)`);
    } catch (err) {
      console.error(`Error optimizing ${file}:`, err);
    }
  }

  console.log('Optimization complete!');
}

optimizeFlags();
