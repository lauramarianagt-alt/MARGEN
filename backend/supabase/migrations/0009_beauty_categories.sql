-- Editorial sections requested for MARGEN. Existing categories are preserved.
insert into public.categories (name, slug, description) values
  ('Beauty', 'beauty', 'Beauty as culture, identity and personal expression.'),
  ('Cosmetics', 'cosmetics', 'Cosmetics through design, colour and visual culture.')
on conflict (slug) do nothing;
