import fs from 'fs';
import { Application, helpers } from 'lisk-framework';
import path from 'path';

import * as packageJSON from '../package.json';

const { validator } = helpers;

const appConfig = {
	app: {
		version: packageJSON.version,
		minVersion: packageJSON.lisk.minVersion,
		protocolVersion: packageJSON.lisk.protocolVersion,
	},
};

// Support for PROTOCOL_VERSION only for tests
if (process.env.NODE_ENV === 'test' && process.env.PROTOCOL_VERSION) {
	appConfig.app.protocolVersion = process.env.PROTOCOL_VERSION;
}

const appSchema = {
	type: 'object',
	properties: {
		NETWORK: {
			type: 'string',
			description:
				'lisk network [devnet|betanet|mainnet|testnet]. Defaults to "devnet"',
			enum: ['devnet', 'alphanet', 'betanet', 'testnet', 'mainnet'],
			env: 'LISK_NETWORK',
			arg: '-n,--network',
		},
		CUSTOM_CONFIG_FILE: {
			type: ['string', 'null'],
			description: 'Custom configuration file path',
			default: null,
			env: 'LISK_CONFIG_FILE',
			arg: '-c,--config',
		},
	},
	default: {
		NETWORK: 'devnet',
		CUSTOM_CONFIG_FILE: null,
	},
};

try {
	const { NETWORK, CUSTOM_CONFIG_FILE } = validator.parseEnvArgAndValidate(
		appSchema,
		{}
	);

	let customConfig = {};
	// TODO: I would convert config.json to .JS
	// tslint:disable no-var-requires
	const networkConfig = require(`../config/${NETWORK}/config`);
	// TODO: Merge constants and exceptions with the above config.
	const exceptions = require(`../config/${NETWORK}/exceptions`);
	const genesisBlock = require(`../config/${NETWORK}/genesis_block`);
	// tslint:enable no-var-requires

	if (CUSTOM_CONFIG_FILE) {
		customConfig = JSON.parse(
			fs.readFileSync(path.resolve(CUSTOM_CONFIG_FILE), 'utf8')
		);
	}

	// To run multiple applications for same network for integration tests

	const appName = config =>
		`lisk-${NETWORK}-${config.modules.http_api.httpPort}`;

	/*
	TODO: Merge 3rd and 4th argument into one single object that would come from config/NETWORK/config.json
	Exceptions and constants.js will be removed.
	 */
	const app = new Application(appName, genesisBlock, [
		networkConfig,
		customConfig,
		appConfig,
	]);

	app.overrideModuleOptions('chain', { exceptions });

	app
		.run()
		.then(() => app.logger.log('App started...'))
		.catch(error => {
			if (error instanceof Error) {
				app.logger.error('App stopped with error', error.message);
				app.logger.debug(error.stack);
			} else {
				app.logger.error('App stopped with error', error);
			}
			process.exit();
		});
} catch (e) {
	console.error('Application start error.', e.errors);
	process.exit();
}
