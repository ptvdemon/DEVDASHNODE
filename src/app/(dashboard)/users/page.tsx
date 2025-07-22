import { getProjects, getUsers } from "@/lib/azure-devops"
import { PatPrompt } from "@/components/pat-prompt"
import { User, Project } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import UsersClientPage from "./client-page"

export default async function UsersPage() {
  let users: User[] = [];
  let projects: Project[] = [];
  let error: string | null = null;

  try {
    // Fetch users first, then projects, to reduce concurrent requests.
    users = await getUsers();
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
        <CardTitle>Error Fetching Data</CardTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return <UsersClientPage users={users} projects={projects} />
}
