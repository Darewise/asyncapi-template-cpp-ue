
import { Text, Indent } from '@asyncapi/generator-react-sdk';


export function Mustache({ template, data }) {
    const fs = require('fs');  // Use fs.promises for async file operations
    const mustache = require('mustache');

    // Reading the Mustache template file synchronously
    const templateContent = fs.readFileSync(template, 'utf8');

    // Rendering the template with Mustache
    const rendered = mustache.render(templateContent, data);
    return <Text>{rendered}</Text>;
}