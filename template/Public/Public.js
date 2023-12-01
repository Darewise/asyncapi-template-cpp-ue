
import { File, Text, render } from '@asyncapi/generator-react-sdk';

// Import custom components from file 
import { Mustache } from '../../components/mustache';
import { initView, getMessageView, getTopicView } from '../../helpers/unreal';

export default function ({ asyncapi, params }) {

  const view = initView({ asyncapi, params });
  const modelNamePrefix = view.modelNamePrefix;
  const unrealModuleName = view.unrealModuleName;

  const helperFiles = [
    <File name={`${modelNamePrefix}BaseModel.h`}>
      <Mustache template="mustache/model-base-header.mustache" data={view} />
    </File>,
    <File name={`${modelNamePrefix}Helpers.h`}>
      <Mustache template="mustache/helpers-header.mustache" data={view} />
    </File>
  ];

  let messageFiles = []
  asyncapi.allMessages().forEach((message) => {
    const messageView = getMessageView(message);
    const fullView = { ...view , models: { ...messageView }};
    fullView.filename = modelNamePrefix + messageView.classname;

    messageFiles.push(
      <File name={`${fullView.filename}.h`}>
        <Mustache template="mustache/model-header.mustache" data={fullView} />
      </File>
    );
  });

  let topicFiles = []
  asyncapi.allChannels().forEach((channel) => {
    const topicView = getTopicView(channel);
    const fullView = { ...view , ...topicView };

    topicFiles.push(
      <File name={`${modelNamePrefix}${topicView.classname}.h`}>
        <Mustache template="mustache/topic-header.mustache" data={fullView} />
      </File>
    );
  });

  return [...helperFiles, ...messageFiles, ...topicFiles];
}