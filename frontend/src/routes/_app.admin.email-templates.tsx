import { createFileRoute } from "@tanstack/react-router";
import { EmailTemplatePreviewer } from "@/components/admin/EmailTemplatePreviewer";

export const Route = createFileRoute("/_app/admin/email-templates")({
  component: AdminEmailTemplatesPage,
});

function AdminEmailTemplatesPage() {
  return (
    <div className="w-full">
      <EmailTemplatePreviewer />
    </div>
  );
}
