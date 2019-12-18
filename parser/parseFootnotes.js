const { setLogFile, setLogDir, log } = require('../common/functions').makeLogger();

// https://stackoverflow.com/questions/20856197/remove-non-ascii-character-in-string
const removeNonASCII = (str) => {
	return str.replace(/[^\x00-\x7F]/g, '');
};

// Remove line breaks from case text
const processCaseText = (case_text) => {
	return case_text.replace(/\r\n|[\n\v\f\r\x85\u2028\u2029]/gm, ' ');
};

// This linebreak may be variable
// https://stackoverflow.com/questions/5034781/js-regex-to-split-by-line#comment5633979_5035005
const processFootnotes = (case_footnotes) => {
	const footnotesArray = case_footnotes.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/).map((c) => {
		// Could start with a non-ascii character and we are going by start number, so delete them
		let charIndex = 0;
		while (charIndex < c.length && c[charIndex].match(/[^\x00-\x7F]/)) {
			charIndex++;
		}
		return c.substring(charIndex);
	});
	const footnotesArrayLen = footnotesArray.length;

	let conjoinedFootnotes = [];
	let currentFootnote = '';
	let currentNumber = 1;

	footnotesArray.forEach((footnoteContent, i) => {
		if (currentFootnote && !footnoteContent.startsWith(currentNumber + 1)) {
			currentFootnote += ' ' + footnoteContent;
		} else if (currentFootnote) {
			conjoinedFootnotes.push(currentFootnote);
			currentNumber++;
		}

		if (footnoteContent.startsWith(currentNumber)) {
			currentFootnote = footnoteContent;
		}
		if (i == footnotesArrayLen - 1) {
			conjoinedFootnotes.push(currentFootnote);
		}
	});

	if (conjoinedFootnotes.length === 0) {
		console.log(footnotesArray);
	}

	return conjoinedFootnotes.map((c) => c.trim()).filter((c) => c !== '');
};

// If the data processor is from Word, this linebreak type is generated manually from the macro
// Trim to last 4 characters rather full context from macro
const processFootnoteContexts = (case_footnote_contexts) => {
	return (
		case_footnote_contexts
			.split('\n')
			.map((c) => c.trim())
			//.map(c => removeNonASCII(c))
			.filter((c) => c !== '')
			.map((c) => c.substring(c.length - 4))
			.map((c) => c.trim())
	);
};

