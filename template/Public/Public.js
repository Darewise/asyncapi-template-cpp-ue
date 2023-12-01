
import { File, Text, render } from '@asyncapi/generator-react-sdk';

// Import custom components from file 
import { Mustache } from '../../components/mustache';
import { initView, getMessageView } from '../../helpers/unreal';

export default function ({ asyncapi, params }) {

  const view = initView({ asyncapi, params });
  const modelNamePrefix = view.modelNamePrefix;
  const unrealModuleName = view.unrealModuleName;

  const helperFiles = [
    <File name={`${modelNamePrefix}BaseModel.h`}>
      <Mustache template="mustache/model-base-header.mustache" data={asyncapi} />
    </File>,
    <File name={`${modelNamePrefix}Helpers.h`}>
      <Mustache template="mustache/helpers-header.mustache" data={asyncapi} />
    </File>
  ];

  const messages = asyncapi.allMessages();
  let messageFiles = []
  asyncapi.allMessages().forEach((message) => {
    const messageView = getMessageView(message);
    const fullView = { ...view , models: ...messageView };

    messageFiles.push(
      <File name={`${modelNamePrefix}${fullView.classname}.h`}>
        <Mustache template="mustache/model-source.mustache" data={fullView} />
      </File>
    );
  });

  return [...helperFiles, ...messageFiles];
}