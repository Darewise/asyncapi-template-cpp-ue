import { File, Text, render } from '@asyncapi/generator-react-sdk';

// Import custom components from file 
import { Mustache } from '../../components/mustache';
import { TestFile } from '../../components/common';
import { toCppValidPascalCase } from '../../helpers/unreal';

/* 
 * Each template to be rendered must have as a root component a File component,
 * otherwise it will be skipped.
 * 
 * If you don't want to render anything, you can return `null` or `undefined` and then Generator will skip the given template.
 * 
 * Below you can see how reusable chunks (components) could be called.
 * Just write a new component (or import it) and place it inside the File or another component.
 * 
 * Notice that you can pass parameters to components. In fact, underneath, each component is a pure Javascript function.
 */
export default function({ asyncapi, params }) {

  

  if (!asyncapi.hasComponents()) {
    console.log("no components");
    return null;
  }

    // for debugging the input
  // console.dir(asyncapi, { depth: null });

  const modelNamePrefix = "modelNamePrefix";

  const helperFiles = [
    <File name={`${modelNamePrefix}Helpers.cpp`}>
      <Mustache template="mustache/helpers-source.mustache" data={asyncapi} />
    </File>
  ];

  const unrealModuleName = "module";

  // only include if it's in the parameters
  const projectFiles = [
    <File name={`${unrealModuleName}Module.h`}>
      <Mustache template="mustache/module-header.mustache" data={asyncapi} />
    </File>,
    <File name={`${unrealModuleName}Module.cpp`}>
      <Mustache template="mustache/module-source.mustache" data={asyncapi} />
    </File>
  ];

  const schemas = asyncapi.allSchemas();
  const schemaFiles = Array.from(schemas).map(([schemaName, schema]) => {
    const name = toCppValidPascalCase(schemaName);
    const modelNamePrefix = "modelNamePrefix";
 
    return (
    <File name={`${modelNamePrefix}${name}.cpp`}>
        <Mustache template="mustache/model-source.mustache" data={asyncapi} />
    </File>
    );
  });

  return [...helperFiles, ...projectFiles, ...schemaFiles];
}
