const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');

// Get the plugin directory
const pluginDir = path.resolve(__dirname, '..'); // test-plugin directory
const pluginsDestDir = path.resolve(pluginDir, '../../plugins');

// Create plugins directory if it doesn't exist
if (!fs.existsSync(pluginsDestDir)) {
  fs.mkdirSync(pluginsDestDir, { recursive: true });
  console.log(`Created plugins directory: ${pluginsDestDir}`);
}

// Find .theia files
const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.theia'));

if (files.length === 0) {
  console.error('No .theia files found in the plugin directory');
  process.exit(1);
}

// Process each .theia file
files.forEach(file => {
  const pluginName = file.replace('.theia', '');
  const pluginDestDir = path.join(pluginsDestDir, pluginName);
  const theiaFilePath = path.join(pluginDir, file);
  
  // Create plugin destination directory if it doesn't exist
  if (!fs.existsSync(pluginDestDir)) {
    fs.mkdirSync(pluginDestDir, { recursive: true });
    console.log(`Created plugin directory: ${pluginDestDir}`);
  }
  
  // Copy the .theia file to the plugins directory
  const destTheiaFile = path.join(pluginsDestDir, file);
  fs.copyFileSync(theiaFilePath, destTheiaFile);
  console.log(`Copied ${file} to ${destTheiaFile}`);
  
  try {
    // Extract the .theia file (it's a zip file)
    const zip = new AdmZip(theiaFilePath);
    zip.extractAllTo(pluginDestDir, true);
    console.log(`Extracted ${file} to ${pluginDestDir}`);
  } catch (error) {
    console.error(`Error extracting ${file}: ${error.message}`);
    process.exit(1);
  }
});

console.log('Plugin processing completed successfully'); 