import { File, Text, render } from '@asyncapi/generator-react-sdk';

// Import custom components from file 
import { Mustache } from '../components/mustache';

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
    return null;
  }
  // for debugging the input
  // console.dir(asyncapi, { depth: null });

  const modelNamePrefix = "modelNamePrefix";
  const unrealModuleName = "module";

  // only include if it's in the parameters
  const projectFiles = [
    <File name={`${unrealModuleName}.Build.cs`}>
      <Mustache template="mustache/Build.cs.mustache" data={asyncapi} />
    </File>
  ];

  return projectFiles;
}
