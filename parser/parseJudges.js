const { setLogFile, setLogDir, log } = require('../common/functions').makeLogger();
/**
 * For run this parser file in commend line with "node --max-old-space-size=4096 .\parseJudges.js --env== whatyouwant"
 * After my test that currently cannot using wild expression will lose some accuracy.
 * 
 * some of special error cases
 * id=5951 blank
 * id = 7282 blank
 * id = 7423 blank
 * id = 7772 blank
 * id = 7817 end with H
 * id = 30040 TIJDGMENT OF JUDGE K D KELLY should be
 * id = 29118 JUDGMENT OF ASSOCIATE FAIRE
 * 11614 'SENTENCING NOTES OF OF GENDALL J',
 * id = 30040 TIJDGMENT OF JUDGE K D KELLY should be
 * id = 29118 JUDGMENT OF ASSOCIATE FAIRE
 * @author Tian Bai
 */
const justiceMap = {
	Directions: /^DIRECTIONS\sOF\s(.*)\sJ/,
	Decision: /^DECISION\sOF\s(.*)\sJ/,
	DecisionSp1: /^.*DECISION\sOF\s(.*)\sJ/,
	SentNote: /^SENTENCING\sNOTES\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	SentNoteSP1:/NOTES\sON\sSENTENCE\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	SentNoteSp2: /^.*SENTENCING\sNOTES\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	ReSentNote: /^RE-SENTENCING\sNOTES\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	SentHon:/^SENTENCE\sOF\sHON\sJUSTICE\s(.*)/,
	Sent:/^SENTENCE\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	SentRemarks:/^SENTENCING\sREMARKS\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	SentRemarksSp1:/^\[.*\]\sSENTENCING\sREMARKS\sOF\s([a-zA-Z0-9\s]*)\sJ/,

	JudgeHonJustice:/^JUDGMENT\sOF\sHON\sJUSTICE\s(.*)/,
	JudgeHonJusticeSp1:/^JUDGMENT\sOF\sHON\.\sJUSTICE\s(.*)/,
	JudgeHonJusticeSp2:/^RESERVED\sJUDGMENT\sOF\sHON\.\sJUSTICE\s(.*)/,
	JudgeHonJusticeSp3:/^.*JUDGMENT\sOF\sHON\.\sJUSTICE\s(.*)/,
	JudgeHonJusticeSp4:/^ORAL\sJUDGMENT\sOF\sJUDGMENT\sOF\sHON\sJUSTICE\s(.*)/,

	JudgeTheCourtDelivered: /^JUDGMENT\sOF\sTHE\sCOURT\sDELIVERED\sBY\s([a-zA-Z0-9\s]*)\sJ/,
	JudgeJustice: /^JUDGMENT\sOF\sJUSTICE\s(.*)/,
	JudgeCosts: /^COSTS\sJUDGMENT\sOF\s([a-zA-Z0-9\s]*)\sJ/,	
	JudgeCostsSp1:/^JUDGMENT\sAS\sTO\sCOSTS\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	JudgeCostsSp2: /^COSTS\sJUDGMENT\s\(.*\)\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	JudgeCostsSp3: /^COSTS\sJUDGMENT\s.*\sOF\s([a-zA-Z0-9\s]*)\sJ/,

	JudgeNumber1: /^JUDGEMENT\s\(.*\)\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	JudgeNumber2: /^JUDGMENT\s\(.*\)\sOF\s([a-zA-Z0-9\s]*)\sJ/,

	JudgeOralHon:/^ORAL\sJUDGMENT\sOF\sHON\sJUSTICE\s(.*)/,
	JudgeOral:/^ORAL\sJUDGMENT\sOF\s(.*)\sJ/,
	JudgeOralSP1:/ORAL\sJUDGMENT\s(.*)OF\sJ/,

	JudgeTheCourt:/^\(Given\sby\s(\S*)\sJ\)/,
	JudgeTheCourtSp1:/^JUDGMENT\sOF\sTHE\sCOURT\sON\sCOSTS\sDELIVERED\sBY\s([a-zA-Z0-9\s]*)\sJ/,
	JudgeTheCourtSp2:/^JUDGMENT\sOF\sTHE\sCOURT\sAS\sTO\sCOSTS\sDELIVERED\sBY\s([a-zA-Z0-9\s]*)\sJ/,
	JudgeTheCourtSp3:/^JUDGMENT\sOF\sCOURT\sDELIVERED\sBY\s([a-zA-Z0-9\s]*)\sJ/,
	JudgeTheCourtSp4:/^JUDGMENT\sOF\sTHE\sCOURT\sDELIVERED\sBY\s([a-zA-Z0-9\s]*)\sJ/,
	JudgeTheCourtSp5:/^JUDGMENT\sOF\sCOURT\sOF\sDELIVERED\sBY\s([a-zA-Z0-9\s]*)\sJ/,
	JudgeInterim:/^INTERIM\sJUDGMENT\sOF\sTHE\sHON\sJUSTICE\s(.*)/,

	Ruling:/^RULING\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	Ruling1:/^RULING\s.*\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	Ruling2:/^.*RULING\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	RulingSp3:/^.*RULING\s.*\sOF\s([a-zA-Z0-9\s]*)\sJ/,

	ResultJudgement: /^RESULT\sJUDGMENT\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	ReservedJudgement:/^RESERVED\sJUDGMENT\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	ReservedJudgementSP1:/^\(.*\)\sJUDGMENT\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	ReservedCostsJudgement:/^RESERVED\sCOSTS\sJUDGMENT\sOF\s([a-zA-Z0-9\s]*)\sJ/,

	RecallJudge: /^RECALL\sJUDGMENT\sOF\s([a-zA-Z0-9\s]*)\sJ/,

	JudgeSP1: /^JUDGEMENT\sOF\s([a-zA-Z0-9\s]*)\sJ/,	
	JudgeSP2: /^\[.*\]\sJUDGMENT\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	JudgeSP3: /^\[.*\]\sJUDGMENT\sOF\s([a-zA-Z0-9\s]*)\sJ\(.*\)/,
	//29162
	JudgeSP4: /\(.*\)\sJUDGMENT\s\(.*\)\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	JudgeSP5: /^.*JUDGMENT\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	JudgeSP6: /^.*JUDGMENT.*\sOF\s([a-zA-Z0-9\s]*)\sJ/,
	JudgeSP7: /^JUDGMENT\sOF\s([a-zA-Z0-9\s]*)\s\(.*\)/,
	JudgeSP8: /^JUDGMENT\sOF\sJUDGE\s(.*)/,
	JudgeSP9: /^JUDGMENT\sOF\sJUDGE\s(.*)\s\[.*\]/,
	JudgeSP11: /^JUDGMENT\sOF\s(.*)\sJ\s.*/,
	Judge: /^JUDGMENT\sOF\s(.*)\sJ/,
};


