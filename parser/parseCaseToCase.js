/**
 * This module populates the 'cited_cases' table, by selecting cases with case texts, and matching citations of other cases
 * within the case text. A relationship is established between the "case_origin" and "case_cited", which is stored
 * in the 'cited_cases' table.
 *
 * last updated 7/21/2018 by Matt Frost :
 * changed the algorithm to pick out all citations from the case_text first using a regex match (much faster!).
 * then, counts the number of each case_id sited, and stores this in the count column along with the
 * case relationship.
 * Keyed table means that a replace instead of an insert is needed.
 *
 * @param PostgresqlConnection connection
 *
 *
 */

const citation_reg = /((?:\[\d{4}\]\s*)(?:([a-zA-Z]{1,7}))(?:\s*(\w{1,6})))[,;.\s]/g;
//const old_citation_reg = /\[[0-9]{4}\]\s[a-zA-Z]{1,7}\s*(\w{0,6})[,;.\s]/g
const moment = require('moment');

const run = async (connection, logDir) => {
	var start = moment().unix();

	console.log('\n-----------------------------------');
	console.log('Parse Case To Case');
	console.log('-----------------------------------\n');

	console.log('started at ' + start);

	const results = await connection.multi(
		'select id, case_text from cases; select citation, case_id from case_citations'
	);

	const allCases = results[0];
	const allCitations = results[1];
	console.log('fetched tables in: ' + (moment().unix() - start) + ' secs');
	var insertQueries = [];

	// initialize map of citation strings
	var case_citations = {};
	console.log('started matching');
	/**
	 * Loop over cases, pull out all citations
	 *
	 */
	var totalcites = 0;
	allCases.forEach(function(caseRow) {
		// go through each case, check for blank text
		if (!caseRow.case_text) {
			return;
		}
		// regex searches for the format of a citation, grabs all valid sitations and maps them under the id of the case
		var matches = caseRow.case_text.match(citation_reg);
		// create map entry with key as the ID, all citations as body
		if (matches) {
			totalcites += matches.length;
			case_citations[caseRow.id] = matches;
		}
	});
	console.log(`found a total of ${totalcites} citations within texts`);
	console.log('found regex in: ' + (moment().unix() - start) + ' secs');

	// assuming no blank text, inside each case look at all citation records in the db
	// see if any citations in the db are present in the case text
	for (var key in case_citations) {
		let mapped_count = {};
		// loop over all citations within keyed case text
		case_citations[key].forEach((caseCitation) => {
			// loop over all citations strings from database
			allCitations.forEach(function(citationRow) {
				// match against caseRow.case_text, and only match if the ids are not identical (dont need to add a case's reference to itself)
				if (citationRow.citation) {
					caseCitation = caseCitation.slice(0, -1);
					caseCitation += ';';
					//remove white space(could be inconsistent)
					caseCitation = caseCitation.replace(/\s/g, '');

					// if the citation is a substring of multiple other cases, we need to account for this by "ending"
					// the citation with a semicolon ;
					var w = citationRow.citation.concat(';');
					w = w.replace(/\s/g, '');

					// map the count udner its case_id - can add to this if it encounters this ID again
					if (caseCitation.indexOf(w) !== -1 && citationRow.case_id != key) {
						if (mapped_count[citationRow.case_id]) {
							mapped_count[citationRow.case_id] += 1;
						} else {
							mapped_count[citationRow.case_id] = 1;
						}
						/**
						 * here, we need to check for duplicates already in the case_to_case table?
						 * the script will likely be run regularly across the whole db (to account for new citations being added)
						 * this will result in duplicate entries
						 * UPDATE: put a key on (case_id_1, case_id_2)
						 */
					}
				}
			});
		});

		/**
		 * NOTE: I created a composite key as a primary key for this table:
		 * alter table cases.cases_cited add constraint cases_cited_pkey primary key (case_origin, case_cited)
		 * What upsert statement does:
		 * if duplicate id, it will update the row
		 * if not, it will insert the row
		 * */
		for (var count_key in mapped_count) {
			insertQueries.push(
				`INSERT INTO cases_cited (case_origin, case_cited, citation_count) 
				VALUES ('${key}', '${count_key}', '${mapped_count[count_key]}')
				ON CONFLICT ON CONSTRAINT cases_cited_pkey DO UPDATE
				SET case_origin = '${key}',
					case_cited = '${count_key}',
					citation_count = '${mapped_count[count_key]}'`
			);
		}
	}
	console.log('Created insert queries in: ' + (moment().unix() - start) + ' secs');
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
}
