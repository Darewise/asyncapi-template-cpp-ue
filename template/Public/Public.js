import { generateFiles } from '../../helpers/unreal';

export default function ({ asyncapi, params }) {
  return generateFiles(asyncapi, params, true);
}
