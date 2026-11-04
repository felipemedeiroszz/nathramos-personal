-- Commit enum values before the functions in migration 000045 use them.
alter type public.payment_provider_t add value if not exists 'manual';
alter type public.payment_method_t add value if not exists 'cash';
