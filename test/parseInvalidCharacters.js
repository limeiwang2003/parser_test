const { readFileSync } = require("fs");
const chai = require("chai");
chai.should();
chai.use(require("./lib/chai-things"));
const expect = chai.expect;
const { characterReplaceMap, replaceText } = require("../parser/parseInvalidCharacters");


/*
====================================================
TESTS
====================================================

*/

/*
---------------------------------------------------
Basic References
---------------------------------------------------
Description: Remove/replace invalid characters 

Expected results: 
1. Removed invalid characters according to map
2. Replace invalid characters according to map (if not empty string)

File Name: data/invalid-characters.txt
--------------------------------------------------- 
*/

describe('Remove characters', function() {

	it("Should remove all invalid characters", () => {
		
		const dataFile = readFileSync(__dirname + "/data/invalid-characters.txt", "utf8");
		const [ result ] = replaceText(dataFile)
		
		characterReplaceMap.forEach(mapItem => {
			expect(result.indexOf(mapItem[0])).equal(-1)
		})

	});

	it("Should replace invalid characters with valid characters", () => {
		
		const dataFile = readFileSync(__dirname + "/data/invalid-characters.txt", "utf8");
		const [ result ] = replaceText(dataFile)
		
		characterReplaceMap.forEach(mapItem => {
			if(mapItem[1] !== "") {
				expect(result.indexOf(mapItem[1])).to.not.equal(-1)
			}
			
		})

	});

	// TODO: Length test between dataFile and result

});
