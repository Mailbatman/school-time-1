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
import PasswordStrength from '@/components/PasswordStrength';

const SignUpPage = () => {
  const router = useRouter();
  const { initializing, signUp } = useContext(AuthContext);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSignUp = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { email, password, firstName, lastName } = formik.values;
      await signUp(email, password, firstName, lastName);
      router.push('/login');
    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.includes('User already registered')) {
        toast({
          variant: "destructive",
          title: "Sign up failed",
          description: "An account with this email already exists.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Sign up failed",
          description: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  const validationSchema = Yup.object().shape({
    email: Yup.string().required("Email is required").email("Email is invalid"),
    firstName: Yup.string().required("First name is required"),
    lastName: Yup.string().required("Last name is required"),
    password: Yup.string()
      .required("Password is required")
      .min(8, "Must be at least 8 characters")
      .matches(/[a-zA-Z]/, "Must contain at least one letter")
      .matches(/[0-9]/, "Must contain at least one number")
      .max(40, "Must not exceed 40 characters"),
    confirmPassword: Yup.string()
      .required("Confirmation is required")
      .oneOf([Yup.ref('password')], "Passwords must match"),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    },
    validationSchema,
    onSubmit: handleSignUp,
  });

  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSignUp(e);
    }
  };

  return (
    <div className="flex h-screen bg-background justify-center items-center">
      <div className="flex flex-col gap-5 h-auto">
        <Card className="w-full md:w-[440px]" onKeyDown={handleKeyPress}>
          <CardHeader>
            <CardTitle className="text-center">Sign up</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Enter your first name"
                      value={formik.values.firstName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="py-6"
                    />
                    {formik.touched.firstName && formik.errors.firstName && (
                      <p className="text-destructive text-xs">{formik.errors.firstName}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Enter your last name"
                      value={formik.values.lastName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="py-6"
                    />
                    {formik.touched.lastName && formik.errors.lastName && (
                      <p className="text-destructive text-xs">{formik.errors.lastName}</p>
                    )}
                  </div>

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
                    <PasswordStrength password={formik.values.password} />
                    {formik.touched.password && formik.errors.password && (
                      <p className="text-destructive text-xs">{formik.errors.password}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPw ? 'text' : 'password'}
                        placeholder="Confirm your password"
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
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                      >
                        {showConfirmPw
                          ? <FaEye className="text-muted-foreground" />
                          : <FaEyeSlash className="text-muted-foreground" />
                        }
                      </Button>
                    </div>
                    {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                      <p className="text-destructive text-xs">{formik.errors.confirmPassword}</p>
                    )}
                  </div>

                  <div className="flex justify-end mt-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span>Already have an account?</span>
                      <Button
                        type="button"
                        variant="link"
                        className="p-0"
                        onClick={() => router.push('/login')}
                      >
                        Log in
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || initializing || !formik.isValid}
                  onClick={handleSignUp}
                >
                  Sign Up
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUpPage;