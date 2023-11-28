// TODO: convert the asyncapi parsed object into a openapi-generator compatible object in order to use the "same" mustache files and we're done

export function toCppValidCamelCase(input) {
    const sanitized = input.replace(/[^a-zA-Z0-9]+/g, '_');

    // Ensure the first letter and each letter following underscores are uppercase
    const camelCase = sanitized.replace(/(?:^|_)([a-zA-Z0-9])/g, (match, letter) => index === 0 ? letter.toLowerCase() : letter.toUpperCase());
  
    // Remove leading and trailing underscores
    return camelCase.replace(/_/g, '');
}
  
export function toCppValidPascalCase(input) {
    const sanitized = input.replace(/[^a-zA-Z0-9]+/g, '_');

    // Ensure the first letter and each letter following underscores are uppercase
    const pascalCase = sanitized.replace(/(?:^|_)([a-zA-Z0-9])/g, (match, letter) => letter.toUpperCase());
  
    // Remove leading and trailing underscores
    return pascalCase.replace(/_/g, '');
}