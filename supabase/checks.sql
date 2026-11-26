-- Tidal Forecast Mission: checking that a session's data arrived.
-- Paste one query at a time into the Supabase SQL editor (Project → SQL Editor → New query).
-- The editor runs as the project owner, so it can read the tables; the page's public key can't.
--
-- The views latest_snapshots and events_clean leave out dev rows (the tester link). These
-- queries read the tables directly, so tester sessions show up too, with dev = true.


-- 1. Who sent data recently? One row per participant: find your tester here.
--    Change '3 days' to cover the test. dev = true means it came from the tester link.
select s.participant_id,
       s.condition,
       s.module_version,
       bool_or(s.dev)                                   as any_dev,
       bool_and(s.dev)                                  as all_dev,
       count(distinct s.session_id)                     as sessions,
       count(*)                                         as snapshots,
       min(s.received_at)                               as first_seen,
       max(s.received_at)                               as last_seen,
       string_agg(distinct s.reason, ', ')              as reasons
from public.session_snapshots s
where s.received_at > now() - interval '3 days'
group by s.participant_id, s.condition, s.module_version
order by last_seen desc;


-- In queries 2–6, replace PASTE_PARTICIPANT_ID with the participant_id from query 1.


-- 2. Did each part of the study arrive? Reads the newest snapshot of each session.
--    Empty columns are parts the learner hadn't reached (or that never arrived).
select distinct on (s.session_id)
       s.session_id,
       s.dev,
       s.module_version,
       s.received_at                                    as newest_snapshot,
       s.reason                                         as newest_reason,
       s.record #>> '{study,consent,choice}'            as consent,
       s.record #>> '{study,pretest,submittedAt}'       as pretest_submitted,
       s.record #>> '{completedAt}'                     as mission_finished,
       s.record #>> '{study,posttest,submittedAt}'      as posttest_submitted,
       s.record #>> '{study,survey,submittedAt}'        as survey_submitted,
       s.record -> 'summary'                            as mission_summary,
       s.record -> 'devMode' is not null and s.record -> 'devMode' <> 'null'::jsonb as used_dev_jumps
from public.session_snapshots s
where s.participant_id = 'PASTE_PARTICIPANT_ID'
order by s.session_id, s.received_at desc;


-- 3. Every snapshot in order: shows the milestones that were sent (consent, step-…, finish …).
select s.received_at, s.client_time, s.session_id, s.reason, s.dev,
       pg_size_pretty(octet_length(s.record::text)::bigint) as size
from public.session_snapshots s
where s.participant_id = 'PASTE_PARTICIPANT_ID'
order by s.received_at;


-- 4. Each mission task, from the newest snapshot: how it was completed and what the first try was.
select a.key                                            as activity,
       a.value ->> 'completion'                         as completion,
       a.value #>> '{firstAttempt,outcome,overall}'     as first_try,
       jsonb_array_length(coalesce(a.value -> 'retries', '[]'::jsonb)) as retries,
       jsonb_array_length(coalesce(a.value -> 'hintsViewed', '[]'::jsonb)) as hints,
       a.value ->> 'completedAt'                        as completed_at
from (
  select s.record
  from public.session_snapshots s
  where s.participant_id = 'PASTE_PARTICIPANT_ID'
  order by s.received_at desc
  limit 1
) latest,
jsonb_each(latest.record -> 'activities') a
order by a.value ->> 'startedAt' nulls last;


-- 5. Did any events go missing? seq counts up by one per event in that browser, so a gap
--    means lost events and extra rows over the distinct count are harmless duplicates.
select e.participant_id,
       count(*)                                         as rows,
       count(distinct e.seq)                            as distinct_events,
       count(*) - count(distinct e.seq)                 as duplicates,
       min(e.seq)                                       as first_seq,
       max(e.seq)                                       as last_seq,
       (max(e.seq) - min(e.seq) + 1) - count(distinct e.seq) as missing,
       min(e.received_at)                               as first_event,
       max(e.received_at)                               as last_event,
       count(*) filter (where e.type = 'error')         as page_errors
from public.events e
where e.participant_id = 'PASTE_PARTICIPANT_ID'
group by e.participant_id;


-- 6. What kinds of events arrived, and any page errors.
select e.type, count(*) as n, min(e.client_time) as first, max(e.client_time) as last
from public.events e
where e.participant_id = 'PASTE_PARTICIPANT_ID'
group by e.type
order by n desc;

select e.client_time, e.page, e.data
from public.events e
where e.participant_id = 'PASTE_PARTICIPANT_ID' and e.type = 'error'
order by e.seq;


-- 7. Quick Check 4 before and after the 2.3.2 fix. Before it, R was locked until step 1 was
--    right, so every first try has all step 1 values correct. Compare by module_version.
--    2.3.1 sessions after 2026-11-26 03:47 UTC got a hotfix that unlocked R (but kept the old
--    step 2), so within 2.3.1 also look at received_at.
select s.module_version,
       s.received_at,
       s.participant_id,
       s.dev,
       s.record #>> '{activities,qc-4,firstAttempt,outcome,overall}' as qc4_first_try,
       (select string_agg(k ->> 'key', ',') from jsonb_array_elements(s.record #> '{activities,qc-4,firstAttempt,outcome,known}') k
         where (k ->> 'correct')::boolean is not true)              as qc4_step1_wrong
from public.latest_snapshots s
where s.record #> '{activities,qc-4,firstAttempt}' is not null
order by s.module_version, s.received_at;


-- 8. The real finish time. Before 2.3.2, pressing Finish again after the survey moved
--    record.completedAt; the first 'finish' event is when the mission actually ended.
select e.participant_id,
       min(e.client_time)                               as first_finish,
       count(*)                                         as finish_presses
from public.events_clean e
where e.type = 'finish'
group by e.participant_id
order by first_finish;
