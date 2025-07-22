import { LoginForm } from "@/components/auth/login-form"
import { Package } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
            <div className="bg-primary text-primary-foreground rounded-full p-3 mb-4">
                <Package className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold">RGI DevOps Central</h1>
            <p className="text-muted-foreground">Enter your credentials to access the dashboard</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}