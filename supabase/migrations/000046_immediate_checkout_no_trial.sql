begin;
-- New purchases require payment. Historical subscriptions are not changed or charged here.
update public.plans set trial_days=0 where trial_days<>0;
alter table public.plans add constraint plans_no_free_trial check (trial_days=0);
update public.platform_settings set value_num=0 where key='trial_days_default';
alter table public.platform_settings add constraint platform_settings_no_free_trial
 check (key<>'trial_days_default' or coalesce(value_num,0)=0);
commit;