const assoJudge = {
	JudgeAssociateOnCosts1: /^JUDGMENT\sOF\sASSOCIATE\sJUDGE\s(.*)\s\[.*\]/,
	JudgeAssociateOnCosts2: /^JUDGMENT\sOF\sASSOCIATE\sJUDGE\s(.*)\s\(.*\)/,
	JudgeAssociateOnCosts3: /^JUDGMENT\sOF\sASSOCIATE\sJUDGE\s(.*)\sON\sCOSTS/,

	JudgeAssociateSp1: /^.*JUDGMENT\sOF\sASSOCIATE\sJUDGE\s(.*)\s\(.*\)/,
	JudgeAssociateSp2: /^.*JUDGMENT\sOF\sASSOCIATE\sJUDGE\s(.*)/,
	
	JudgeAssociateSp3: /^JUDGMENT\sFOR\sASSOCIATE\sJUDGE\s(.*)/,
	JudgeAssociateSp4: /^.*JUDGMENT\sFOR\sASSOCIATE\sJUDGE\s(.*)/,

	OralJudgeAssociate: /^ORAL\sJUDGMENT\sOF\sASSOCIATE\sJUDGE\s(.*)/,
	OralJudgeAssociateSp1: /^ORAL\sJUDGMENT\sOF\sASSOCIATE\sJUDGE\s(.*)\s.*/,

	OralJudgeAssociateSp2: /^ORAL\sJUDGEMENT\sOF\sASSOCIATE\sJUDGE\s(.*)/,
	OralJudgeAssociateSp3: /^ORAL\sJUDGMENT\sOF\sASSOCIATE\sJUDGE\s(.*)\s\(.*\)/,
	OralDecisionAssociate: /^ORAL\sDECISION\sOF\sASSOCIATE\sJUDGE\s(.*)/,
	OralRulingAsso:/^ORAL\sRULING\sOF\sASSOCIATE\sJUDGE\s(.*)/,

	RulingAsso1:/^RULING\s\(.*\)\sOF\sASSOCIATE\sJUDGE\s(.*)/,
	RulingAsso2:/^.*RULING\s\(.*\)\sOF\sASSOCIATE\sJUDGE\s(.*)/,

	JudgeNo1Asso: /^JUDGMENT\s\(.*\)\sOF\sASSOCIATE\sJUDGE\s(.*)/,
	JudgeNo1AssoWithDotOral: /^ORAL\sJUDGMENT\s\(.*\)\sOF\sASSOCIATE\sJUDGE\s(.*)/,

	JudgeAssociateReserved:/^RESERVED\sJUDGMENT\s\(.*\)\sOF\sASSOCIATE\sJUDGE\s(.*)/,

	DecisionAssociate: /^DECISION\sOF\sASSOCIATE\sJUDGE\s(.*)/,
	DecisionAssociateSp1: /REASONS\sFOR\sDECISION\sOF\sASSOCIATE\sJUDGE\s(.*)/,
	Orders:/ORDERS\sOF\sASSOCIATE\sJUDGE\s(.*)/,
	JudgeAssociate: /^JUDGMENT\sOF\sASSOCIATE\sJUDGE\s(.*)/,
};

