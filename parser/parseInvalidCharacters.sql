-- 1. note that table name is pipeline_cases.cases_rep that is the one of temporary tables for cases.cases
-- 2. All temporary tables will be inserted as a joined form

-- drop table pipeline_cases.cases_rep

create table pipeline_cases.cases_rep
as select id case_id
, replace(replace(replace(replace(replace(replace(replace(replace(case_text, '?', ''),'…', ''),'‘', E'\''),'’', E'\''),'“', E'\"'),'”', E'\"'),'',''),'?','') case_text 
, replace(replace(replace(replace(replace(replace(replace(replace(case_footnotes, '?', ''),'…', ''),'‘', E'\''),'’', E'\''),'“', E'\"'),'”', E'\"'),'',''),'?','') case_footnotes 
, replace(replace(replace(replace(replace(replace(replace(replace(case_footnote_contexts, '?', ''),'…', ''),'‘', E'\''),'’', E'\''),'“', E'\"'),'”', E'\"'),'',''),'?','') case_footnote_contexts
from pipeline_cases.cases;
