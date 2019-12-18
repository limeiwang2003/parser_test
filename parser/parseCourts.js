const { setLogFile, setLogDir, log } = require('../common/functions').makeLogger();

const courtsMap = {
	NZSC: 'Supreme Court',
	SC: 'Supreme Court',
	NZCA: 'Court of appeal',
	NZHC: 'High Court',
	HC: 'High Court',
	NZFC: 'Family Court',
	NZDC: 'District Court',
	DC: 'District Court',
	NZACC: 'ACC Tribunal',
	COA: 'Court of Appeal',
	NZLR: 'Law Report'
};

/**
 * Parse Invalid Characters
 * @param PostgresqlConnection connection
 */
const run = async (pgPromise, connection, logDir) => {
	console.log('\n-----------------------------------');
	console.log('Parse courts');
	console.log('-----------------------------------\n');

	setLogDir(logDir);
	setLogFile(__filename);

	console.log('Loading all cases and case citations');

	// First insert all the courts into the DB
	const cs = new pgPromise.helpers.ColumnSet([ 'acronym', 'court_name' ], { table: 'courts' });
	const values = Object.keys(courtsMap).map((acronym) => ({ acronym, court_name: courtsMap[acronym] }));
	const query = pgPromise.helpers.insert(values, cs);

	await connection.none(query);

	const courts = await connection.any('SELECT * FROM courts');

	let [ cases, case_citations ] = await connection.multi(
		'SELECT * FROM cases LIMIT 100; SELECT * FROM case_citations LIMIT 100'
	);
	// We can select one citation for each case to determine the court

	cases = cases
		.map((c) => {
			const first_case_citation = case_citations.find((ci) => ci.case_id === c.id);
			if (first_case_citation) {
				const [ citation_name ] = first_case_citation.citation.match(/([a-zA-Z]+)/);
				if (citation_name) {
					return {
						id: c.id,
						citation: citation_name.trim()
					};
				}
				return null;
			}
			return null;
		})
		.filter((c) => c !== null);

	await connection.tx((t) => {
		for (let x = 0; x < cases.length; x++) {
			console.log(`Processing court to cases ${x + 1}/${cases.length}`);

			const legalCase = cases[x];

			const found_court = courts.find((c) => legalCase.citation.toUpperCase().includes(c.acronym.toUpperCase()));

			if (found_court) {
				return t.none('INSERT INTO court_to_cases (court_id, case_id) VALUES ($1, $2)', [
					found_court.id,
					legalCase.id
				]);
			} else {
				log('[' + legalCase.id + '] ' + legalCase.citation + '\n', true, 'missing-courts');
			}
		}
	});
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
	module.exports.courtsMap = courtsMap;
}