const localJudge = {
	ReservedJudgement1:/^RESERVED\sJUDGMENT\sOF\sJUDGE\s([a-zA-Z0-9\s]*)/,
	Judge: /^JUDGMENT\sOF\sJUDGE\s([a-zA-Z0-9\s]*)/,
	Decision: /^DECISION\sOF\sJUDGE\s([a-zA-Z0-9\s]*)/,
	Minute:/^MINUTE\sOF\sJUDGE\s([a-zA-Z0-9\s]*)/,
	Court:/^Court:\tDistrict\sCourt\sJudge\s([a-zA-Z0-9\s]*)/,
	
};

const run = async (pgPromise, connection, logDir) => {
	console.log('\n-----------------------------------');
	console.log('Parse judge');
	console.log('-----------------------------------\n');

	setLogDir(logDir);
	setLogFile(__filename);

	console.log('Loading all cases and case citations');

	var queryClause = 'SELECT * FROM cases.cases ';
	var parsedResult = new Map();
	var unParsedResult = [];

	function extractJustices(justices){
		const valuesToRemove = ['and','JJ' ];
		var lastElement = justices.pop().trim();
		var lastTwo;
		
		if(lastElement.includes('and') && !lastElement.includes('JJ') ) lastTwo = lastElement.split('and');
		else if(lastElement.includes('&') && !lastElement.includes('JJ') ) lastTwo = lastElement.split('&');
		else if(lastElement.includes('&') && lastElement.includes('JJ') ) lastTwo = lastElement.split('&');
		else lastTwo = lastElement.split(' ').filter(lastTwo =>  !valuesToRemove.includes(lastTwo) );
		
		return justices.concat(lastTwo);
	};

	//help method for insert value into result list
	function insertResult(judgeName, caseID, titleID){
	
		if(!parsedResult.has(judgeName)){
			parsedResult.set(judgeName, [ [caseID], [titleID] ] );
		}else{
			var casesApper = parsedResult.get(judgeName)[0];
			casesApper.push(caseID);
			var titles = parsedResult.get(judgeName)[1];
			if (!titles.includes(titleID)) titles.push(titleID);
			parsedResult.set(judgeName, [casesApper, titles]);
		}

	};

	function parseMultiJudgesCases(caseString, matchingToken, caseID){
		var parsed = false;

		var courtIndex = caseString.indexOf(matchingToken);
		var counselIndex = caseString.indexOf('\rCounsel:');
		
		if (counselIndex == -1) counselIndex = caseString.indexOf('Appearances:');
		if (counselIndex == -1) counselIndex = caseString.indexOf('Judgment:');

		var judgeStr = caseString.substring(courtIndex+7, counselIndex);
			
		// remove year
		if (judgeStr.match(/\d{4}/ )) judgeStr = judgeStr.substring(judgeStr.match(/\d{4}/ ).index+4);
		if(judgeStr.includes('and') && !judgeStr.match(/\w+and\w+/)){
			var justices = extractJustices(judgeStr.split(','));
			justices.forEach(element =>{
				var judge = element.trim();
				if(judge.includes('P'))insertResult(judge.replace('P', '').trim(), caseID, 2);
				else if(judge.includes('CJ'))insertResult(judge.replace('CJ', '').trim(), caseID, 1);
				else insertResult(judge, caseID, 3);
						
			});
			parsed = true;
				
		}else if(judgeStr.match(/Judge/)){
			var judges = judgeStr.split(/Judge/);
			judges.forEach(element =>{
				var judge = element.replace(',','').trim();
				if(judge.includes('J'))insertResult(judge.replace('J', '').trim(), caseID, 3);
				else if(judge.includes('P'))insertResult(judge.replace('P', '').trim(), caseID, 2);
				else insertResult(judge, caseID, 5);
					
			});
			parsed = true;
	
		}else{
			var justices = judgeStr.trim().split(/\s/);
			for (var i = 0; i < justices.length; i=i+2) {
				if(justices[i+1] == 'J') insertResult(justices[i], caseID, 3);
				else if(justices[i+1] == 'P') insertResult(justices[i], caseID, 2);
				else if(justices[i+1] == 'CJ') insertResult(justices[i], caseID, 1);
			}
			parsed = true;
		}
		
		return parsed;
		
	};

    const cases = await connection.any(queryClause);
	const valuesToRemove = ['','Introduction' ];
	
    cases.forEach(

        element => {
        var case_text = element.case_text.split(/\r\n/).filter(text =>  !valuesToRemove.includes(text)   );
		var caseID = element.id;
		var parsed = false;

        for( var i = 0; i < case_text.length; i++){ 
			
			// assojudge cases with judge title_id=5
			for (var key in assoJudge) {
				if(case_text[i].match( assoJudge[key]) ){
					var temp = case_text[i].match(assoJudge[key]);
					insertResult([...temp][1], element.id, 5);
					parsed = true;
					break;
				}
			}
			if(parsed) break;
			// justices cases with judge title_id=3
			for (var key in justiceMap) {
				if(case_text[i].match( justiceMap[key]) ){
					var temp = case_text[i].match(justiceMap[key]);
					insertResult([...temp][1], element.id, 3);
					parsed = true;
					break;
				}
			}
			if(parsed) break;
			// local cases with judge title_id=7
			for (var key in localJudge) {
				if(case_text[i].match( localJudge[key]) ){
					
					var temp = case_text[i].match(localJudge[key]);
					insertResult([...temp][1], element.id, 7);
					parsed = true;
					break;
				}
			}
			if(parsed) break;
			
			/**
			 * multiple lines cases:
			 * 11175 20096 
			 * 7165 Court:\r   \rAppearances: no \rCounsel:
			 * 29865 Coram: Glazebrook 
			 */
			else if ( case_text[i].match('Court:\r') && !case_text[i].match('and')){
				var caseString = [ case_text[i], case_text[i+1], case_text[i+2]].join(' ');
				parsed = parseMultiJudgesCases(caseString, 'Court:\r', caseID);
				if(parsed) break;
			}
			//id = 29865"Coram:\tGlazebrook J Chambers J O'Regan J"
			else if ( case_text[i].match('Coram:\t') && !case_text[i].match('and')){
				var caseString = [ case_text[i], case_text[i+1], case_text[i+2]].join(' ');
				parsed = parseMultiJudgesCases(caseString, 'Coram:\t', caseID);
				if(parsed) break;
			}
		
			else if (case_text[i].match('Court:\r') ) {
				var splitByR = String(case_text[i] + '\r'+ case_text[i+1]).split('\r');
				var courtIndex = splitByR.indexOf('Court:');
				var element = splitByR[courtIndex+1].split(',') ;
				var justices = extractJustices([...element]);
				justices.forEach(element =>{
					var judge = element.trim();
					if(judge.includes(' P'))insertResult(judge.replace(' P', '').trim(), caseID, 2);
					else if(judge.includes('CJ'))insertResult(judge.replace('CJ', '').trim(), caseID, 1);
					else insertResult(judge, caseID, 3);
						
				});
				parsed = true;
				break;
			}
			//Example: 27222 court:\t
			else if (case_text[i].match('Court:\t') ) {
				var caseString = [ case_text[i], case_text[i+1], case_text[i+2]].join(' ');
				var courtIndex = caseString.indexOf('Court:\t');
				var counselIndex = caseString.indexOf('Counsel:');
				if (counselIndex == -1) counselIndex = caseString.indexOf('Appearances:');
				if (counselIndex == -1) counselIndex = caseString.indexOf('Judgment:');

				var judgeStr = caseString.substring(courtIndex+7, counselIndex);
				
				// remove year
				if (judgeStr.match(/\d{4}/ )) judgeStr = judgeStr.substring(judgeStr.match(/\d{4}/ ).index+4);
				
				if(judgeStr.includes('and') && !judgeStr.match(/\w+and\w+/)){
					var justices = extractJustices(judgeStr.split(','));
					
					justices.forEach(element =>{
						var judge = element.trim();
						if(judge.includes('P'))insertResult(judge.replace('P', '').trim(), caseID, 2);
						else if(judge.includes('CJ'))insertResult(judge.replace('CJ', '').trim(), caseID, 1);
						else if(judge.includes('J'))insertResult(judge.replace('J', '').trim(), caseID, 3);
						else insertResult(judge, caseID, 3);
							
					});
					parsed = true;
					break;
				}
				else if(judgeStr.match(/Judge/)){
					var judges = judgeStr.split(/Judge/);
					judges.forEach(element =>{
						var judge = element.replace(',','').trim();
						// findTitleInsertReuslt(judge, caseID, true);
						if(judge.includes('J'))insertResult(judge.replace('J', '').trim(), caseID, 3);
						else insertResult(judge, caseID, 5);
						
					});
					parsed = true;
					break;
				}
			}
			
		}
		
	if(!parsed) unParsedResult.push(caseID);

	});

	const fs = require('fs');
	let outputData = unParsedResult.toString();
	
	fs.writeFileSync('ParseJudgeBugCases.txt',outputData, function (err) {
		if (err) 
			return console.log(err);
	}); 

	var judgeInsertQueries = [];
	var judgeRelationInsertQueries = [];

	var judgeID = 1;
	var judgeRelationID = 1;
	parsedResult.forEach(
		(value,key)=>{
			key = key.replace('\'', '\'\'');
			if(key.length > 20 || key.length <3 || key.toLowerCase() == "the" || key.toLowerCase() == "judge" 
			|| key.toLowerCase() == "er" || key.toLowerCase() == "hon" || key.toLowerCase() == "court"){
				console.log(`[${key}] = ${value[0]} = ${value[1]}`);
				
			}else{
				console.log(`INSERT INTO cases.judges(id,last_name) VALUES(\'${judgeID}\', \'${key}\') ON CONFLICT DO NOTHING`);
				judgeInsertQueries.push(`INSERT INTO cases.judges(id,last_name) VALUES (\'${judgeID}\', \'${key}\') ON CONFLICT DO NOTHING;`);


				fs.appendFileSync('ParseJudgeBugCases.txt',`\nname: [${key}] titles: ${value[1]}\n cases: ${value[0]} \n`, function (err) {
					if (err) 
						return console.log(err);
				}); 

				value[1].forEach(
					titleID =>{
						console.log(`INSERT INTO judges_title_relation (id, judge_id， judge_title_id) 
						VALUES ('${judgeRelationID}', '${judgeID}', '${titleID}') ON CONFLICT DO NOTHING`);
						judgeRelationInsertQueries.push(`INSERT INTO cases.judges_title_relation (id, judge_id, judge_title_id) 
						VALUES ('${judgeRelationID}', '${judgeID}', '${titleID}') ON CONFLICT DO NOTHING`);
						judgeRelationID++;
					}
				);
				judgeID++;
			}
	});


	console.log('Insert judge table', judgeInsertQueries.length, 'Insert judge relation table', judgeRelationInsertQueries.length);
	if (judgeInsertQueries.length > 0) {
		await connection.multi(judgeInsertQueries.join(';'));

	}

	if (judgeRelationInsertQueries.length > 0) {
		await connection.multi(judgeRelationInsertQueries.join(';'));
	}

	console.log( `${unParsedResult.length} cases unparsed`);
	console.log('Done');
};


