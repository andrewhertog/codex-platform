const fs = require('fs');
const path = require('path');

// Create plugins directory if it doesn't exist
const pluginsDir = path.resolve('../../plugins');
if (!fs.existsSync(pluginsDir)) {
  fs.mkdirSync(pluginsDir, { recursive: true });
}

// Find .theia files and copy them
const files = fs.readdirSync('.').filter(f => f.endsWith('.theia'));
if (files.length > 0) {
  const file = files[0];
  const pluginName = file.replace('.theia', '');
  const pluginDir = path.join(pluginsDir, pluginName);
  
  // Create plugin directory if it doesn't exist
  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir, { recursive: true });
  }
  
  // Copy the file
  fs.copyFileSync(file, path.join(pluginsDir, file));
  console.log('Plugin file copied to plugins directory');
} 