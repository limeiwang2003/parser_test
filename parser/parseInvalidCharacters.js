/**
 * Parse Invalid Characters
 * @param PostgresqlConnection connection
 */

const characterReplaceMap = [
	[ '‖', '' ],
	[ '…', '' ],
	[ '‘', "'" ],
	[ '’', "'" ],
	[ '“', '"' ],
	[ '”', '"' ],
	[ '', '' ],
	[ '﻿', '' ]
];

const replaceText = (text) => {
	let hasInvalidCharacter = false;

	if (text !== null) {
		characterReplaceMap.forEach((mapItem) => {
			if (text.indexOf(mapItem[0]) !== -1) {
				hasInvalidCharacter = true;
				text = text.replace(new RegExp(mapItem[0], 'g'), mapItem[1]);
			}
		});
	}
	return [ text, hasInvalidCharacter ];
};

const run = async (pgPromise, connection, logDir) => {
	console.log('\n-----------------------------------');
	console.log('Parse invalid characters');
	console.log('-----------------------------------\n');

	let invalidCaseTextCount = 0;
	let invalidFootnotesCount = 0;
	let invalidFootnoteContextsCount = 0;

	console.log('Loading all cases');

	const results = await connection.any('SELECT * FROM cases');
	await connection
		.tx((t) => {
			for (let x = 0; x < results.length; x++) {
				const row = results[x];

				console.log(`Processing ${x + 1}/${results.length}`);

				const [ case_text, caseTextHasInvalidCharacter ] = replaceText(row.case_text);
				const [ case_footnotes, caseFootnotesHasInvalidCharacter ] = replaceText(row.case_footnotes);
				const [ case_footnote_contexts, caseFootnoteContextsHasInvalidCharacter ] = replaceText(
					row.case_footnote_contexts
				);

				let updateObj = {};
				let columns = [];
				if (caseTextHasInvalidCharacter) {
					updateObj['case_text'] = case_text;
					columns.push('case_text');
					invalidCaseTextCount++;
				}

				if (caseFootnotesHasInvalidCharacter) {
					updateObj['case_footnotes'] = case_footnotes;
					columns.push('case_footnotes');
					invalidFootnotesCount++;
				}

				if (caseFootnoteContextsHasInvalidCharacter) {
					updateObj['case_footnote_contexts'] = case_footnote_contexts;
					columns.push('case_footnote_contexts');
					invalidFootnoteContextsCount++;
				}
				const cs = new pgPromise.helpers.ColumnSet(columns, {
					table: 'cases'
				});
				const query = pgPromise.helpers.update(updateObj, cs);

				if (Object.keys(updateObj).length > 0) {
					return t.none(query);
				}
			}
			console.log(`Invalid case text: ${invalidCaseTextCount}`);
			console.log(`Invalid footnotes: ${invalidFootnotesCount}`);
			console.log(`Invalid footnote contexts: ${invalidFootnoteContextsCount}`);

			console.log(
				`Updating ${invalidCaseTextCount +
					invalidFootnotesCount +
					invalidFootnoteContextsCount} texts that have invalid characters`
			);
		})
		.then((data) => {
			console.log('Done');
		})
		.catch((error) => {
			console.log(error);
		});
};

if (require.main === module) {
	const argv = require('yargs').argv;
	(async () => {
		try {
			const { pgPromise, connection, logDir } = await require('../common/setup')(argv.env);
			await run(pgPromise, connection, logDir);
		} catch (ex) {
			console.log(ex);
		}
	})().finally(process.exit);
} else {
	module.exports = run;
	module.exports.characterReplaceMap = characterReplaceMap;
	module.exports.replaceText = replaceText;
}