if (require.main === module) {
	const argv = require('yargs').argv;
	(async () => {
		try {
            const { pgPromise, connection, logDir } = await require('../common/setup')(argv.env);
            console.log(argv.env);
			await run(pgPromise, connection, logDir);
		} catch (ex) {
			console.log(ex);
		}
	})().finally(process.exit);
} else {
	module.exports = run;
	module.exports.courtsMap = courtsMap;
}
	
// CREATE TABLE cases.judge_titles
// (
//     id integer NOT NULL DEFAULT nextval('cases.judge_titles_id_seq'::regclass),
//     short_title text COLLATE pg_catalog."default",
//     long_title text COLLATE pg_catalog."default",
//     CONSTRAINT judge_titles_pkey PRIMARY KEY (id),
//     CONSTRAINT judge_titles_long_title_key UNIQUE (long_title),
//     CONSTRAINT judge_titles_short_title_key UNIQUE (short_title)
// )

// id short_title long_title
// 1	CJ	Chief Justice
// 2	P	President of the Court of Appeal
// 3	J	Justice (Supreme Court, Court of Appeal, High Court)
// 4	JJ	Justices (Supreme Court, Court of Appeal, High Court)
// 5	Associate Judge	Associate Judge
// 6	Master	Master
// 7	Judge	(District Court) Judge
// 8	Chief Judge	Chief Judge of the Employment Court, Chief Judge of District Court, Chief Judge of Māori Land Court
// 9	Principal Judge	Principal Family Court Judge, Principal Youth Court Judge and Principal Environment Judge

// CREATE TABLE cases.judges
// (
//     id integer NOT NULL DEFAULT nextval('cases.judges_id_seq'::regclass),
//     first_name text COLLATE pg_catalog."default",
//     last_name text COLLATE pg_catalog."default" NOT NULL,
//     CONSTRAINT judges_pkey PRIMARY KEY (id)
// )

// CREATE TABLE cases.judges_title_relation
// (
//     id integer NOT NULL DEFAULT nextval('cases.judges_title_relation_id_seq'::regclass),
//     judge_id integer,
//     judge_title_id integer,
//     CONSTRAINT judges_title_relation_pkey PRIMARY KEY (id),
//     CONSTRAINT judges_title_relation_judge_id_fkey FOREIGN KEY (judge_id)
//         REFERENCES cases.judges (id) MATCH SIMPLE
//         ON UPDATE NO ACTION
//         ON DELETE NO ACTION
//         NOT VALID,
//     CONSTRAINT judges_title_relation_judge_title_id_fkey FOREIGN KEY (judge_title_id)
//         REFERENCES cases.judge_titles (id) MATCH SIMPLE
//         ON UPDATE NO ACTION
//         ON DELETE NO ACTION
//         NOT VALID
// )