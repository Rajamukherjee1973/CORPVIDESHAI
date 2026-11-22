GRANT SELECT ON public.bank_forward_sheets TO anon;
CREATE POLICY "Visitors read bank rate sheets" ON public.bank_forward_sheets
  FOR SELECT TO anon USING (true);