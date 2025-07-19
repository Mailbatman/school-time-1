import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createClient } from '@/util/supabase/component';
import PasswordStrength from '@/components/PasswordStrength';

const VerifyOtpPage = () => {
  const router = useRouter();
  const { email } = router.query;
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const validationSchema = Yup.object().shape({
    otp: Yup.string().required("OTP is required").length(6, "OTP must be 6 digits"),
    password: Yup.string().required("Password is required").min(8, "Password must be at least 8 characters"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('Confirm Password is required'),
  });

  const formik = useFormik({
    initialValues: {
      otp: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        if (typeof email !== 'string') {
          throw new Error("Invalid email address.");
        }

        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: values.otp,
          type: 'recovery',
        });

        if (verifyError) {
          throw verifyError;
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: values.password,
        });

        if (updateError) {
          throw updateError;
        }

        toast({
          title: "Success",
          description: "Your password has been reset successfully. Please login.",
          variant: "default",
        });
        router.push('/login');
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
      <Card className="w-full md:w-[440px]">
        <CardHeader>
          <CardTitle className="text-center">Verify OTP & Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={formik.handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="otp">OTP</Label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  placeholder="Enter the 6-digit OTP"
                  value={formik.values.otp}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.otp && formik.errors.otp && (
                  <p className="text-destructive text-xs">{formik.errors.otp}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter new password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <PasswordStrength password={formik.values.password} />
                {formik.touched.password && formik.errors.password && (
                  <p className="text-destructive text-xs">{formik.errors.password}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                  <p className="text-destructive text-xs">{formik.errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !formik.isValid || !router.isReady}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyOtpPage;
