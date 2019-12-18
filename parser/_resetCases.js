const run = async (pgPromise, connection, logDir) => {
	console.log('\n-----------------------------------');
	console.log(`Resetting cases in 5 seconds`);
    console.log('-----------------------------------\n');

	pgPromise.pg.defaults.query_timeout = 5000;
	console.log('TRUNCATE "cases" tables');

	await connection
		.tx((t) => {
			const q1 = t.none('SET session_replication_role to replica');
			const q2 = t.none('TRUNCATE TABLE case_citations RESTART IDENTITY CASCADE;');
			const q3 = t.none('TRUNCATE TABLE case_pdfs RESTART IDENTITY CASCADE;');
			const q4 = t.none('TRUNCATE TABLE courts RESTART IDENTITY CASCADE;');
			const q5 = t.none('TRUNCATE TABLE cases RESTART IDENTITY CASCADE;');
			const q6 = t.none('TRUNCATE TABLE cases_cited RESTART IDENTITY CASCADE;');
			const q7 = t.none('TRUNCATE TABLE legislation_to_cases RESTART IDENTITY CASCADE;');
			const q8 = t.none('SET session_replication_role to default');
			return t.batch([ q1, q2, q3, q4, q5, q6, q7, q8 ]);
		})
		.then((result) => {
			if (result != null) console.log(result);
			console.log('success');
		})
		.catch((err) => {
			console.log('ERROR: ', err);
		});
	console.log('INSERT INTO "cases" tables FROM "pipeline_cases"');

	await connection.tx(async (t) => {
		const q1 = await t.none('INSERT INTO cases.case_pdfs SELECT * FROM pipeline_cases.case_pdfs');
		const q2 = await t.none(
			'INSERT INTO cases.cases (id, pdf_id, case_date, case_text, case_name, case_footnotes, case_footnote_contexts) SELECT id, pdf_id, case_date, case_text, case_name, case_footnotes, case_footnote_contexts FROM pipeline_cases.cases'
		);
		const q3 = await t.none('INSERT INTO cases.case_citations SELECT * FROM pipeline_cases.case_citations');
		const q4 = await t.none('INSERT INTO cases.legislation SELECT * FROM pipeline_cases.legislation');
		return t.batch([ q1, q2, q3, q4 ]);
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
}
