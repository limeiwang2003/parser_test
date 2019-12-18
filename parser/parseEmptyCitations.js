/**
 * Fill empty citations
 * @param PostgresqlConnection connection
 */
// search for rows in the case_citations table where citation is blank
// get the full case data including case text
// trim the case text to first 200 characters and look for a neutral citation there
// if found, add that citation to case_citations table

const regNeutralCite = /((?:\[\d{4}\]\s*)(?:(NZACC|NZDC|NZFC|NZHC|NZCA|NZSC|NZEnvC|NZEmpC|NZACA|NZBSA|NZCC|NZCOP|NZCAA|NZDRT|NZHRRT|NZIACDT|NZIPT|NZIEAA|NZLVT|NZLCDT|NZLAT|NZSHD|NZLLA|NZMVDT|NZPSPLA|NZREADT|NZSSAA|NZSAAA|NZTRA))(?:\s*(\w{1,6})))/g;

const run = async (connection, logDir) => {
	console.log('\n-----------------------------------');
	console.log('Parse Empty Citations');
	console.log('-----------------------------------\n');

	console.log('Loading all cases and their case citations');
	const results = await connection.any(
		"select * from cases INNER JOIN case_citations ON case_citations.case_id = cases.id WHERE case_citations.citation = ''"
	);
	console.log('results', results);
	// array of mysql update statements
	let updateCitations = [];

	results.forEach(function(row) {
		if (!row.case_text) {
			//return console.log("No text to parse for missing citation")
			return;
		}

		const case_text = JSON.stringify(row.case_text).substr(0, 550);
		// regex for neutral citation

		let citation = case_text.match(regNeutralCite);
		// for now, limit to the first citation found (in case double citation appears in header - deal with double citations in header later)
		citation = citation[0];
		// add to array of update statements
		updateCitations.push("update case_citations set citation = '" + citation + "' where case_id = '" + row.id);
	});
    console.log('Update', updateCitations.length);
	if (updateCitations.length > 0) {
		await connection.multi(updateCitations.join(';'));
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
	module.exports.regNeutralCite = regNeutralCite;
}
