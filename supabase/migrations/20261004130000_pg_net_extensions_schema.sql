-- Security review SR-005: pg_net was installed in schema public (Security Advisor: extension_in_public).
-- pg_net cannot be relocated with ALTER EXTENSION ... SET SCHEMA, so it is recreated in `extensions`.
-- The cron job bank-refresh calls net.http_post(...); that function lives in the `net` schema,
-- which the new installation creates again, so the job keeps working unchanged.
-- The only in-flight state lost is net._http_response (a short log of past responses).

drop extension if exists pg_net;
create extension pg_net with schema extensions;
