import { useFormik } from 'formik';
import React, { useContext, useState } from 'react';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const LoginPage = () => {
  const router = useRouter();
  const { initializing, signIn } = useContext(AuthContext);
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { email, password } = formik.values;
      await signIn(email, password);
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.includes('Invalid login credentials')) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: "Invalid email or password. Please try again.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  const validationSchema = Yup.object().shape({
    email: Yup.string().required("Email is required").email("Email is invalid"),
    password: Yup.string()
      .required("Password is required")
      .min(4, "Must be at least 4 characters")
      .max(40, "Must not exceed 40 characters"),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: handleLogin,
  });

  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin(e);
    }
  };

  return (
    <div className="flex h-screen justify-center items-center bg-background">
      <div className="flex flex-col gap-5 h-auto">
        <Card className="w-full md:w-[440px]" onKeyDown={handleKeyPress}>
          <CardHeader>
            <CardTitle className="text-center">Log in</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
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
                        className="py-6"
                      />
                      {formik.touched.email && formik.errors.email && (
                        <p className="text-destructive text-xs">{formik.errors.email}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPw ? 'text' : 'password'}
                          placeholder="Enter your password"
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
                          onClick={() => setShowPw(!showPw)}
                        >
                          {showPw
                            ? <FaEye className="text-muted-foreground" />
                            : <FaEyeSlash className="text-muted-foreground" />
                          }
                        </Button>
                      </div>
                      {formik.touched.password && formik.errors.password && (
                        <p className="text-destructive text-xs">{formik.errors.password}</p>
                      )}
                    </div>

                    <div className="flex justify-between mt-2 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span>Need an account?</span>
                        <Button
                          type="button"
                          variant="link"
                          className="p-0"
                          onClick={() => router.push('/signup')}
                        >
                          Sign up
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="link"
                        className="p-0"
                        onClick={() => router.push('/forgot-password')}
                      >
                        Forgot password?
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || initializing || !formik.values.email || !formik.values.password || !formik.isValid}
                  onClick={handleLogin}
                >
                  Continue
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;