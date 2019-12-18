const { readFileSync } = require("fs");
const chai = require("chai");
chai.should();
chai.use(require("./lib/chai-things"));
const expect = chai.expect;
const { processCase } = require("../parser/parseFootnotes");

const makeCaseObject = fileName => {
	const case_text = readFileSync(`${__dirname}/data/footnotes/${fileName}.txt`, "utf8");
	let case_footnotes;
	let case_footnote_contexts;
	try {
		case_footnotes =  readFileSync(`${__dirname}/data/footnotes/${fileName}.footnotes.txt`, "utf8");
	} catch(ex) {

	}
	try {
		case_footnote_contexts =  readFileSync(`${__dirname}/data/footnotes/${fileName}.footnotecontexts.txt`, "utf8");
	} catch(ex) {
		
	}

	return {
		id: 1,
		case_text,
		case_footnotes,
		case_footnote_contexts
	}
}

/*
====================================================
TESTS
====================================================

*/

/*
---------------------------------------------------
Footnotes Validity and Existence
---------------------------------------------------
Description: Validity and existence

Expected results: 
- Exists
- Does not Exist
- Valid
- Is Not Valid
- Is Not Valid

File Names: 
- data/footnotes/exists.txt
- data/footnotes/not-exist.txt
- data/footnotes/valid.txt
- data/footnotes/not-valid.txt
- data/footnotes/invalid-footnote-number.txt
--------------------------------------------------- 
*/

// TODO: Rename files to be more explicit about what is invalid

describe('Validity and existence of footnotes/contexts', function() {

	it("Should exist", () => {
		
		const { footnotesExistInText } = processCase(makeCaseObject("exists"))
		
		expect(footnotesExistInText).equal(true)

	});

	it("Should not exist", () => {

		const { footnotesExistInText } = processCase(makeCaseObject("not-exist"))
		
		expect(footnotesExistInText).equal(false)

	});

	it("Is valid", () => {
		
		const { isValid } = processCase(makeCaseObject("valid"))
		
		expect(isValid).equal(true)

	});

	it("Is not valid", () => {

		const { isValid } = processCase(makeCaseObject("not-valid"))
		
		expect(isValid).equal(false)

	});

	it("Is not valid (number formatting)", () => {

		const { isValid } = processCase(makeCaseObject("invalid-footnote-number"))
		
		expect(isValid).equal(false)

	});

});