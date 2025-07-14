import React, { useState, useContext, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { AuthContext } from '@/contexts/AuthContext';
import { createClient } from '@/util/supabase/component';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const ResetPasswordPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError("No password reset token found. Please request a new password reset link.");
    }
  }, [searchParams]);

  const validationSchema = Yup.object().shape({
    password: Yup.string()
      .required("Password is required")
      .min(8, "Must be at least 8 characters")
      .matches(/[a-zA-Z]/, "Must contain at least one letter")
      .matches(/[0-9]/, "Must contain at least one number"),
    confirmPassword: Yup.string()
      .required("Confirmation is required")
      .oneOf([Yup.ref('password')], "Passwords must match"),
  });

  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      setError(null);
      try {
        const code = searchParams.get('code');
        if (!code) {
          throw new Error("No password reset token found.");
        }

        // Exchange code for a session
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          throw new Error("Invalid or expired token. Please request a new password reset link.");
        }

        // The user is now signed in, so we can update their password
        const { data, error: updateError } = await supabase.auth.updateUser({ password: values.password });
        
        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: "Your password has been set successfully.",
        });

        if (data.user?.email) {
          // The user is already signed in from the exchange, but we can re-authenticate to be safe
          await signIn(data.user.email, values.password);
        }

        router.push('/dashboard');
      } catch (error: any) {
        console.error('Error resetting password:', error);
        setError(error.message || "An unexpected error occurred.");
        toast({
            variant: "destructive",
            title: "Error setting password",
            description: error.message || "The password reset link may be invalid or have expired.",
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
            <CardTitle className="text-center">Set Your Password</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-center text-destructive">
                <p>{error}</p>
                <Button
                  variant="link"
                  className="mt-4"
                  onClick={() => router.push('/forgot-password')}
                >
                  Request a new link
                </Button>
              </div>
            ) : (
              <form onSubmit={formik.handleSubmit}>
                <div className="flex flex-col gap-6">
                  <p className="text-center text-sm text-muted-foreground">
                    Create a secure password to access your account.
                  </p>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your new password"
                          value={formik.values.password}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          className="py-6"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword
                            ? <FaEye className="text-muted-foreground" />
                            : <FaEyeSlash className="text-muted-foreground" />
                          }
                        </Button>
                      </div>
                      {formik.touched.password && formik.errors.password && (
                        <p className="text-destructive text-xs">{formik.errors.password}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm your new password"
                          value={formik.values.confirmPassword}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          className="py-6"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword
                            ? <FaEye className="text-muted-foreground" />
                            : <FaEyeSlash className="text-muted-foreground" />
                          }
                        </Button>
                      </div>
                      {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                        <p className="text-destructive text-xs">{formik.errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !formik.isValid || !!error}
                  >
                    {isLoading ? 'Setting password...' : 'Set Password'}
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;