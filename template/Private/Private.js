import { File, Text, render } from '@asyncapi/generator-react-sdk';

// Import custom components from file 
import { Mustache } from '../../components/mustache';
import { initView, getMessageView, getTopicView } from '../../helpers/unreal';

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

  let messageFiles = []
  asyncapi.allMessages().forEach((message) => {
    const messageView = getMessageView(message);
    const fullView = { ...view , models: { ...messageView }};
    fullView.filename = modelNamePrefix + messageView.classname;

    messageFiles.push(
      <File name={`${fullView.filename}.cpp`}>
        <Mustache template="mustache/model-source.mustache" data={fullView} />
      </File>
    );
  });

  let topicFiles = []
  asyncapi.allChannels().forEach((channel) => {
    const topicView = getTopicView(channel);
    const fullView = { ...view , ...topicView };

    topicFiles.push(
      <File name={`${modelNamePrefix}${topicView.classname}.cpp`}>
        <Mustache template="mustache/topic-source.mustache" data={fullView} />
      </File>
    );
  });

  return [...helperFiles, ...projectFiles, ...messageFiles, ...topicFiles];
}
