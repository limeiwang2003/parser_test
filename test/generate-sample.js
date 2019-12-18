const chai = require("chai");
chai.should();
chai.use(require("./lib/chai-things"));
const expect = chai.expect;

const { calculateLegislationSectionsRange, getChosenCases } = require("../generate-sample/index");

const cases_1 = [
	{
		legislation_section_count: 5
	},
	{
		legislation_section_count: 10
	},
	{
		legislation_section_count: 8
	}
];

describe("MTurk CSV parameters", function() {
	it("Should return accurate standard deviation, upper and lower range, and random", function() {
		
		const expectedStandardDeviation = Math.round(2.0548046676563);
		const expectedMean = Math.round(7.6666666666667);

		const {
			lowerRangeValue,
			standardDeviation,
			upperRangeValue,
			randomRangeValue
		} = calculateLegislationSectionsRange(cases_1);

		// console.log(lowerRangeValue, expectedMean - expectedStandardDeviation);
		// console.log(standardDeviation, expectedStandardDeviation);
		// console.log(upperRangeValue, expectedMean + expectedStandardDeviation);
		// console.log(randomRangeValue);

		expect(lowerRangeValue).equal(expectedMean - expectedStandardDeviation);
		expect(standardDeviation).equal(expectedStandardDeviation);
		expect(upperRangeValue).equal(expectedMean + expectedStandardDeviation);
		expect(
			randomRangeValue >= lowerRangeValue && randomRangeValue <= upperRangeValue
		).equal(true);
	});

	
	// it("Should return 10 cases", function() {
		
		
	// });

});
