/* eslint-disable consistent-return */
import invariant from 'invariant';
import { MessengerClient } from 'messaging-api-messenger';

import getConfig from '../../shared/getConfig';
import { print, error, bold } from '../../shared/log';

export async function getGetStarted(configPath = 'bottender.config.js') {
  try {
    const config = getConfig(configPath, 'messenger');

    invariant(config.accessToken, 'accessToken is not found in config file');

    const client = MessengerClient.connect(config.accessToken);
    const { data } = await client.getGetStartedButton();
    if (data.length) {
      print(`Get started payload is: ${bold(data[0].get_started.payload)}`);
    } else {
      error('Failed to find get started setting');
    }
  } catch (err) {
    error('Failed to get `get started`');
    if (err.response) {
      error(`status: ${bold(err.response.status)}`);
      if (err.response.data) {
        error(`data: ${bold(JSON.stringify(err.response.data, null, 2))}`);
      }
    } else {
      error(err.message);
    }
    return process.exit(1);
  }
}

export async function setGetStarted(
  _payload,
  configPath = 'bottender.config.js'
) {
  try {
    const config = getConfig(configPath, 'messenger');
    const payload = _payload || config.getStartedPayload;

    invariant(config.accessToken, 'accessToken is not found in config file');
    invariant(
      payload,
      'payload is not found, using -p <YOUR_PAYLOAD> to setup or list `getStartedPayload` key it in config file.'
    );

    const client = MessengerClient.connect(config.accessToken);

    await client.setGetStartedButton(payload);

    print(`Successfully set get started to ${bold(payload)}`);
  } catch (err) {
    error('Failed to set get started');
    if (err.response) {
      error(`status: ${bold(err.response.status)}`);
      if (err.response.data) {
        error(`data: ${bold(JSON.stringify(err.response.data, null, 2))}`);
      }
    } else {
      error(err.message);
    }
    return process.exit(1);
  }
}

export async function deleteGetStarted(configPath = 'bottender.config.js') {
  try {
    const config = getConfig(configPath, 'messenger');

    invariant(config.accessToken, 'accessToken is not found in config file');

    const client = MessengerClient.connect(config.accessToken);

    await client.deleteGetStartedButton();

    print('Successfully delete `get started`');
  } catch (err) {
    error('Failed to delete `get started`');
    if (err.response) {
      error(`status: ${bold(err.response.status)}`);
      if (err.response.data) {
        error(`data: ${bold(JSON.stringify(err.response.data, null, 2))}`);
      }
    } else {
      error(err.message);
    }
    return process.exit(1);
  }
}