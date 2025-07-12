import React from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

const UnauthorizedPage = () => {
  const router = useRouter();

  return (
    <div className="flex h-screen bg-background justify-center items-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You do not have the necessary permissions to view this page.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => router.back()}>Go Back</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UnauthorizedPage;