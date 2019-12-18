const { readFileSync } = require("fs");
const request = require("request");
const chai = require("chai");
chai.should();
chai.use(require("./lib/chai-things"));
const expect = chai.expect;
const { processCase } = require("../parser/parseLegislationToCases");

let dataCache = {};

const getLegislation = () => {
	return new Promise((resolve, reject) => {
		if (dataCache["legislation"]) {
			resolve(dataCache["legislation"]);
		} else {
			request(
				"https://s3-ap-southeast-2.amazonaws.com/openlawnz-legislation/legislation.json",
				(err, response, body) => {
					if (err) {
						reject(err);
					} else {
						dataCache["legislation"] = JSON.parse(body).map(
							(legislation, i) => {
								return { ...legislation, id: i };
							}
						);
						resolve(dataCache["legislation"]);
					}
				}
			);
		}
	});
};

const getTestResult = async (fileName, cb, caseData) => {
	getLegislation().then((legislation, err) => {
		if (err) {
			cb(err);
			return;
		}

		if (!dataCache[fileName]) {
			const case_text = readFileSync(
				`${__dirname}/data/legislation/${fileName}.txt`,
				"utf8"
			);
			let case_footnotes;
			let case_footnote_contexts;
			try {
				case_footnotes = readFileSync(
					`${__dirname}/data/legislation/${fileName}.footnotes.txt`,
					"utf8"
				);
			} catch (ex) {}
			try {
				case_footnote_contexts = readFileSync(
					`${__dirname}/data/legislation/${fileName}.footnotecontexts.txt`,
					"utf8"
				);
			} catch (ex) {}
			dataCache = {
				...dataCache,
				[fileName]: [
					{
						id: 1,
						case_text,
						case_footnotes,
						case_footnote_contexts,
						...caseData
					}
				]
			};
		}

		const results = processCase(
			dataCache[fileName][0],
			legislation
		).legislationReferences.map(r => {
			return {
				...r,
				sections: Object.keys(r.groupedSections).map(sectionKey => {
					const section = r.groupedSections[sectionKey];
					return {
						id: sectionKey,
						count: section.count
					};
				})
			};
		});

		cb(null, results);
	});
};

/*
====================================================
TESTS
====================================================

getTestResult returns an array of legislation title match objects found in the case text

*/

/*
---------------------------------------------------
Basic References
---------------------------------------------------
Description:
Testing explicit, full references - that is, section and number followed by full definition of act with "of the", "in the" or "under the" between the two.

Sections can have numbers and letters, for example section 47A (which is a separate section from section 47). Brackets deliniate subsections, so regex should match on any numbers or letters up to the first white space or punctuation (period, bracket, comma etc)

Sections have subsections - section 58(2) is a part of section 58. For now, subsections can be ignored and effectively attached to the main section - so in that case, treat 58(2) as a reference to section 58.

Sections might be referred to as "section X" or "s X" or "sX"
(A later test covers multiple sections and ranges)

Expected results: 
1. Section 5, Protection of Personal and Property Rights Act 1988;
2. Section 57, Evidence Act 2006 (ignore the .1 as it is a footnote)
3. Section 58, Evidence Act 2006.
4. Section 47A, Care of Children Act 2004

File Name: data/legislation/1-basic-references.txt
--------------------------------------------------- 
*/

describe('Full, basic references: "in the", under the", and "of the" with following full legislation title', function() {
	it("Should return 3 Acts", done => {
		getTestResult("1-basic-references", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.length).equal(3);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});

	it("Should return Protection of Personal and Property Rights Act 1988, Evidence Act 2006, Care of Children Act 2004", done => {
		getTestResult("1-basic-references", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(
					results.some(
						ref =>
							ref.title ===
							"Protection of Personal and Property Rights Act 1988"
					)
				).equal(true);
				expect(results.some(ref => ref.title === "Evidence Act 2006")).equal(
					true
				);
				expect(
					results.some(ref => ref.title === "Care of Children Act 2004")
				).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}

			done();
		});
	});

	it("Should return section 5 of the PPPR Act, sections 57 and 58 of the Evidence Act, s47 of the Care of Children Act", done => {
		getTestResult("1-basic-references", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(
					results.some(
						ref =>
							ref.title ===
								"Protection of Personal and Property Rights Act 1988" &&
							ref.sections.some(
								section => section.id == "5" && section.count === 1
							)
					)
				).equal(true);

				expect(
					results.some(
						ref =>
							ref.title === "Care of Children Act 2004" &&
							ref.sections.some(
								section => section.id == "47A" && section.count === 1
							)
					)
				).equal(true);

				expect(
					results.some(
						ref =>
							ref.title === "Evidence Act 2006" &&
							ref.sections.some(
								section => section.id == "57" && section.count === 1
							) &&
							ref.sections.some(
								section => section.id == "58(2)" && section.count === 1
							)
					)
				).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
"The Act"
---------------------------------------------------
Description:
Sometimes an Act is the only or the primary Act being discussed in a case. It is referred to as "the Act". 
For example, the Care of Children Act 2004 (the Act); or Care of Children Act 2004 ("the Act").
Thereafter, "the Act" (without quotes) should trigger the same logic as the full Act title. So, section 15 of the Act is equivalent to section 15 of the Care of Children Act 2004.

Expected results:
Section 5 of the Protection of Personal and Property Rights Act 1988

File Name: data/legislation/2-the-act.txt
--------------------------------------------------- 
*/

describe('Testing "the Act" definition', function() {
	it("Should return section 5 of the Protection of Personal and Property Rights Act 1988", done => {
		getTestResult("2-the-act", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(
					results.some(
						ref =>
							ref.title ===
								"Protection of Personal and Property Rights Act 1988" &&
							ref.sections.some(
								section => section.id == "5" && section.count === 1
							)
					)
				).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Defined terms
---------------------------------------------------
Description:
Sometimes an Act is given a shorthand descriptor other than "the Act".
For example, the Care of Children Act 2004 (COCA); or Care of Children Act 2004 ("COCA").
Thereafter, "COCA" (without quotes) should trigger the same logic as the full Act title. So, section 15 of the COCA is equivalent to section 15 of the Care of Children Act 2004.

Expected results:
Section 5 of the Protection of Personal and Property Rights Act 1988 (explicit definition)
Section 6 of the Protection of Personal and Property Rights Act 1988 (via defined term)
Section 48 of the Care of Children Act 2004

File Name: data/legislation/3-defined-term.txt
--------------------------------------------------- 
*/

describe("Testing defined terms", function() {
	it("Should return sections 5 and 6 of the Protection of Personal and Property Rights Act, and section 48 of Care of Children Act 2004", done => {
		getTestResult("3-defined-term", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(
					results.some(
						ref =>
							ref.title ===
								"Protection of Personal and Property Rights Act 1988" &&
							ref.sections.some(
								section => section.id == "5" && section.count === 1
							) &&
							ref.sections.some(
								section => section.id == "6" && section.count === 1
							)
					)
				).equal(true);
				expect(
					results.some(
						ref =>
							ref.title === "Care of Children Act 2004" &&
							ref.sections.some(
								section => section.id == "48" && section.count === 1
							)
					)
				).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Subsequent references 
---------------------------------------------------
Description:
Sometimes a section is given after the Act name rather than before. For example, [act name], [section].

Expected results:
Section 12, Evidence Act 2006

File Name: data/legislation/4-subsequent-reference.txt
--------------------------------------------------- 
*/

describe("Testing subsequent reference", function() {
	it("Should return section 12 of the Evidence Act 2006", done => {
		getTestResult("4-subsequent-reference", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(
					results.some(
						ref =>
							ref.title === "Evidence Act 2006" &&
							ref.sections.some(
								section => section.id == "12" && section.count === 1
							)
					)
				).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Subsequent references - defined term
---------------------------------------------------
Description:
A combination of test 2 and 4 - [the Act], [section] - rather than [section] of the Act
A combination of test 3 and 4 - [defined term], [section] - rather than [section] of the [defined term]

Expected results:
Protection of Personal and Property Rights Act 1988, section 11. 
Care of Children Act 2004, section 48.

File Name: data/legislation/5-subsequent-reference-defined.txt
--------------------------------------------------- 
*/

describe("Testing subsequent reference with defined terms", function() {
	it("Should return section 11 of the Protection of Personal and Property Rights Act and section 48 of the Care of Children Act", done => {
		getTestResult("5-subsequent-reference-defined", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(
					results.some(
						ref =>
							ref.title === "Care of Children Act 2004" &&
							ref.sections.some(
								section => section.id == "48" && section.count === 1
							)
					)
				).equal(true);
				expect(
					results.some(
						ref =>
							ref.title ===
								"Protection of Personal and Property Rights Act 1988" &&
							ref.sections.some(
								section => section.id == "11" && section.count === 1
							)
					)
				).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Delayed references - "backup option"
---------------------------------------------------
Description:
An Act might be mentioned well before a section. It might be mentioned at the start of a page, paragraph or sentence - in fact at any arbitrary number of characters prior to the section reference appearing. There needs to be a default / backup option for associating a section number with the relevant Act if it is not explicitly defined or immediately apparent.

The suggested approach is that if no higher priority tests are triggered, and an Act has been previously mentioned in the text, then that Act. Those higher priority tests would be:
1. Basic full references (test 1)
2. The Act / defined terms in the same logic (ie, section 5 of the [defined term]) (test 2 and 3)
3. Immediately subsequent references with or without defined term (test 4 and 5)

For example:
// A limit on jurisdiction appears in the Protection of Personal and Property Rights Act 1988 although not until the end of part 1, at section 11(2).

This text should be parsed by discovering the Act name, and storing it somewhere until overriden by another Act name (or defined term) or higher priority section reference. When the parser reaches section 11(2), it should lookup the "current legislation name" variable to associate section 11 with the Protection of Personal and Property Rights Act 1988.

Note: the "current legislation name" must be updated where an Act name appears but cannot be only via an exclusively sequential assessment. For example the above text might be followed by a basic reference, e.g:

// A limit on jurisdiction appears in the Protection of Personal and Property Rights Act 1988 although not until the end of part 1, at section 11(2). Section 5 of the Evidence Act 2006 ....

There, section 5 is "of the Evidence Act". That is a basic reference that should *not* trigger this test, but *should* update the "current legislation" variable for later references. For example:

// A limit on jurisdiction appears in the Protection of Personal and Property Rights Act 1988 although not until the end of part 1, at section 11(2). Section 5 of the Evidence Act 2006 is confusing. As is section 6.

Here, both section 11(2) and section 6 will be linked to whatever the "current legislation" variable is when those points are reached. Section 5 is a defined term. 

Expected results:
Protection of Personal and Property Rights Act 1988, section 11. 
Evidence Act 2006, Section 5
Evidence Act 2006, Section 6

File Name: data/legislation/6-delayed-reference.txt
--------------------------------------------------- 
*/

describe("Testing delayed reference", function() {
	it("Should return section 11 of the Protection of Personal and Property Rights Act, and section 5 and 6 of the Evidence Act", done => {
		getTestResult("6-delayed-reference", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(
					results.some(
						ref =>
							ref.title === "Evidence Act 2006" &&
							ref.sections.some(
								section => section.id == "5" && section.count === 1
							) &&
							ref.sections.some(
								section => section.id == "6" && section.count === 1
							)
					)
				).equal(true);
				expect(
					results.some(
						ref =>
							ref.title ===
								"Protection of Personal and Property Rights Act 1988" &&
							ref.sections.some(
								section => section.id == "11(2)" && section.count === 1
							)
					)
				).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Missing year
---------------------------------------------------
Description:
An Act, if its full name including year is mentioned, might later be referred to without the year number.

Expected results:
Section 57 of the Evidence Act.
Section 4(1) of the Contractual Remedies Act 1979

File Name: data/legislation/7-missing-year.txt
--------------------------------------------------- 
*/

describe("Testing missing years", function() {
	it("Should return Section 57 of the Evidence Act, section 4 of the Contractual Remedies Act", done => {
		getTestResult("7-missing-year", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(
					results.some(
						ref =>
							ref.title === "Evidence Act 2006" &&
							ref.sections.some(
								section => section.id == "57" && section.count === 1
							)
					)
				).equal(true);
				expect(
					results.some(
						ref =>
							ref.title === "Contractual Remedies Act 1979" &&
							ref.sections.some(
								section => section.id == "4(1)" && section.count === 1
							)
					)
				).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Double section and ranges
---------------------------------------------------
Description:
Multiple sections might be referred to in groups or ranges. For example:
ss is shorthand for "sections"

GROUPS:
sections 5 and 6
ss 5 and 6
ss 5, 6 and 7

RANGES:
sections 20 - 25
ss 20A - 25

At this point ranges do not need to match on all sections between the two numbers, just the two numbers themselves. To match on all between a range, we would need a database of sequential sections for each Act in order to know whether there are any missing or additional sections inside a range eg section 2, 2A, 3. 

Expected results:
Fair Trading Act sections 9, 10, 43, 11, 13, 42 and 45

File Name: data/legislation/8-double-section-and-ranges.txt
--------------------------------------------------- 
*/

describe("Testing multiple sections and ranges", function() {
	it("", done => {
		getTestResult("8-double-section-and-ranges", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(
					results.some(
						ref =>
							ref.title === "Fair Trading Act 1986" &&
							ref.sections.some(
								section => section.id == "9" && section.count === 1
							) &&
							ref.sections.some(
								section => section.id == "10" && section.count === 1
							) &&
							ref.sections.some(
								section => section.id == "43" && section.count === 1
							) &&
							ref.sections.some(
								section => section.id == "11" && section.count === 1
							) &&
							ref.sections.some(
								section => section.id == "13" && section.count === 1
							) &&
							ref.sections.some(
								section => section.id == "42" && section.count === 1
							) &&
							ref.sections.some(
								section => section.id == "45" && section.count === 1
							)
					)
				).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Combination test with subsection complications
---------------------------------------------------
Description:
A combination of previous tests, plus an edge-case of a basic reference being complicated by subsection numbers. An explicit definition is given but broken by two subsection references ("s 308(1) and (4) of the Gambling Act")

Expected results:
Section 15, Gambling Act 2003
Section 308, Gambling Act 2003
Section 7, Credit Contracts and Consumer Finance Act 2003
Section 13, Credit Contracts and Consumer Finance Act 2003
Section 11, Credit Contracts and Consumer Finance Act 2003

File Name: data/legislation/9-combination-test.txt
--------------------------------------------------- 
*/

describe("Combination test, basic reference broken by subsections", function() {
	it("Should return sections 15 and 308 of the Gambling Act, and sections 7, 13 and 11 of the CCCFA", done => {
		getTestResult("9-combination-test", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(
					results.some(
						ref =>
							ref.title === "Credit Contracts and Consumer Finance Act 2003" &&
							ref.sections.some(
								section => section.id == "7(1)" && section.count === 1
							) &&
							ref.sections.some(
								section => section.id == "13" && section.count === 1
							) &&
							ref.sections.some(
								section => section.id == "11" && section.count === 1
							)
					)
				).equal(true);
				expect(
					results.some(
						ref =>
							ref.title === "Gambling Act 2003" &&
							ref.sections.some(
								section => section.id == "15" && section.count === 1
							) &&
							ref.sections.some(
								section => section.id == "308(1)" && section.count === 1
							)
					)
				).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Footnotes 
---------------------------------------------------
Description:
Footnotes are referenced by a context, that is the footnote reference number and a preceeding short snippet of text (to ensure uniqueness).

When iterating through the text and a footnote context is met, it will use the current body's legislation for the footnote text.

Expected results: 
Section 17, Insolvency Act 2006 ( x3 )
Section 310, Gambling Act.

File Name: data/legislation/10-footnotes-interfering.txt
--------------------------------------------------- 
*/
//FIXME: It does not count sections correctly
describe("Footnotes", function() {
	it("Should return section 17 of the Insolvency Act (3 times), and section 310 of the Gambling Act, and (fake) Section 18 of Unit Titles Act 2010", done => {
		getTestResult(
			"10-footnotes-interfering",
			(err, results) => {
				// console.log(results.map(s => {
				// 	return {
				// 		title: s.title,
				// 		sections: JSON.stringify(s.sections)
				// 	}
				// }))
				if (err) {
					done(err);
					return;
				}
				try {
					expect(
						results.some(
							ref =>
								ref.title === "Insolvency Act 2006" &&
								ref.sections.some(
									section => section.id == "17" && section.count === 3
								)
						)
					).equal(true);
					expect(
						results.some(
							ref =>
								ref.title === "Gambling Act 2003" &&
								ref.sections.some(
									section => section.id == "310" && section.count === 1
								)
						)
					).equal(true);
					expect(
						results.some(
							ref =>
								ref.title === "Unit Titles Act 2010" &&
								ref.sections.some(
									section => section.id == "18" && section.count === 1
								)
						)
					).equal(true);
				} catch (ex) {
					done(ex);
					return;
				}
				done();
			},
			{
				case_footnotes_exist_in_text: true,
				case_footnotes_are_valid: true
			}
		);
	});
});

/*
---------------------------------------------------
Accuracy confidence of Legislation To Cases 
---------------------------------------------------
Description:
There are 3 levels of accuracy confidence:
0 - No stripping of footnotes from text, or footnote parsing. Meaning there could be erroneous section references.
1 - Footnotes stripped out, but are invalid (something wrong with citations)
2 - There are no footnotes, or the footnotes that are there are valid

Expected results: 
0, 1, 2

File Names:
- data/legislation/11-accuracy-confidence-0.txt (& .footnotes.txt, .footnotecontexts.txt)
- data/legislation/11-accuracy-confidence-1.txt (& .footnotes.txt, .footnotecontexts.txt)
- data/legislation/11-accuracy-confidence-2.txt (& .footnotes.txt, .footnotecontexts.txt)
--------------------------------------------------- 
*/

describe("Accuracy Confidence", function() {
	it("Should return accuracy 0", done => {
		getTestResult(
			"11-accuracy-confidence-0",
			(err, results) => {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(results[0].accuracy_confidence === 0);
				} catch (ex) {
					done(ex);
					return;
				}
				done();
			},
			{
				case_footnotes_exist_in_text: false,
				case_footnotes_are_valid: false
			}
		);
	});
	it("Should return accuracy 1", done => {
		getTestResult(
			"11-accuracy-confidence-1",
			(err, results) => {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(results[0].accuracy_confidence === 1);
				} catch (ex) {
					done(ex);
					return;
				}
				done();
			},
			{
				case_footnotes_exist_in_text: true,
				case_footnotes_are_valid: false
			}
		);
	});
	it("Should return accuracy 2", done => {
		getTestResult(
			"11-accuracy-confidence-2",
			(err, results) => {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(results[0].accuracy_confidence === 2);
				} catch (ex) {
					done(ex);
					return;
				}
				done();
			},
			{
				case_footnotes_exist_in_text: true,
				case_footnotes_are_valid: true
			}
		);
	});
	it("Should return accuracy 2 (no footnotes)", done => {
		getTestResult("11-accuracy-confidence-2-no-footnotes", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results[0].accuracy_confidence === 2);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Inline quotes
---------------------------------------------------
Description:
Sometimes judgments quote from sections (i.e., they copy and paste the content of a section)
Sections mentioned inside those quotes should be ignored because their appearance is incidental and not useful information for research - i.e., the Court is not discussing those sections, only the primary section.  

Expected results: 
Sections 17, 18 and 19, 31 and 32 of the Evidence Act 2006.
Should NOT include section 20 and 22 of the Evidence Act 2006.

File Name: data/legislation/11-inline-quotes.txt
--------------------------------------------------- 

describe("Inline quotes", function() {
	it("Should return sections 17, 18, 19, 31 and 32 of the Evidence Act and not sections 20 and 22", done => {
		getTestResult("11-inline-quotes.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				// test not implemented
				console.error("test not implemented yet");
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

*/

/*
---------------------------------------------------
Block quote containing contradictory defined term
---------------------------------------------------
Description:
It is possible that a quoted excerpt from a different case would include a defined term eg "the Act" but use it to refer, in the context of that quote, to a different Act.
Block quotes should be self contained, so defined terms within the block quotes should apply but only within that block quote. 

Expected results: 
Sections 17 and 16 of the Insolvency Act
Section 11 of the Credit Contracts and Consumer Finance Act 2003

File Name: data/legislation/12-block-quote-that-defines-term.txt
--------------------------------------------------- 

describe("Block quotes with contradictory defined term", function() {
	it("Should return sections 17 and 16 of the Insolvency Act and section 11 of the Credit Contracts and Consumer Finance Act 2003", done => {
		getTestResult("12-block-quote-that-defines-term.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				// test not implemented
				console.error("test not implemented yet");
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

*/
