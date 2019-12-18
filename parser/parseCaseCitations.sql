-- 1. note that table name is pipeline_cases.case_citations_tmp that is the one of temporary tables for cases.cases
-- 2. All temporary tables will be inserted as a joined form

-- drop table pipeline_cases.case_citations_tmp

create table pipeline_cases.case_citations_tmp
as select id case_id, regexp_matches(case_text, '\[\d{4}\]\s[[:alpha:]]{4}\s[0-9]{1,4}') citation from pipeline_cases.cases;

insert into pipeline_cases.case_citations_tmp
select id case_id, regexp_matches(case_text, '\[\d{4}\]\s[0-9]\s[[:alpha:]]{4}\s[0-9]{1,4}') citation from pipeline_cases.cases;

commit;
