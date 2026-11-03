-- Run in the EXISTING CloudBase PostgreSQL SQL editor. No TCP endpoint or new database.
-- Safe to re-run: existing shares, frequencies, image IDs and limits are retained.
BEGIN;
DO $role_check$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
  RAISE EXCEPTION 'flow_rpc_requires_existing_cloudbase_service_role';
 END IF;
END $role_check$;
CREATE TABLE IF NOT EXISTS public.flow_schema_versions(version integer PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.flow_wordcloud_submissions(id uuid PRIMARY KEY,body_hash char(64) NOT NULL,created_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS public.flow_wordcloud_words(word text PRIMARY KEY CHECK(char_length(word) BETWEEN 2 AND 4),frequency bigint NOT NULL CHECK(frequency>0),updated_at bigint NOT NULL);
CREATE INDEX IF NOT EXISTS flow_words_frequency ON public.flow_wordcloud_words(frequency DESC,word);
CREATE INDEX IF NOT EXISTS flow_words_recent ON public.flow_wordcloud_words(updated_at DESC);
CREATE TABLE IF NOT EXISTS public.flow_api_limits(bucket text PRIMARY KEY,n integer NOT NULL CHECK(n>0),expires_at bigint NOT NULL);
CREATE INDEX IF NOT EXISTS flow_limits_expiry ON public.flow_api_limits(expires_at);
CREATE TABLE IF NOT EXISTS public.flow_image_jobs(id uuid PRIMARY KEY,body_hash char(64) NOT NULL,status text NOT NULL CHECK(status IN ('pending','complete','failed')),image_url text,expires_at bigint NOT NULL);

-- PostgREST executes each function call in one transaction. An exception rolls back
-- all writes, including limits reserved before a failed operation. No external AI calls here.
CREATE OR REPLACE FUNCTION public.flow_backend_rpc(p_operation text,p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
SET lock_timeout = '3s'
AS $flow$
DECLARE
 v_now bigint := floor(extract(epoch FROM clock_timestamp())*1000)::bigint;
 v_item jsonb; v_bucket text; v_max integer; v_expires bigint; v_count integer;
 v_id uuid; v_hash text; v_word text; v_identity text; v_replayed boolean;
 v_job public.flow_image_jobs%ROWTYPE; v_previous text; v_result jsonb;
BEGIN
 IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR octet_length(p_payload::text)>16000 THEN
  RAISE EXCEPTION 'invalid_input';
 END IF;
 IF p_operation='quota' THEN
  IF jsonb_typeof(p_payload->'buckets') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'buckets') NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'buckets') ORDER BY value->>0 LOOP
   IF jsonb_typeof(v_item) IS DISTINCT FROM 'array' OR jsonb_array_length(v_item)<>3 THEN RAISE EXCEPTION 'invalid_input'; END IF;
   v_bucket:=v_item->>0;v_max:=(v_item->>1)::integer;v_expires:=(v_item->>2)::bigint;
   IF v_bucket IS NULL OR length(v_bucket) NOT BETWEEN 1 AND 250 OR v_max IS NULL OR v_max NOT BETWEEN 1 AND 1000 OR v_expires IS NULL OR v_expires<v_now-60000 OR v_expires>v_now+691200000 THEN RAISE EXCEPTION 'invalid_input'; END IF;
   v_count:=NULL;
   INSERT INTO public.flow_api_limits(bucket,n,expires_at) VALUES(v_bucket,1,v_expires)
   ON CONFLICT(bucket) DO UPDATE SET n=flow_api_limits.n+1 WHERE flow_api_limits.n<v_max RETURNING n INTO v_count;
   IF v_count IS NULL THEN RAISE EXCEPTION 'quota_exceeded'; END IF;
  END LOOP;
  RETURN jsonb_build_object('ok',true);
 ELSIF p_operation='consume_ticket' THEN
  v_hash:=p_payload->>'ticket_hash';v_expires:=(p_payload->>'expires')::bigint;
  IF v_hash IS NULL OR v_hash!~'^[0-9a-f]{64}$' OR v_expires IS NULL OR v_expires<v_now OR v_expires>v_now+660000 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  INSERT INTO public.flow_api_limits(bucket,n,expires_at) VALUES('captcha:'||v_hash,1,v_expires) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>1 THEN RAISE EXCEPTION 'verification_replayed'; END IF;
  RETURN jsonb_build_object('ok',true);
 ELSIF p_operation IN ('image_start','image_finish','shared','share') THEN
  v_id:=(p_payload->>'id')::uuid;
  IF v_id IS NULL THEN RAISE EXCEPTION 'invalid_input'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_operation||':'||v_id::text,0));
  IF p_operation='image_finish' THEN
   IF p_payload->>'url' IS NOT NULL AND ((p_payload->>'url')!~'^https://' OR length(p_payload->>'url')>4096) THEN RAISE EXCEPTION 'invalid_input'; END IF;
   UPDATE public.flow_image_jobs SET status=CASE WHEN p_payload->>'url' IS NULL THEN 'failed' ELSE 'complete' END,image_url=p_payload->>'url' WHERE id=v_id;
   GET DIAGNOSTICS v_count=ROW_COUNT;
   IF v_count<>1 THEN RAISE EXCEPTION 'image_job_missing'; END IF;
   RETURN jsonb_build_object('ok',true);
  END IF;
  v_hash:=p_payload->>'hash';
  IF v_hash IS NULL OR v_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid_input'; END IF;
  IF p_operation='image_start' THEN
   SELECT * INTO v_job FROM public.flow_image_jobs WHERE id=v_id;
   IF FOUND THEN
    IF v_job.body_hash<>v_hash THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
    IF v_job.status='complete' AND v_job.expires_at>v_now THEN RETURN jsonb_build_object('url',v_job.image_url); END IF;
    RAISE EXCEPTION 'image_request_already_started';
   END IF;
   v_max:=(p_payload->>'max')::integer;
   IF v_max IS NULL OR v_max NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'invalid_input'; END IF;
   PERFORM public.flow_backend_rpc('quota',jsonb_build_object('buckets',jsonb_build_array(jsonb_build_array('image-global:'||(v_now/86400000)::text,v_max,v_now+86400000))));
   INSERT INTO public.flow_image_jobs(id,body_hash,status,expires_at) VALUES(v_id,v_hash,'pending',v_now+3600000);
   RETURN jsonb_build_object('url',NULL);
  END IF;
  SELECT body_hash INTO v_previous FROM public.flow_wordcloud_submissions WHERE id=v_id;
  v_replayed:=FOUND;
  IF v_replayed AND v_previous<>v_hash THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  IF p_operation='shared' THEN RETURN jsonb_build_object('shared',v_replayed); END IF;
  IF p_payload->'consent' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'explicit_consent_required'; END IF;
  IF v_replayed THEN RETURN jsonb_build_object('replayed',true); END IF;
  IF jsonb_typeof(p_payload->'words') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'words') NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  v_identity:=p_payload->>'identity';
  IF v_identity IS NULL OR v_identity!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid_input'; END IF;
  PERFORM public.flow_backend_rpc('quota',jsonb_build_object('buckets',jsonb_build_array(jsonb_build_array('share:'||v_identity||':'||(v_now/86400000)::text,5,v_now+86400000))));
  INSERT INTO public.flow_wordcloud_submissions(id,body_hash,created_at) VALUES(v_id,v_hash,v_now);
  FOR v_word IN SELECT DISTINCT value FROM jsonb_array_elements_text(p_payload->'words') ORDER BY value LOOP
   IF v_word IS NULL OR char_length(v_word) NOT BETWEEN 2 AND 4 OR v_word~'[[:space:][:digit:][:punct:][:cntrl:]]' THEN RAISE EXCEPTION 'invalid_input'; END IF;
   INSERT INTO public.flow_wordcloud_words(word,frequency,updated_at) VALUES(v_word,1,v_now)
   ON CONFLICT(word) DO UPDATE SET frequency=flow_wordcloud_words.frequency+1,updated_at=EXCLUDED.updated_at;
  END LOOP;
  RETURN jsonb_build_object('replayed',false);
 ELSIF p_operation='cloud' THEN
  WITH top AS (SELECT word,frequency FROM public.flow_wordcloud_words ORDER BY frequency DESC,word LIMIT 12),
   rare AS (SELECT word,frequency FROM public.flow_wordcloud_words WHERE word NOT IN(SELECT word FROM top) ORDER BY frequency ASC,updated_at DESC,word LIMIT 6)
  SELECT coalesce(jsonb_agg(jsonb_build_object('word',word,'frequency',frequency)),'[]'::jsonb) INTO v_result FROM (SELECT * FROM top UNION ALL SELECT * FROM rare) words;
  RETURN jsonb_build_object('words',v_result);
 ELSIF p_operation='ready' THEN
  RETURN jsonb_build_object('ready',EXISTS(SELECT 1 FROM public.flow_schema_versions WHERE version=2),'schemaVersion',2);
 END IF;
 RAISE EXCEPTION 'invalid_operation';
END $flow$;

-- Only the backend administrator/service credential may execute the RPC.
-- No public read/write policies or front-end database access are introduced.
ALTER TABLE public.flow_schema_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_wordcloud_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_wordcloud_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_api_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_image_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.flow_schema_versions,public.flow_wordcloud_submissions,public.flow_wordcloud_words,public.flow_api_limits,public.flow_image_jobs FROM PUBLIC;
REVOKE ALL ON FUNCTION public.flow_backend_rpc(text,jsonb) FROM PUBLIC;
DO $permissions$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN('anon','authenticated') LOOP
  EXECUTE format('REVOKE ALL ON TABLE public.flow_schema_versions,public.flow_wordcloud_submissions,public.flow_wordcloud_words,public.flow_api_limits,public.flow_image_jobs FROM %I',r);
  EXECUTE format('REVOKE ALL ON FUNCTION public.flow_backend_rpc(text,jsonb) FROM %I',r);
 END LOOP;
END $permissions$;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.flow_backend_rpc(text,jsonb) TO service_role;
INSERT INTO public.flow_schema_versions(version) VALUES(1),(2) ON CONFLICT(version) DO NOTHING;
NOTIFY pgrst,'reload schema';
COMMIT;
