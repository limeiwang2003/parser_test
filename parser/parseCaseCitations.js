/**
 * Case Citations
 * @param PostgresqlConnection connection
 */
// search through all cases and all citations
// find all double citations in the full text of each case eg R v Smith [2012] NZHC 1234, [2012] 2 NZLR 123.
// check to see if first part of match already has id in database
// if so, add second part of match to case_citation database with same id
const regDoubleCites = /(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)(;|,)\s(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)/g;

const run = async (connection, logDir) => {
	console.log('\n-----------------------------------');
	console.log('Parse Case Citations');
	console.log('-----------------------------------\n');

	const commaOrSemi = /,|;/g; // for splitting double citations - delimted by comma or semicolon

	console.log('Loading all cases and case citations');

	const results = await connection.multi('select * from cases; select * from case_citations');

	var allCases = results[0];
	var allCitations = results[1];

	var insertQueries = [];

	function findCaseByCitation(citation) {
		return allCitations.find(function(row) {
			return row.citation.trim().toLowerCase() === citation.toLowerCase();
		});
	}
	allCases.forEach(function(row) {
		// if no text, quit
		if (!row.case_text) {
			return;
		}
		// regex match for all double citations inside case text
		var citationsMatch = row.case_text.match(regDoubleCites);
		// if match:
		if (citationsMatch) {
			// split into first and second citation
			var separatedCitations = citationsMatch[0].split(commaOrSemi);
			// separatedCitations[0] has first of double citation
			// separatedCitations[1] has second of double citation
			// we want to search for first citation to see if it is in the db already
			var citation = separatedCitations[0];
			var secondaryCitation = separatedCitations[1].trim();
			var foundCase = findCaseByCitation(citation);
			var foundSecondaryCase = findCaseByCitation(secondaryCitation);
			if (foundCase && !foundSecondaryCase) {
				// if there's a match - ie if the first citation is in the db, then we know we can add another citation that refers to the same case
				insertQueries.push(
					`INSERT INTO case_citations (case_id, citation) VALUES ('${foundCase.case_id}', '${secondaryCitation}')`
				);
				// In case secondary citation comes up again
				allCitations.push({
					case_id: foundCase.case_id,
					citation: secondaryCitation
				});
			}
		}
	});
	console.log('Insert', insertQueries.length);
	if (insertQueries.length > 0) {
		await connection.multi(insertQueries.join(';'));
	}
	console.log('Done');
};

if (require.main === module) {
	const argv = require('yargs').argv;
	(async () => {
		try {
			const { connection, logDir } = await require('../common/setup')(argv.env);
			await run(connection, logDir);
		} catch (ex) {
			console.log(ex);
		}
	})().finally(process.exit);
} else {
	module.exports = run;
	module.exports.regDoubleCites = regDoubleCites;
}
