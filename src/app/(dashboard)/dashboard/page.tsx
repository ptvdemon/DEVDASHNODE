
import { CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { getDashboardStats, getProjects } from "@/lib/azure-devops"
import { PatPrompt } from "@/components/pat-prompt"
import { Alert, AlertDescription } from "@/components/ui/alert"
import DashboardClient from "./client-page"
import { cookies } from "next/headers"

export default async function DashboardPage() {
  let stats;
  let projects = [];
  let error: string | null = null;
  const tempPat = cookies().get('temp_pat')?.value;

  try {
    // Fetch all necessary data in parallel for the dashboard
    const [statsData, projectsData] = await Promise.all([
      getDashboardStats(tempPat),
      getProjects(tempPat),
    ]);
    stats = statsData;
    projects = projectsData;
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

  if (!stats) {
    // This can happen if the API returns no data but no error
    return <div>Loading stats or no data available...</div>;
  }

  return <DashboardClient stats={stats} projects={projects} />
}
