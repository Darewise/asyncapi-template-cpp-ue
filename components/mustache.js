import { Text, Indent } from '@asyncapi/generator-react-sdk';

function findMustacheDir(inputPath) {
    function containsMustache(dir) {
      const fs = require('fs'); 
      const items = fs.readdirSync(dir);
      return items.includes('mustache');
    }
  
    const path = require('path');
    let currentDirectory = path.resolve(inputPath);
  
    // Iterate through parent directories until found
    while (currentDirectory !== path.parse(currentDirectory).root) {
      if (containsMustache(currentDirectory)) {
        return currentDirectory;
      }
  
      currentDirectory = path.resolve(currentDirectory, '..');
    }
  
    return null;
  }

function getMustacheTemplatePath(templateFileName) {
    if (!templateFileName.endsWith('.mustache')) {
        templateFileName += '.mustache';
    }

    const path = require('path');
    return path.join(findMustacheDir(__dirname), 'mustache', templateFileName);
}

export function Mustache({ template, data }) {
    const fs = require('fs');  // Use fs.promises for async file operations
    const mustache = require('mustache');

    // Register the partial template
    const subTemplate = fs.readFileSync(getMustacheTemplatePath('licenseinfo.mustache'), 'utf8');
    const partials = {};
    partials.licenseInfo = subTemplate;

    // Reading the Mustache template file synchronously
    const templateContent = fs.readFileSync(getMustacheTemplatePath(template), 'utf8');

    // Rendering the template with Mustache
    const rendered = mustache.render(templateContent, data, partials);
    return <Text>{rendered}</Text>;
}