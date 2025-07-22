'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setTemporaryPat } from '@/lib/actions/pat';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Terminal } from 'lucide-react';

export function PatPrompt({ error }: { error: string }) {
  const [pat, setPat] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await setTemporaryPat(pat);
    router.refresh();
  };

  return (
    <div className="flex items-center justify-center h-full p-8">
        <AlertDialog open={true}>
            <AlertDialogContent>
                <form onSubmit={handleSubmit}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Azure DevOps PAT Required</AlertDialogTitle>
                        <AlertDialogDescription>
                            {error} Please enter a Personal Access Token to continue.
                            This will be stored temporarily and securely in a cookie for this session.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 my-4">
                        <div className="space-y-2">
                            <Label htmlFor="pat">Personal Access Token (PAT)</Label>
                            <Input
                                id="pat"
                                type="password"
                                value={pat}
                                onChange={(e) => setPat(e.target.value)}
                                placeholder="Enter your PAT"
                                required
                            />
                        </div>
                        <Alert>
                            <Terminal className="h-4 w-4" />
                            <AlertTitle>Where to find your PAT?</AlertTitle>
                            <AlertDescription>
                                You can create a Personal Access Token in your Azure DevOps user settings under "Personal access tokens".
                            </AlertDescription>
                        </Alert>
                    </div>
                    <AlertDialogFooter>
                    <Button type="submit" disabled={loading || !pat}>
                        {loading ? 'Saving...' : 'Save and Retry'}
                    </Button>
                    </AlertDialogFooter>
                </form>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
