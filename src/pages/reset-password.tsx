import React, { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
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
  const { signIn } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

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
      try {
        const { data, error } = await supabase.auth.updateUser({ password: values.password });
        
        if (error) throw error;

        toast({
          title: "Success",
          description: "Your password has been reset successfully.",
        });

        if (data.user?.email) {
          await signIn(data.user.email, values.password);
        }

        router.push('/dashboard');
      } catch (error: any) {
        console.error('Error resetting password:', error);
        toast({
            variant: "destructive",
            title: "Error resetting password",
            description: error.message || "An unexpected error occurred. The password reset link may have expired.",
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
            <CardTitle className="text-center">Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={formik.handleSubmit}>
              <div className="flex flex-col gap-6">
                <p className="text-center text-sm text-muted-foreground">
                  Enter your new password below.
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
                  disabled={isLoading || !formik.isValid}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
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

export default ResetPasswordPage;