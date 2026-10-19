-- =============================================================================
-- InfoAI.LK — Seed data
--
-- Seeds the four launch categories, flagship NIC (Identity Services) content,
-- and suggested-question chips.
--
-- IMPORTANT: seeded procedures are inserted directly (bypassing the app's
-- publish flow), so they have NO embeddings yet. After running this seed, embed
-- them by calling POST /api/admin/reindex (officer session) or by re-saving
-- each procedure in the admin UI. Only chunked+embedded procedures are
-- retrievable by the RAG pipeline.
--
-- Content below is illustrative launch content. Officers MUST verify fees,
-- timelines and steps against current Department for Registration of Persons
-- (DRP) circulars before relying on it, and set last_verified_date accordingly.
-- =============================================================================

-- --- categories ------------------------------------------------------------
insert into categories (name, slug, display_order) values
  ('Identity Services (NIC)',            'identity-services-nic',   1),
  ('Civil Registry Services',            'civil-registry',          2),
  ('Traffic & Accident Procedures',      'traffic-accident',        3),
  ('Property & Land-Related Services',   'property-land',           4)
on conflict (slug) do nothing;

-- --- flagship NIC procedures ----------------------------------------------
insert into procedures
  (category_id, title, body, source_department, fees, timeline,
   authoring_language, last_verified_date, status)
select c.id, v.title, v.body, v.source_department, v.fees, v.timeline,
       'en'::language_code, date '2026-01-15', 'published'::procedure_status
from categories c
join (values
  (
    'Applying for a new National Identity Card (first-time registration)',
    E'Every Sri Lankan citizen who has reached 15 years of age is entitled and required to obtain a National Identity Card (NIC).\n\nWho can apply:\n- Citizens aged 15 and above who have never held an NIC.\n\nDocuments required:\n1. Duly completed application form D.R.P/1/07 (obtained from the Grama Niladhari or downloaded from the DRP website).\n2. Birth certificate (original plus a photocopy).\n3. Two colour photographs taken to DRP specifications, certified on the reverse by the Grama Niladhari.\n4. A certificate of residence issued by the Grama Niladhari of the applicant''s division.\n\nHow to apply:\n1. Obtain and complete form D.R.P/1/07.\n2. Have the form and photographs certified by your Grama Niladhari.\n3. The Grama Niladhari forwards the application to the Divisional Secretariat, which forwards it to the Department for Registration of Persons.\n4. For urgent needs, apply directly at the DRP Head Office (Battaramulla) or a regional office under the One Day Service.\n\nThe NIC is issued free of charge for first-time normal-service applicants.',
    'Department for Registration of Persons (DRP)',
    'Free (normal service). One Day Service: Rs. 500.',
    'Normal service: 4–6 weeks. One Day Service: same working day.'
  ),
  (
    'Replacing a lost National Identity Card',
    E'If your NIC is lost, you can apply for a replacement.\n\nDocuments required:\n1. Duly completed application form D.R.P/1/07, marked as a replacement for a lost card.\n2. A complaint entry (police report) recorded at the nearest police station confirming the loss of the NIC.\n3. Birth certificate (original plus photocopy).\n4. Two certified colour photographs to DRP specifications.\n5. Any available record of the lost NIC number.\n\nHow to apply:\n1. Report the loss at your nearest police station and obtain the complaint reference.\n2. Complete form D.R.P/1/07 and have it certified by your Grama Niladhari.\n3. Submit through the Divisional Secretariat, or apply directly at a DRP office under the One Day Service for faster issue.\n\nA replacement fee applies. Keep the police complaint reference, as it is required to process the replacement.',
    'Department for Registration of Persons (DRP)',
    'Replacement fee: Rs. 500. One Day Service: additional Rs. 500.',
    'Normal service: 3–4 weeks. One Day Service: same working day.'
  ),
  (
    'Replacing a damaged National Identity Card',
    E'If your NIC is damaged, mutilated or no longer machine-readable, apply for a replacement.\n\nDocuments required:\n1. Duly completed application form D.R.P/1/07, marked as a replacement for a damaged card.\n2. The damaged NIC itself, which must be surrendered with the application.\n3. Birth certificate (original plus photocopy).\n4. Two certified colour photographs to DRP specifications.\n\nHow to apply:\n1. Complete form D.R.P/1/07 and have it certified by your Grama Niladhari.\n2. Attach the damaged card and submit through the Divisional Secretariat, or apply directly at a DRP office under the One Day Service.\n\nBecause the old card is surrendered, a police report is not required (unlike a lost-card replacement).',
    'Department for Registration of Persons (DRP)',
    'Replacement fee: Rs. 500. One Day Service: additional Rs. 500.',
    'Normal service: 3–4 weeks. One Day Service: same working day.'
  ),
  (
    'Correcting details on a National Identity Card',
    E'You can apply to correct errors on your NIC — for example the name, date of birth, address or other personal particulars.\n\nDocuments required:\n1. Duly completed application form D.R.P/1/07, indicating the correction requested.\n2. The current NIC (original plus photocopy).\n3. Documentary proof supporting the correction, such as:\n   - Birth certificate for name or date-of-birth corrections.\n   - Marriage certificate for a change of name after marriage.\n   - A deed poll / gazette notification for a legal change of name.\n4. Two certified colour photographs to DRP specifications.\n\nHow to apply:\n1. Complete form D.R.P/1/07 and attach the supporting documents that prove the correct details.\n2. Have the form certified by your Grama Niladhari.\n3. Submit through the Divisional Secretariat, or apply directly at a DRP office under the One Day Service.\n\nThe correction is made only where documentary evidence supports the requested change.',
    'Department for Registration of Persons (DRP)',
    'Correction/replacement fee: Rs. 500. One Day Service: additional Rs. 500.',
    'Normal service: 3–4 weeks. One Day Service: same working day.'
  )
) as v(title, body, source_department, fees, timeline) on true
where c.slug = 'identity-services-nic'
on conflict do nothing;

-- --- suggested-question chips ---------------------------------------------
insert into suggested_questions (category_id, question_text, display_order)
select c.id, q.question_text, q.display_order
from categories c
join (values
  ('How do I apply for a new NIC?', 1),
  ('I lost my NIC — what should I do?', 2),
  ('How do I correct my name on my NIC?', 3),
  ('What documents do I need to replace a damaged NIC?', 4)
) as q(question_text, display_order) on true
where c.slug = 'identity-services-nic'
on conflict do nothing;
