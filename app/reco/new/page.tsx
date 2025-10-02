
+5
-9
Lines changed: 5 additions & 9 deletions
Original file line number	Diff line number	Diff line change
@@ -12,7 +12,7 @@ type Employee = {
  first_name: string | null
  last_name: string | null
  email: string
  is_active: boolean | null
  is_active?: boolean | null
}

export default function NewRecoPage() {
@@ -75,14 +75,11 @@ export default function NewRecoPage() {
      if (!meRow) { setError('Aucune fiche employé liée à ton compte.'); setLoading(false); return }
      setMe(meRow)

      // 3) Liste des receveurs (employés actifs)
      const { data: list, error: listErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, is_active')
        .eq('is_active', true)
        .order('first_name', { ascending: true })
      // 3) Liste des receveurs (annuaire sécurisé via RPC)
      const { data: list, error: listErr } = await supabase.rpc('list_active_employees')
      if (listErr) { setError(listErr.message); setLoading(false); return }
      setEmployees(list ?? [])
      setEmployees((list ?? []) as Employee[])
      setLoading(false)
    }
    run()
@@ -101,7 +98,6 @@ export default function NewRecoPage() {

    const prescriptorName = [me.first_name ?? '', me.last_name ?? ''].join(' ').trim()

    // payload défini DANS la fonction (important)
    const payload = {
      prescriptor_id: me.id,
      prescriptor_name: prescriptorName,
