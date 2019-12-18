const { readFileSync } = require("fs");
const chai = require("chai");
chai.should();
chai.use(require("./lib/chai-things"));
const expect = chai.expect;

const { regNeutralCite } = require("../parser/parseEmptyCitations");
const citationData = readFileSync(
	__dirname + "/data/case-citations.txt",
	"utf8"
);

describe("Case Citations", function() {
	it("Testing neutral citation regex", function() {
		var neutralCitations = citationData.match(regNeutralCite);
		// remove errant line breaks
		neutralCitations = neutralCitations.map(function(x) {
			return x.replace(/\n/g, " ");
		});
		// make sure each type of neutral citation will return (non-pinpoint at this stage)
		var neutralArray = [
			"[2012] NZHC 507",
			"[2012] NZDC 12",
			"[2012] NZCA 12",
			"[2012] NZSC 12",
			"[2012] NZEnvC 13",
			"[2012] NZEmpC 13",
			"[2012] NZACA 13",
			"[2012] NZBSA 13",
			"[2012] NZCC 13",
			"[2012] NZCOP 13",
			"[2012] NZCAA",
			"[2012] NZDRT 13",
			"[2012] NZHRRT 13",
			"[2012] NZIACDT 13",
			"[2012] NZIEAA 13",
			"[2012] NZLVT 13",
			"[2012] NZLCDT 13",
			"[2012] NZLAT 13",
			"[2012] NZSHD 13",
			"[2012] NZLLA 13",
			"[2012] NZMVDT 13",
			"[2012] NZPSPLA 13",
			"[2012] NZREADT 13",
			"[2012] NZSSAA 13",
			"[2012] NZTRA 13"
		];
		expect(JSON.stringify(neutralCitations)).equal(
			JSON.stringify(neutralArray)
		);
	});
});
