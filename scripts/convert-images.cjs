/**
 * Convert all .jpg/.jpeg images in src/assets/ and public/ to .webp
 * Usage: node scripts/convert-images.cjs
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const DIRS = [
  path.resolve(__dirname, "..", "src", "assets"),
  path.resolve(__dirname, "..", "public"),
];

async function convert() {
  let count = 0;
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g)$/i.test(f));
    for (const file of files) {
      const src = path.join(dir, file);
      const dest = path.join(dir, file.replace(/\.(jpe?g)$/i, ".webp"));
      if (fs.existsSync(dest)) {
        console.log(`  skip (exists): ${dest}`);
        continue;
      }
      await sharp(src).webp({ quality: 80 }).toFile(dest);
      const srcSize = (fs.statSync(src).size / 1024).toFixed(0);
      const destSize = (fs.statSync(dest).size / 1024).toFixed(0);
      console.log(`  ${file} -> .webp  (${srcSize} kB -> ${destSize} kB)`);
      count++;
    }
  }
  console.log(`\nConverted ${count} image(s).`);
}

convert().catch((err) => {
  console.error(err);
  process.exit(1);
});
