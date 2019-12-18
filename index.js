/**
 * @file Runs all the steps for processing law data
 */
const argv = require('yargs').argv;
const moment = require('moment');

const setup = require('./common/setup');

const resetCases = require('./parser/_resetCases');
const parseInvalidCharacters = require('./parser/parseInvalidCharacters');
const parseFootnotes = require('./parser/parseFootnotes');
const parseEmptyCitations = require('./parser/parseEmptyCitations');
const parseCourts = require('./parser/parseCourts');
const parseCaseCitations = require('./parser/parseCaseCitations');
const parseCaseToCase = require('./parser/parseCaseToCase');
const parseLegislationToCases = require('./parser/parseLegislationToCases');

// TODO: Timings between each step
const run = async () => {
	console.log('Running all parsers');

	const { pgPromise, connection, pipeline_connection, logDir } = await setup(argv.env);
	const start = moment();

	console.log(`- logDir: ${logDir}`);
	console.log(`- Started ${start}`);

	await resetCases(pgPromise, connection, pipeline_connection, logDir);
	await parseInvalidCharacters(pgPromise, connection, logDir);
	await parseFootnotes(pgPromise, connection, logDir);
	await parseEmptyCitations(connection, logDir);
	await parseCaseCitations(connection, logDir);
	await parseCourts(pgPromise, connection, logDir);
	await parseCaseToCase(connection, logDir);
	await parseLegislationToCases(pgPromise, connection, logDir);
	console.log(`All done. Took ${moment().diff(start, 'minutes')} minutes`);
};

run()
	.catch((ex) => {
		console.log(ex);
	})
	.finally(process.exit);
