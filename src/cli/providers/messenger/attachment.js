import fs from 'fs';
import path from 'path';

import invariant from 'invariant';
import { MessengerClient } from 'messaging-api-messenger';
import readdir from 'recursive-readdir';
import fileType from 'file-type';
import readChunk from 'read-chunk';
import inquirer from 'inquirer';
import jsonfile from 'jsonfile';
import hasha from 'hasha';
import chalk from 'chalk';

import getConfig from '../../shared/getConfig';
import { error, warn, print, bold, log } from '../../shared/log';

const help = () => {
  console.log(`
    bottender messenger attachment <command> [option]

    ${chalk.dim('Commands:')}

      upload    Upload all the files in assets folder.
                Bottender will also create a bottender-lock.json file.

    ${chalk.dim('Options:')}

      --force   Upload all assets and regenerate bottender-lock.json.

    ${chalk.dim('Examples:')}

    ${chalk.dim('-')} Upload the assets to messenger

      ${chalk.cyan('$ bottender messenger attachment upload')}

    ${chalk.dim('-')} Force upload all assets

      ${chalk.cyan('$ bottender messenger attachment upload --force')}
  `);
};

const getFileType = file => {
  const imageType = ['jpg', 'png', 'jpeg', 'gif'];
  const videoType = ['avi', 'mp4', 'm4v'];
  const audioType = ['mp3', 'mid', 'm4a', 'wav'];

  const LENGTH_OF_FILE_MAGIC_NUMBERS = 4100;
  const buffer = readChunk.sync(file, 0, LENGTH_OF_FILE_MAGIC_NUMBERS);

  let type = 'file';
  const typeResult = fileType(buffer);

  if (typeResult) {
    const { ext } = typeResult;
    if (imageType.includes(ext)) {
      type = 'image';
    } else if (videoType.includes(ext)) {
      type = 'video';
    } else if (audioType.includes(ext)) {
      type = 'audio';
    }
  }

  return type;
};

const logUploadInfo = uploadInfo => {
  log('==================== Upload status ===================');
  log(
    `Total successfully uploaded ${uploadInfo.success.length} ${
      uploadInfo.success.length <= 1 ? 'file' : 'files'
    }, failed ${uploadInfo.error.length} ${
      uploadInfo.error.length <= 1 ? 'file' : 'files'
    }, unchanged ${uploadInfo.unchanged.length} ${
      uploadInfo.unchanged.length <= 1 ? 'file' : 'files'
    }.`
  );
  for (let i = 0; i < uploadInfo.error.length; i += 1) {
    error(`Failed file: ${uploadInfo.error[i]}`);
  }
};

export async function uploadAttachment(ctx) {
  const { force } = ctx.argv;
  try {
    warn(
      `${bold(
        'Attachments upload'
      )} is under heavy development. API may change between any versions.`
    );

    const config = getConfig('bottender.config.js', 'messenger');

    invariant(config.accessToken, 'accessToken is not found in config file');

    const client = MessengerClient.connect(config.accessToken);

    const files = await readdir('assets', ['.*']);

    files.forEach(print);

    const promptResult = await inquirer.prompt([
      {
        type: 'confirm',
        message: force
          ? 'Are you sure you want to force upload all assets?'
          : 'Is it correct for uploading?',
        name: 'confirm',
      },
    ]);

    if (!promptResult.confirm) {
      print('bye');
      return process.exit(0);
    }

    const pathOfMappingFile = path.resolve('bottender-lock.json'); // TODO: output path?

    if (!fs.existsSync(pathOfMappingFile)) {
      jsonfile.writeFileSync(pathOfMappingFile, {});

      print(`Initialize ${bold('bottender-lock.json')} for you`);
    }

    const uploadInfo = {
      success: [],
      error: [],
      unchanged: [],
    };

    print(`Trying to upload ${files.length} files...`);

    for (let i = 0; i < files.length; i++) {
      const _uploadedFiles = jsonfile.readFileSync(pathOfMappingFile);
      const uploadedFiles = _uploadedFiles.messenger || {};

      const name = files[i];
      const basename = path.basename(name);

      const fileMeta = uploadedFiles[basename];
      const checksum = hasha.fromFileSync(name);

      let pageId;
      if (force || !fileMeta || checksum !== fileMeta.checksum) {
        try {
          if (!pageId) {
            // eslint-disable-next-line no-await-in-loop
            const pageInfo = await client.getPageInfo();
            pageId = pageInfo.id;
          }
          // eslint-disable-next-line no-await-in-loop
          const data = await client.uploadAttachment(
            getFileType(name),
            fs.createReadStream(name),
            {
              is_reusable: true,
            }
          );
          jsonfile.writeFileSync(
            pathOfMappingFile,
            {
              ..._uploadedFiles,
              messenger: {
                ...uploadedFiles,
                [basename]: {
                  ...data,
                  pageId,
                  uploaded_at: Date.now(),
                  checksum,
                },
              },
            },
            { spaces: 2 }
          );
          print(`Successfully uploaded: ${name}`);
          uploadInfo.success.push(name);
        } catch (e) {
          error(e);
          uploadInfo.error.push(name);
        }
      } else {
        uploadInfo.unchanged.push(name);
      }
    }

    logUploadInfo(uploadInfo);
  } catch (err) {
    error(err.message);
    return process.exit(1);
  }
}

export default async function main(ctx) {
  const subcommand = ctx.argv._[2];
  switch (subcommand) {
    case 'upload':
      await uploadAttachment(ctx);
      break;
    case 'help':
      help();
      break;
    default:
      error(`Please specify a valid subcommand: upload`);
      help();
  }
}
