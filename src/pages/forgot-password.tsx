import React, { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { AuthContext } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const ForgotPasswordPage = () => {
  const router = useRouter();
  const { sendPasswordResetOtp } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const validationSchema = Yup.object().shape({
    email: Yup.string().required("Email is required").email("Email is invalid"),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        await sendPasswordResetOtp(values.email);
        toast({
          title: "Check your email",
          description: "If an account with that email exists, we've sent an OTP to reset your password.",
          variant: "default",
        });
        router.push(`/verify-otp?email=${encodeURIComponent(values.email)}`);
      } catch (error: any) {
        console.error(error);
        toast({
          title: "Error",
          description: error.message || 'An unexpected error occurred. Please try again.',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="flex h-screen bg-background justify-center items-center">
      <div className="flex flex-col gap-5 h-auto">
        <Card className="w-full md:w-[440px]">
          <CardHeader>
            <CardTitle className="text-center">Forgot Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={formik.handleSubmit}>
              <div className="flex flex-col gap-6">
                <p className="text-center text-sm text-muted-foreground">
                  Enter your email address and we'll send you an OTP to reset your password.
                </p>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.email && formik.errors.email && (
                    <p className="text-destructive text-xs">{formik.errors.email}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !formik.values.email || !formik.isValid}
                >
                  {isLoading ? 'Sending OTP...' : 'Send OTP'}
                </Button>

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0"
                    onClick={() => router.push('/login')}
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;