// If string name has special characters in it
RegExp.escape = function(s) {
	return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

const processCase = (l) => {
	let processedCaseText = processCaseText(l.case_text);
	let processedFootnoteContexts = [];
	let processedFootnotes = [];
	let isValid = false;
	let footnotesExistInText = false;

	if ((l.case_footnotes && !l.case_footnote_contexts) || (!l.case_footnotes && l.case_footnote_contexts)) {
		log(`\n\n[${l.id}] Footnote or context is empty`, true, 9);
		log(`\nFootnotes\n${l.case_footnotes}`, true, 9);
		log(`\nFootnote Contexts\n ${l.case_footnote_contexts}`, true, 9);
	} else {
		processedFootnotes = processFootnotes(l.case_footnotes);
		processedFootnoteContexts = processFootnoteContexts(l.case_footnote_contexts);

		// TODO: Optimise with below
		for (let i = 0; i < processedFootnotes.length; i++) {
			const footnote = processedFootnotes[i];

			const footnoteMatchStr = RegExp.escape(footnote).replace(/\s+/g, '\\s+');
			const regexMatches = processedCaseText.match(footnoteMatchStr);

			if (!regexMatches || (regexMatches && regexMatches.length > 1)) {
				footnotesExistInText = false;
				break;
			} else {
				footnotesExistInText = true;
			}
		}

		if (processedFootnoteContexts.length === 0 || processedFootnotes.length === 0) {
			log(`\n\n[${l.id}] Footnote / contexts arrays are empty`, true, 7);
			log(`\nFootnotes\n${l.case_footnotes}`, true, 7);
			log(`\nFootnote Contexts\n ${l.case_footnote_contexts}`, true, 7);
			log(`\nProcessed Footnotes\n${processedFootnotes.join('\n')}`, true, 7);
			log(`\nProcessed Footnote Contexts\n ${processedFootnoteContexts.join('\n')}`, true, 7);
		} else if (processedFootnoteContexts.length === processedFootnotes.length) {
			for (let i = 0; i < processedFootnoteContexts.length; i++) {
				const context = processedFootnoteContexts[i];
				const footnote = processedFootnotes[i];

				if (footnote === '') {
					log(`\n\n[${l.id}] No footnote\n`, true, 0);
					log(processedFootnotes, true, 0);
					isValid = false;
					break;
				}

				if (context === '') {
					log(`\n\n[${l.id}] No footnote context\n`, true, 1);
					log(processedFootnoteContexts, true, 1);
					isValid = false;
					break;
				}

				const contextMatchesStr = RegExp.escape(context);
				const contextMatches = processedCaseText.match(contextMatchesStr);

				if (!contextMatches) {
					log(`\n\n[${l.id}] Context not found in text\n`, true, 2);
					log(contextMatchesStr, false, 2);
					isValid = false;
					break;
				}

				if (contextMatches.length > 1) {
					log(`\n\n[${l.id}] More than one context found\n`, true, 3);
					isValid = false;
					break;
				}

				const footnoteMatchStr = RegExp.escape(footnote).replace(/\s+/g, '\\s+');
				const regexMatches = processedCaseText.match(footnoteMatchStr);

				if (!regexMatches) {
					log(`\n\n[${l.id}] Footnote not found in text\n`, true, 4);
					log(footnoteMatchStr, true, 4);
					isValid = false;
					break;
				}

				if (regexMatches.length > 1) {
					log(`\n\n[${l.id}] More than one footnote found\n`, true, 5);
					isValid = false;
					break;
				}

				isValid = true;

				// Check they are correctly formatted
				const currentNumber = i + 1;

				if (
					context.endsWith(currentNumber) &&
					footnote &&
					footnote.startsWith(currentNumber) &&
					footnote.match(/^(\d+)\./) === null // e.g. 14.12 for 1
				) {
					isValid = true;
				} else {
					log(`\n\n[${l.id}] Footer/context starts and ends`, true, 6);
					log(`\nFootnotes\n${l.case_footnotes}`, true, 6);
					log(`\nFootnote Contexts\n ${l.case_footnote_contexts}`, true, 6);
					log(`\nProcessed Footnotes\n${processedFootnotes.join('\n')}`, true, 6);
					log(`\nProcessed Footnote Contexts\n ${processedFootnoteContexts.join('\n')}`, true, 6);
					isValid = false;
					break;
				}
			}
		} else {
			log(`\n\n[${l.id}] Footnote / contexts array length mismatch`, true, 8);
			log(`\nFootnotes\n${l.case_footnotes}`, true, 8);
			log(`\nFootnote Contexts\n ${l.case_footnote_contexts}`, true, 8);
			log(`\nProcessed Footnotes\n${processedFootnotes.join('\n')}`, true, 8);
			log(`\nProcessed Footnote Contexts\n ${processedFootnoteContexts.join('\n')}`, true, 8);
		}
	}

	return {
		processedCaseText,
		processedFootnoteContexts,
		processedFootnotes,
		isValid,
		footnotesExistInText
	};
};

/**
 * Parse Footnotes
 * @param PostgresqlConnection connection
 */
const run = async (pgPromise, connection, logDir) => {
	console.log('\n-----------------------------------');
	console.log('Parse footnotes');
	console.log('-----------------------------------\n');

	setLogDir(logDir);
	setLogFile(__filename);

	const logDetails = (l) => {
		log(l.case_text, false, `${l.id}`);
		log(processCaseText(l.case_text), false, `${l.id}-processed`);

		if (l.case_footnotes) {
			log(processFootnotes(l.case_footnotes).join('\n'), false, `${l.id}-footnotes`);
		}
		if (l.case_footnote_contexts) {
			log(processFootnoteContexts(l.case_footnote_contexts).join('\n'), false, `${l.id}-footnotecontexts`);
		}
	};

	console.log('Loading all cases');

	const results = await connection.any(`
		SELECT * FROM cases 
		WHERE (case_footnotes IS NOT NULL OR case_footnote_contexts IS NOT NULL)
		AND case_footnotes_are_valid IS NULL
	`);

	const resultsLength = results.length;

	for (let x = 0; x < resultsLength; x++) {
		console.log(`Processing footnotes ${x + 1}/${resultsLength}`);

		const l = results[x];

		const { processedFootnotes, processedFootnoteContexts, footnotesExistInText, isValid } = processCase(l);

		if (!isValid) {
			logDetails(l);
		}

		const cs = new pgPromise.helpers.ColumnSet(
			[
				'case_footnotes',
				'case_footnotes_count',
				'case_footnote_contexts',
				'case_footnote_contexts_count',
				'case_footnotes_exist_in_text',
				'case_footnotes_are_valid'
			],
			{ table: 'cases' }
		);
		const values = {
			case_footnotes: processedFootnotes.join('\n'),
			case_footnotes_count: processedFootnotes.length,
			case_footnote_contexts: processedFootnoteContexts.join('\n'),
			case_footnote_contexts_count: processedFootnoteContexts.length,
			case_footnotes_exist_in_text: footnotesExistInText ? 1 : 0,
			case_footnotes_are_valid: isValid ? 1 : 0
		};
		const query = pgPromise.helpers.update(values, cs);
		await connection.none(query);
	}

	console.log('Done');
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
	module.exports.processCase = processCase;
}
