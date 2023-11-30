import { File, Text, render } from '@asyncapi/generator-react-sdk';

// Import custom components from file 
import { Mustache } from '../../components/mustache';
import { initView, addSchemaToView, toCppValidPascalCase, getSchemaView, getMessageView } from '../../helpers/unreal';

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
export default function ({ asyncapi, params }) {

  const view = initView({ asyncapi, params });
  const modelNamePrefix = view.modelNamePrefix;
  const unrealModuleName = view.unrealModuleName;

  const helperFiles = [
    <File name={`${modelNamePrefix}Helpers.cpp`}>
      <Mustache template="mustache/helpers-source.mustache" data={view} />
    </File>
  ];

  let projectFiles = []
  if (params.buildProjectFiles) {
    // only include if it's in the parameters
    projectFiles = [
      <File name={`${unrealModuleName}Module.h`}>
        <Mustache template="mustache/module-header.mustache" data={view} />
      </File>,
      <File name={`${unrealModuleName}Module.cpp`}>
        <Mustache template="mustache/module-source.mustache" data={view} />
      </File>
    ];
  }

  const messages = asyncapi.allMessages();
  let messageFiles = []
  asyncapi.allMessages().forEach((message) => {
    const messageView = getMessageView(message);
    const fullView = { ...view, ...messageView }

    messageFiles.push(
      <File name={`${modelNamePrefix}${fullView.name}.cpp`}>
        <Mustache template="mustache/model-source.mustache" data={fullView} />
      </File>
    );
  });

  return [...helperFiles, ...projectFiles, ...messageFiles];
}
