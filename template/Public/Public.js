import { File, Text, render } from '@asyncapi/generator-react-sdk';

// Import custom components from file 
import { Mustache } from '../../components/mustache';
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
    <File name={`${modelNamePrefix}BaseModel.h`}>
      <Mustache template="mustache/model-base-header.mustache" data={asyncapi} />
    </File>,
    <File name={`${modelNamePrefix}Helpers.h`}>
      <Mustache template="mustache/helpers-header.mustache" data={asyncapi} />
    </File>
  ];

  const unrealModuleName = "module";

  const schemas = asyncapi.allSchemas();
  const schemaFiles = Array.from(schemas).map(([schemaName, schema]) => {
    const sanitizedName = toCppValidPascalCase(schemaName);
    console.log ("input: ", schemaName, " pascalCase: ", sanitizedName )
    const modelNamePrefix = "modelNamePrefix";
 
    return (
    <File name={`${modelNamePrefix}${sanitizedName}.h`}>
        <Mustache template="mustache/model-header.mustache" data={asyncapi} />
    </File>
    );
  });

 //console.log("helperFiles files:", helperFiles);
  //console.log("schema files:", schemaFiles);

  return [...helperFiles, ...schemaFiles];
}
