begin;

-- Exam deletion must go through the server action, which updates the exam
-- record before removing its file. Keep owner access for other buckets.
create policy exam_no_direct_delete
  on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'exam-files');

commit;
