#!/usr/bin/env node

/**
 * This script generates all the necessary icon files from the SVGs in the universal_branding folder.
 * It ensures that all branding assets are derived from the same source files.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
// eslint-disable-next-line import/no-extraneous-dependencies
const sharp = require('sharp');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
// eslint-disable-next-line import/no-extraneous-dependencies
const toIco = require('to-ico');

console.log('Generating icon files from universal_branding SVGs...');

// Ensure the script is run from the project root
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);
console.log('Project root:', projectRoot);
// Paths to source SVGs
const logoSvgPath = path.join(projectRoot, 'universal_branding', 'logo.svg'); // primary logo
const logoBwSvgPath = path.join(projectRoot, 'universal_branding', 'logo-bw.svg'); // black and white logo
const splashSvgPath = path.join(projectRoot, 'universal_branding', 'codexSplash.svg'); // splash screen

// Define output directories
const electronResourcesDir = path.join(projectRoot, 'applications', 'electron', 'resources');
const electronResourcesIconsDir = path.join(electronResourcesDir, 'icons');

// Check if source SVGs exist
if (!fs.existsSync(logoSvgPath)) {
  console.error(`Error: Source SVG not found at ${logoSvgPath}`);
  process.exit(1);
}

if (!fs.existsSync(logoBwSvgPath)) {
  console.error(`Error: Source B&W SVG not found at ${logoBwSvgPath}`);
  process.exit(1);
}

// Define all directories needed
const directories = [
  'applications/electron/resources/icons',
  'applications/electron/resources/icons/WindowsLauncherIcon',
  'applications/electron/resources/icons/MacLauncherIcon',
  'applications/electron/resources/icons/LinuxLauncherIcons',
  'applications/electron/resources/icons/WindowIcon',
  'applications/electron/resources/icons/InstallerSidebarImage',
  'applications/electron/resources/icons/MacLauncherIcon/icns-1bit',
  'applications/electron/resources/icons/MacLauncherIcon/icns-8bit',
  'applications/electron/resources/icons/WindowsLauncherIcon/windowsICO-24bit',
  'applications/electron/resources/icons/WindowsLauncherIcon/windowsICO-8bits',
  'theia-extensions/product/src/browser/icons'
];

// Create necessary directories
async function createDirectories() {
  for (const dir of directories) {
    const fullPath = path.join(projectRoot, dir);
    if (!fs.existsSync(fullPath)) {
      await mkdirAsync(fullPath, { recursive: true });
      console.log(`Created directory: ${fullPath}`);
    }
  }
}

// Generate PNG files at different sizes
async function generatePng(inputPath, outputPath, width, height, options = {}) {
  try {
    console.log(`Generating PNG: ${outputPath} (${width}x${height})`);

    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: Input file does not exist: ${inputPath}`);
      return false;
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      await mkdirAsync(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}`);
    }

    const sharpInstance = sharp(inputPath);

    // Apply options
    if (options.background) {
      sharpInstance.flatten({ background: options.background });
    }

    // Apply grayscale if requested
    if (options.grayscale) {
      sharpInstance.grayscale();
    }

    // Resize
    sharpInstance.resize(width, height, {
      fit: options.fit || 'contain',
      background: options.background || { r: 0, g: 0, b: 0, alpha: 0 }
    });

    // Output format
    if (options.format === 'bmp') {
      // BMP is not directly supported by Sharp, use PNG instead and rename
      sharpInstance.png();

      // Save as PNG first
      const pngPath = outputPath.replace('.bmp', '.png');
      await sharpInstance.toFile(pngPath);

      // For BMP files, we'll just create a placeholder since Sharp doesn't support BMP directly
      fs.writeFileSync(outputPath, Buffer.from('BMP placeholder - use a tool like ImageMagick to convert from PNG', 'utf8'));
      console.log(`Generated BMP placeholder: ${outputPath}`);
      console.log(`Generated PNG for BMP conversion: ${pngPath}`);
      return true;
    } else {
      sharpInstance.png();
      await sharpInstance.toFile(outputPath);
      console.log(`Generated: ${outputPath}`);
      return true;
    }
  } catch (error) {
    console.error(`Error generating ${outputPath} (${width}x${height}):`, error.message);
    console.error(`Stack trace: ${error.stack}`);
    return false;
  }
}

// Convert PNG to ICO using to-ico
async function convertPngToIco(pngPath, icoPath, sizes = [16, 24, 32, 48, 64, 128, 256]) {
  try {
    // Read the PNG file
    const pngBuffer = fs.readFileSync(pngPath);
    // Convert to ICO
    const icoBuffer = await toIco([pngBuffer], {
      sizes: sizes,
      resize: true
    });
    // Write the ICO file
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`Generated ICO: ${icoPath}`);
    return true;
  } catch (error) {
    console.error(`Error converting to ICO ${icoPath}:`, error.message);
    return false;
  }
}

// Generate Windows ICO files
async function generateWindowsIcons() {
  console.log('Generating Windows icon files...');
  const sizes = [16, 32, 48, 64, 128, 256];
  const icoDir = path.join(projectRoot, 'applications/electron/resources/icons/WindowsLauncherIcon');

  // Generate the main ICO file
  const mainPngPath = path.join(icoDir, 'temp-main.png');
  await generatePng(logoSvgPath, mainPngPath, 256, 256);
  await convertPngToIco(mainPngPath, path.join(icoDir, 'TheiaIDE.ico'), sizes);
  fs.unlinkSync(mainPngPath);

  // Generate 24-bit ICO files
  const ico24bitDir = path.join(icoDir, 'windows ICO0-24bit');
  for (const size of sizes) {
    if (size > 256) { continue; } // ICO format typically limited to 256x256

    const pngPath = path.join(ico24bitDir, `temp-${size}.png`);
    await generatePng(logoSvgPath, pngPath, size, size);
    await convertPngToIco(pngPath, path.join(ico24bitDir, `${size}-${size}.ico`), [size]);
    fs.unlinkSync(pngPath);
  }

  // Generate 8-bit ICO files (grayscale)
  const ico8bitDir = path.join(icoDir, 'windowsICO-8bits');
  for (const size of sizes) {
    if (size > 256) { continue; }

    const pngPath = path.join(ico8bitDir, `temp-${size}.png`);
    await generatePng(logoBwSvgPath, pngPath, size, size, { grayscale: true });
    await convertPngToIco(pngPath, path.join(ico8bitDir, `${size}-${size}.ico`), [size]);
    fs.unlinkSync(pngPath);
  }
}

// Generate macOS ICNS files (or PNG placeholders on non-macOS)
async function generateMacIcons() {
  console.log('Generating macOS icon files...');
  const icnsDir = path.join(projectRoot, 'applications/electron/resources/icons/MacLauncherIcon');
  const isMac = process.platform === 'darwin';

  // First, remove any existing ICNS files to ensure clean generation
  removeExistingIcnsFiles();

  // Generate the main PNG for MacLauncherIcon
  const mainPngPath = path.join(icnsDir, '512-512-2.png');
  await generatePng(logoSvgPath, mainPngPath, 512, 512);

  // Create ICNS files or placeholders
  if (isMac) {
    // On macOS, try to use iconutil
    try {
      const iconsetDir = path.join(icnsDir, 'temp.iconset');
      if (!fs.existsSync(iconsetDir)) {
        await mkdirAsync(iconsetDir, { recursive: true });
      }

      // Generate iconset files
      await generatePng(logoSvgPath, path.join(iconsetDir, 'icon_16x16.png'), 16, 16);
      await generatePng(logoSvgPath, path.join(iconsetDir, 'icon_32x32.png'), 32, 32);
      await generatePng(logoSvgPath, path.join(iconsetDir, 'icon_128x128.png'), 128, 128);
      await generatePng(logoSvgPath, path.join(iconsetDir, 'icon_256x256.png'), 256, 256);
      await generatePng(logoSvgPath, path.join(iconsetDir, 'icon_512x512.png'), 512, 512);

      // Convert to ICNS
      execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(icnsDir, '512-512-2.icns')}"`);
      execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(icnsDir, 'Theia-16bp-alfa ignored.icns')}"`);
      execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(electronResourcesDir, 'icon.icns')}"`);

      // Clean up
      execSync(`rm -rf "${iconsetDir}"`);
      console.log('Generated ICNS files using iconutil');
    } catch (error) {
      console.error('Error using iconutil:', error.message);
      console.log('Falling back to placeholder files');
      createPlaceholderIcnsFiles();
    }
  } else {
    // On non-macOS, create placeholder files
    createPlaceholderIcnsFiles();
  }

  // Generate PNG files for all the sizes in icns-8bit
  const icns8bitDir = path.join(icnsDir, 'icns-8bit');
  const sizes = [16, 32, 48, 128, 256, 512];

  for (const size of sizes) {
    // Generate PNG file
    await generatePng(
      logoSvgPath,
      path.join(icns8bitDir, `${size}-${size}.png`),
      size,
      size
    );

    // Create placeholder ICNS file
    if (!isMac) {
      fs.writeFileSync(
        path.join(icns8bitDir, `${size}-${size}.icns`),
        Buffer.from(`ICNS placeholder for ${size}x${size}`, 'utf8')
      );
    }
  }

  // Generate PNG files for all the sizes in icns-1bit
  const icns1bitDir = path.join(icnsDir, 'icns-1bit');
  for (const size of sizes) {
    // Generate PNG file
    await generatePng(
      logoBwSvgPath,
      path.join(icns1bitDir, `${size}-${size}.png`),
      size,
      size,
      { grayscale: true }
    );

    // Create placeholder ICNS file
    if (!isMac) {
      fs.writeFileSync(
        path.join(icns1bitDir, `${size}-${size}.icns`),
        Buffer.from(`ICNS placeholder for ${size}x${size} (1-bit)`, 'utf8')
      );
    }
  }

  // Special case for 512-512-2 copy
  await generatePng(
    logoBwSvgPath,
    path.join(icns1bitDir, '512-512-2 copy.png'),
    512,
    512,
    { grayscale: true }
  );

  if (!isMac) {
    fs.writeFileSync(
      path.join(icns1bitDir, '512-512-2 copy.icns'),
      Buffer.from('ICNS placeholder for 512x512-2 copy (1-bit)', 'utf8')
    );
  }

  // Helper function to create placeholder ICNS files
  function createPlaceholderIcnsFiles() {
    // Create placeholder ICNS files with correct names
    fs.writeFileSync(
      path.join(icnsDir, '512-512-2.icns'),
      Buffer.from('ICNS placeholder for 512-512-2', 'utf8')
    );

    fs.writeFileSync(
      path.join(icnsDir, 'Theia-16bp-alfa ignored.icns'),
      Buffer.from('ICNS placeholder for Theia-16bp-alfa ignored', 'utf8')
    );

    fs.writeFileSync(
      path.join(electronResourcesDir, 'icon.icns'),
      Buffer.from('ICNS placeholder for main icon', 'utf8')
    );

    console.log('Created placeholder ICNS files');
  }

  // Helper function to remove existing ICNS files
  function removeExistingIcnsFiles() {
    const dirsToCheck = [
      icnsDir,
      path.join(icnsDir, 'icns-1bit'),
      path.join(icnsDir, 'icns-8bit'),
      electronResourcesDir
    ];

    for (const dir of dirsToCheck) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith('.icns')) {
            const filePath = path.join(dir, file);
            try {
              fs.unlinkSync(filePath);
              console.log(`Removed existing ICNS file: ${filePath}`);
            } catch (error) {
              console.error(`Error removing file ${filePath}:`, error.message);
            }
          }
        }
      }
    }
  }
}

// Generate Linux PNG files
async function generateLinuxIcons() {
  console.log('Generating Linux PNG files...');
  const linuxDir = path.join(projectRoot, 'applications/electron/resources/icons/LinuxLauncherIcons');

  // Generate the main Linux icon
  await generatePng(
    logoSvgPath,
    path.join(linuxDir, '512x512.png'),
    512,
    512
  );
}

// Generate Window Icon PNG
async function generateWindowIcon() {
  console.log('Generating Window Icon PNG...');
  await generatePng(
    logoSvgPath,
    path.join(projectRoot, 'applications/electron/resources/icons/WindowIcon/512-512.png'),
    512,
    512
  );
}

// Generate Installer Sidebar BMP files
async function generateInstallerSidebar() {
  console.log('Generating Installer Sidebar BMP files...');
  const sidebarDir = path.join(projectRoot, 'applications/electron/resources/icons/InstallerSidebarImage');

  // Generate Windows installer sidebar BMP (164×314 pixels)
  await generatePng(
    logoSvgPath,
    path.join(sidebarDir, '164-314Windows.bmp'),
    164,
    314,
    {
      format: 'bmp',
      background: '#FFFFFF'
    }
  );

  // Generate iOS installer sidebar BMP (164×314 pixels)
  await generatePng(
    logoSvgPath,
    path.join(sidebarDir, '164-314IOS.bmp'),
    164,
    314,
    {
      format: 'bmp',
      background: '#FFFFFF'
    }
  );

  // Generate the main installerSidebar.bmp in resources directory
  await generatePng(
    logoSvgPath,
    path.join(electronResourcesDir, 'installerSidebar.bmp'),
    164,
    314,
    {
      format: 'bmp',
      background: '#FFFFFF'
    }
  );
}

// Generate product extension icons
async function generateProductIcons() {
  console.log('Generating product extension icons...');
  const productIconsDir = path.join(projectRoot, 'theia-extensions/product/src/browser/icons');

  // Create directories if they don't exist
  if (!fs.existsSync(productIconsDir)) {
    await mkdirAsync(productIconsDir, { recursive: true });
  }

  // Generate the product extension icons
  const iconPaths = [
    { width: 512, height: 512, name: '512-512.png', source: logoSvgPath },
    { width: 64, height: 64, name: 'codex-logo.png', source: logoSvgPath },
    { width: 250, height: 118, name: 'codex-wordmark.png', source: splashSvgPath },
    { width: 128, height: 128, name: 'TheiaIDE.png', source: logoSvgPath }
  ];

  for (const { width, height, name, source } of iconPaths) {
    await generatePng(
      source,
      path.join(productIconsDir, name),
      width,
      height
    );
  }

  // Create README file to indicate these files are generated
  const readmePath = path.join(productIconsDir, 'README.md');
  const readmeContent = `# Branding Assets

**IMPORTANT**: All files in this directory are automatically generated from the SVGs in the \`universal_branding\` folder.
Do not edit these files directly. Instead, update the source SVGs and run the \`generate-icons.js\` script.

Source files:
- \`/universal_branding/logo.svg\` - Main logo
- \`/universal_branding/logo-bw.svg\` - Black and white version
- \`/universal_branding/codexSplash.svg\` - Splash screen

To regenerate these files, run:
\`\`\`
node scripts/generate-icons.js
\`\`\`
`;
  await writeFileAsync(readmePath, readmeContent);
}

// Function to generate icons in the resources directory with B&W preference
async function generateResourcesIcons() {
  console.log('Generating icons in resources directory...');

  // Check if B&W logo exists
  const useBwLogo = fs.existsSync(logoBwSvgPath);

  if (!useBwLogo) {
    console.warn('Warning: B&W logo not found. Using regular logo for resources directory icons.');
  }

  const sourceLogo = useBwLogo ? logoBwSvgPath : logoSvgPath;
  const grayscaleOption = useBwLogo ? { grayscale: true } : {};

  // Generate icon.ico
  const mainIconPngPath = path.join(electronResourcesDir, 'temp-icon.png');
  await generatePng(sourceLogo, mainIconPngPath, 256, 256, grayscaleOption);
  await convertPngToIco(mainIconPngPath, path.join(electronResourcesDir, 'icon.ico'), [16, 24, 32, 48, 64, 128, 256]);
  fs.unlinkSync(mainIconPngPath);

  // Generate icon.icns or placeholder
  if (process.platform === 'darwin') {
    try {
      const iconsetDir = path.join(electronResourcesDir, 'temp.iconset');
      if (!fs.existsSync(iconsetDir)) {
        await mkdirAsync(iconsetDir, { recursive: true });
      }

      // Generate iconset files
      await generatePng(sourceLogo, path.join(iconsetDir, 'icon_16x16.png'), 16, 16, grayscaleOption);
      await generatePng(sourceLogo, path.join(iconsetDir, 'icon_32x32.png'), 32, 32, grayscaleOption);
      await generatePng(sourceLogo, path.join(iconsetDir, 'icon_128x128.png'), 128, 128, grayscaleOption);
      await generatePng(sourceLogo, path.join(iconsetDir, 'icon_256x256.png'), 256, 256, grayscaleOption);
      await generatePng(sourceLogo, path.join(iconsetDir, 'icon_512x512.png'), 512, 512, grayscaleOption);

      // Convert to ICNS
      execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(electronResourcesDir, 'icon.icns')}"`);

      // Clean up
      execSync(`rm -rf "${iconsetDir}"`);
    } catch (error) {
      console.error('Error generating icon.icns:', error.message);
      fs.writeFileSync(
        path.join(electronResourcesDir, 'icon.icns'),
        Buffer.from('ICNS placeholder for main icon', 'utf8')
      );
    }
  } else {
    fs.writeFileSync(
      path.join(electronResourcesDir, 'icon.icns'),
      Buffer.from('ICNS placeholder for main icon', 'utf8')
    );
  }

  // Generate installerSidebar.bmp
  await generatePng(
    sourceLogo,
    path.join(electronResourcesDir, 'installerSidebar.bmp'),
    164,
    314,
    {
      ...grayscaleOption,
      format: 'bmp',
      background: '#FFFFFF'
    }
  );

  // Generate B&W icon in icons directory
  await generatePng(
    sourceLogo,
    path.join(projectRoot, 'applications/electron/resources/icons/512x512.png'),
    512,
    512,
    grayscaleOption
  );
}

// Main function to run all generation tasks
async function main() {
  try {
    console.log('Starting icon generation process...');

    // Create necessary directories
    console.log('Creating directories...');
    await createDirectories();
    console.log('Directories created successfully.');

    // Generate all icons
    console.log('Starting Windows icons generation...');
    await generateWindowsIcons();
    console.log('Windows icons generated successfully.');

    console.log('Starting Mac icons generation...');
    await generateMacIcons();
    console.log('Mac icons generated successfully.');

    console.log('Starting Linux icons generation...');
    await generateLinuxIcons();
    console.log('Linux icons generated successfully.');

    console.log('Starting Window icon generation...');
    await generateWindowIcon();
    console.log('Window icon generated successfully.');

    console.log('Starting Installer sidebar generation...');
    await generateInstallerSidebar();
    console.log('Installer sidebar generated successfully.');

    console.log('Starting Product icons generation...');
    await generateProductIcons();
    console.log('Product icons generated successfully.');

    // Generate resources directory icons with B&W preference
    console.log('Starting Resources icons generation...');
    await generateResourcesIcons();
    console.log('Resources icons generated successfully.');

    console.log('All icons generated successfully!');

    // Clean up any .icns.png files that might have been created by mistake
    console.log('Cleaning up incorrect files...');
    cleanupIncorrectFiles();
    console.log('Cleanup completed.');

    // Provide information about platform-specific limitations
    if (process.platform !== 'darwin') {
      console.warn('\nNote: ICNS files are placeholder files on non-macOS platforms.');
      console.warn('For production builds, you should run this script on macOS or use a third-party tool to create proper ICNS files.');
      console.warn('\nNote: BMP files are placeholder files. PNG versions have been generated for conversion.');
      console.warn('For production builds, convert the PNG files to BMP using a tool like ImageMagick.');
    }
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Function to clean up any incorrect files and remove unexpected file types
function cleanupIncorrectFiles() {
  // Use different variable names to avoid conflict with outer scope
  const macIconsDir = path.join(projectRoot, 'applications/electron/resources/icons/MacLauncherIcon');
  const macIcons1bitDir = path.join(macIconsDir, 'icns-1bit');
  const macIcons8bitDir = path.join(macIconsDir, 'icns-8bit');
  const windowsIconsDir = path.join(projectRoot, 'applications/electron/resources/icons/WindowsLauncherIcon');
  const windowsIco24bitDir = path.join(windowsIconsDir, 'windows ICO0-24bit');
  const windowsIco8bitsDir = path.join(windowsIconsDir, 'windowsICO-8bits');
  const linuxIconsDir = path.join(projectRoot, 'applications/electron/resources/icons/LinuxLauncherIcons');
  const windowIconDir = path.join(projectRoot, 'applications/electron/resources/icons/WindowIcon');
  const installerSidebarDir = path.join(projectRoot, 'applications/electron/resources/icons/InstallerSidebarImage');

  // Define allowed file extensions for each directory
  const allowedExtensions = {
    [macIconsDir]: ['.icns', '.png'],
    [macIcons1bitDir]: ['.icns', '.png'],
    [macIcons8bitDir]: ['.icns', '.png'],
    [windowsIconsDir]: ['.ico', '.png'],
    [windowsIco24bitDir]: ['.ico', '.png'],
    [windowsIco8bitsDir]: ['.ico', '.png'],
    [linuxIconsDir]: ['.png'],
    [windowIconDir]: ['.png'],
    [installerSidebarDir]: ['.bmp', '.png'],
    [electronResourcesDir]: ['.ico', '.icns', '.bmp', '.png', '.html'] // Also allow HTML for preload.html
  };

  // Check for and remove any .icns.png files
  const dirsToCheck = [
    macIconsDir, macIcons1bitDir, macIcons8bitDir,
    windowsIconsDir, windowsIco24bitDir, windowsIco8bitsDir,
    linuxIconsDir, windowIconDir, installerSidebarDir,
    electronResourcesDir
  ];

  for (const dir of dirsToCheck) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);

        // Skip directories
        if (fs.statSync(filePath).isDirectory()) {
          continue;
        }

        // Check if file has .icns.png extension (incorrect)
        if (file.endsWith('.icns.png')) {
          try {
            fs.unlinkSync(filePath);
            console.log(`Removed incorrect file: ${filePath}`);
          } catch (error) {
            console.error(`Error removing file ${filePath}:`, error.message);
          }
          continue;
        }

        // Check if file has an allowed extension for this directory
        const ext = path.extname(file).toLowerCase();
        const allowed = allowedExtensions[dir] || ['.png']; // Default to allowing only PNGs

        if (!allowed.includes(ext) && file !== 'LICENSE' && file !== 'README.md') {
          try {
            fs.unlinkSync(filePath);
            console.log(`Removed unexpected file type: ${filePath}`);
          } catch (error) {
            console.error(`Error removing file ${filePath}:`, error.message);
          }
        }
      }
    }
  }
}

// Check if Sharp is installed
try {
  require.resolve('sharp');
  // Run the main function
  main();
} catch (error) {
  console.error('Error: The Sharp package is not installed. Please install it with:');
  console.error('npm install sharp --save-dev');
  console.error('or');
  console.error('yarn add sharp --dev');
  process.exit(1);
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
