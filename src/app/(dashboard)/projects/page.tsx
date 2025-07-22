import { getProjects } from "@/lib/azure-devops"
import { PatPrompt } from "@/components/pat-prompt"
import { Project } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import ProjectsClientPage from "./client-page"

export default async function ProjectsPage() {
  let projects: Project[] = [];
  let error: string | null = null;

  try {
    projects = await getProjects();
  } catch (e: any) {
    if (e.name === 'PatError') {
      return <PatPrompt error={e.message} />;
    }
    error = e.message;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <CardTitle>Error Fetching Projects</CardTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return <ProjectsClientPage projects={projects} />
}
