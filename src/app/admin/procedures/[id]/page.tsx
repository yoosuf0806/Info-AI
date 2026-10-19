import ProcedureEditor from "@/components/admin/ProcedureEditor";

export default function EditProcedurePage({
  params,
}: {
  params: { id: string };
}) {
  return <ProcedureEditor procedureId={params.id} />;
}
