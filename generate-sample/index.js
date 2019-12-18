const fs = require('fs');
const { Parser } = require('json2csv');

const calculateLegislationSectionsRange = (cases) => {
	const mean = Math.round(
		cases.reduce((accumulator, currentValue) => accumulator + currentValue.legislation_section_count, 0) /
			cases.length
	);

	const sumMean = cases.reduce(
		(accumulator, currentValue) => accumulator + Math.pow(currentValue.legislation_section_count - mean, 2),
		0
	);

	const standardDeviation = Math.round(Math.sqrt(sumMean / cases.length));
	const lowerRangeValue = Math.max(mean - standardDeviation, 0);
	const upperRangeValue = mean + standardDeviation;

	return {
		lowerRangeValue,
		standardDeviation,
		upperRangeValue,
		randomRangeValue: Math.max(lowerRangeValue, Math.round(Math.random() * upperRangeValue))
	};
};

const getChosenCases = (cases, maxLegislationReferencesCount) => {
	let eligibleCases = cases.filter((c) => {
		return c.legislation_section_count > 0 && c.legislation_section_count <= maxLegislationReferencesCount;
	});

	let chosenCases = [];

	while (chosenCases.length < 10) {
		const rand = eligibleCases[Math.floor(Math.random() * eligibleCases.length)];
		const indexOfRand = eligibleCases.findIndex((c) => c.id === rand.id);
		chosenCases = chosenCases.concat(eligibleCases.splice(indexOfRand, 1));
	}

	return chosenCases;
};

/**
 * Statistics
 * @param MysqlConnection connection
 */
const run = async (connection) => {
	console.log('\n-----------------------------------');
	console.log('MTurk validation extraction');
	console.log('-----------------------------------\n');

	console.log('Loading cases and their legislation section counts');
	let [ cases ] = await connection.any(`
		SELECT 
			cases.id, 
			case_pdfs.pdf_url, 
			SUM(ltc.count) AS legislation_section_count 
		FROM cases 
		INNER JOIN case_pdfs 
			ON cases.pdf_id = case_pdfs.pdf_id
		INNER JOIN legislation_to_cases AS ltc
			ON cases.id = ltc.case_id
		WHERE extraction_confidence != 0
		GROUP BY cases.id;
	`);

	cases = cases.map((c) => {
		return {
			...c,
			legislation_section_count: parseInt(c.legislation_section_count)
		};
	});

	console.log('Calculating standard deviation');
	const { randomRangeValue, standardDeviation } = calculateLegislationSectionsRange(cases);

	console.log({
		randomRangeValue,
		standardDeviation
	});

	console.log('Choosing cases');
	let chosenCases = getChosenCases(cases, randomRangeValue);

	const validationName = 'validation-' + +new Date() + '-σ-' + standardDeviation;

	let fields = [ 'case_id', 'pdf', 'legislation', 'section', 'count', 'correct' ];

	let rows = [];

	console.log('Populating rows for each case');
	for (chosenCase of chosenCases) {
		// let [chosenCaseLegislationReferences] = await connection.any(`
		// 	SELECT * FROM legislation_to_cases
		// 	INNER JOIN legislation ON legislation_id = legislation.id
		// 	WHERE case_id = ${chosenCase.id};
		// `);
		// chosenCaseLegislationReferences.forEach(r => {
		// 	rows.push({
		// 		case_id: chosenCase.id,
		// 		pdf: chosenCase.pdf_url,
		// 		legislation: r.title,
		// 		section: r.section,
		// 		count: r.count
		// 	});
		// });
		const q1 = `
		// 	SELECT * FROM legislation_to_cases
		// 	INNER JOIN legislation ON legislation_id = legislation.id
		// 	WHERE case_id = ${chosenCase.id};
		// `;
		await connection.each(q1, [], (row) => {
			rows.push({
				case_id: chosenCase.id,
				pdf: chosenCase.pdf_url,
				legislation: row.title,
				section: row.section,
				count: row.count
			});
		});
	}

	const opts = {
		fields,
		withBOM: true
	};
	try {
		const parser = new Parser(opts);
		const csv = parser.parse(rows);

		fs.writeFileSync(validationName + '.csv', csv);
	} catch (err) {
		console.error(err);
	}

	// shuts down the pool
	connection.$pool.end();
	console.log(`Wrote file ${validationName + '.csv'}`);
	console.log('Done.');
};

if (require.main === module) {
	const argv = require('yargs').argv;
	(async () => {
		try {
			const { connection } = await require('../common/setup')(argv.env);
			await run(connection);
		} catch (ex) {
			console.log(ex);
		}
	})().finally(process.exit);
} else {
	module.exports = run;
	module.exports.calculateLegislationSectionsRange = calculateLegislationSectionsRange;
	module.exports.getChosenCases = getChosenCases;
}
